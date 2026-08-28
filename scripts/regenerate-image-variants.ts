import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { ImageVariantService } from '../src/upload/image-variant.service';
import { toUploadsFilename } from '../src/upload/uploads-path.util';

/**
 * Пересоздаёт файлы-варианты (`streamer.API#78`) для ВСЕХ изображений,
 * известных базе (галерея новости, своя обложка, аватар профиля) — из
 * оригинала, который на диске сохраняется всегда. Нужен, когда меняется
 * `IMAGE_VARIANT_WIDTHS_PX`: список вариантов не хранится в БД и не
 * пересчитывается сам, поэтому уже загруженные до правки изображения без
 * этого запуска остались бы со старым набором ширин.
 *
 * Идемпотентен для набора ширин, который был актуален на момент любого
 * прошлого запуска, — существующие файлы перезаписываются. НЕ убирает файлы
 * вариантов той ширины, которая была в списке раньше и с тех пор из него
 * убрана (список не хранится нигде, кроме кода, поэтому прошлые версии
 * неизвестны) — такие файлы придётся находить и убирать вручную, если это
 * когда-нибудь понадобится.
 *
 * Запуск: `npm run regenerate-image-variants`.
 */
async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });
  const imageVariantService = new ImageVariantService();

  const [images, covers, avatars] = await Promise.all([
    prisma.newsImage.findMany({ select: { url: true } }),
    prisma.news.findMany({
      where: { coverUrl: { not: null } },
      select: { coverUrl: true },
    }),
    prisma.profile.findMany({
      where: { avatarUrl: { not: null } },
      select: { avatarUrl: true },
    }),
  ]);

  const urls = new Set<string>([
    ...images.map((image) => image.url),
    ...covers.map((news) => news.coverUrl as string),
    ...avatars.map((profile) => profile.avatarUrl as string),
  ]);

  const filenames = [...urls]
    .map((url) => toUploadsFilename(url))
    .filter((filename): filename is string => filename !== null);

  console.log(
    `Найдено файлов для пересоздания вариантов: ${filenames.length}.`,
  );

  let done = 0;

  for (const filename of filenames) {
    await imageVariantService.generate(filename);
    done += 1;

    if (done % 20 === 0) {
      console.log(`...${done}/${filenames.length}`);
    }
  }

  console.log(`Готово: варианты пересозданы для ${done} файлов.`);

  await prisma.$disconnect();
}

main();
