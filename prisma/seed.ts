import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { BCRYPT_SALT_ROUNDS } from '../src/auth/constants/password.constant';
import { WEEKDAY_ORDER } from '../src/schedule/constants/weekday-order.constant';

async function seedSchedule(prisma: PrismaClient) {
  for (const weekday of WEEKDAY_ORDER) {
    await prisma.schedule.upsert({
      where: { weekday },
      update: {},
      create: { weekday, isOnline: false },
    });
  }

  console.log('Schedule: 7 дней недели проверены/созданы (дефолт — offline).');
}

async function seedPinnedGridLayouts(prisma: PrismaClient) {
  const viewports = ['SMALL', 'MIDDLE', 'LARGE'] as const;

  for (const viewport of viewports) {
    await prisma.pinnedGridLayout.upsert({
      where: { viewport },
      update: {},
      create: { viewport, columns: 3, rows: 12 },
    });
  }

  console.log(
    'PinnedGridLayout: 3 пресета вьюпорта проверены/созданы (3 колонки × 12 строк, без слотов).',
  );
}

async function seedAdmin(prisma: PrismaClient) {
  const login = process.env.SEED_ADMIN_LOGIN;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!login || !password) {
    console.error(
      'SEED_ADMIN_LOGIN и SEED_ADMIN_PASSWORD должны быть заданы в окружении для запуска сида.',
    );
    process.exit(1);
  }

  const existing = await prisma.authMethod.findUnique({
    where: { type_identifier: { type: 'LOCAL', identifier: login } },
  });

  if (existing) {
    console.log(
      `Администратор "${login}" уже существует, пропускаю (id: ${existing.userId}).`,
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const admin = await prisma.user.create({
    data: {
      role: 'ADMIN',
      profile: { create: { name: login } },
      settings: { create: {} },
      authMethods: {
        create: { type: 'LOCAL', identifier: login, passwordHash },
      },
    },
  });

  console.log(`Создан администратор "${login}" (id: ${admin.id}).`);
}

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  await seedSchedule(prisma);
  await seedPinnedGridLayouts(prisma);
  await seedAdmin(prisma);

  await prisma.$disconnect();
}

main();
