import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { NewsCoverType } from '../../generated/prisma/enums';
import { CreateNewsDto } from '../../news/dto/create-news.dto';
import { NewsCoverInputDto } from '../../news/dto/news-cover-input.dto';
import { NewsDto } from '../../news/dto/news.dto';
import { NewsImageDto } from '../../news/dto/news-image.dto';
import { UpdateNewsDto } from '../../news/dto/update-news.dto';
import { UpdateNewsImageFocalPointDto } from '../../news/dto/update-news-image-focal-point.dto';
import { toPrismaNewsCoverType } from '../../news/news-cover';
import { NEWS_INCLUDE, toNewsDto } from '../../news/news.mapper';
import {
  NewsImageDownloadService,
  ResolvedNewsImage,
} from '../../news/news-image-download.service';
import { PrismaService } from '../../prisma/prisma.service';
import { listImageVariants } from '../../upload/image-variant.util';
import { UploadedFileCleanupService } from '../../upload/uploaded-file-cleanup.service';

/** Поля обложки в том виде, в каком они ложатся в строку News. */
interface NewsCoverPersistence {
  coverType: NewsCoverType;
  coverUrl: string | null;
  coverFocalX: number | null;
  coverFocalY: number | null;
}

interface ResolvedNewsCoverInput {
  data: NewsCoverPersistence;
  /** Файлы, скачанные ради своей обложки — идут в тот же cleanup, что и картинки набора. */
  downloadedFilePaths: string[];
}

const NO_COVER: NewsCoverPersistence = {
  coverType: NewsCoverType.NONE,
  coverUrl: null,
  coverFocalX: null,
  coverFocalY: null,
};

@Injectable()
export class AdminNewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly newsImageDownloadService: NewsImageDownloadService,
    private readonly uploadedFileCleanupService: UploadedFileCleanupService,
  ) {}

  async create(dto: CreateNewsDto): Promise<NewsDto> {
    const { resolved, downloadedFilePaths } =
      await this.newsImageDownloadService.resolveImageUrls(dto.imageUrls);
    const downloaded = [...downloadedFilePaths];

    // Новость без явно выбранной обложки остаётся без неё: подставить первую
    // картинку значило бы стереть разницу между «осознанно без обложки» и
    // «ещё не выбрали» (ОБЛ-О-05).
    let cover = NO_COVER;

    try {
      const resolvedCover = await this.resolveCoverInput(
        dto.cover,
        dto.imageUrls,
        resolved.map((image) => image.url),
      );
      cover = resolvedCover.data;
      downloaded.push(...resolvedCover.downloadedFilePaths);
    } catch (error) {
      await this.newsImageDownloadService.cleanup(downloaded);
      throw error;
    }

    try {
      const news = await this.prisma.$transaction((tx) =>
        tx.news.create({
          data: {
            title: dto.title,
            description: dto.description,
            publishedAt: dto.publishedAt
              ? new Date(dto.publishedAt)
              : undefined,
            ...cover,
            images: {
              create: resolved.map((image, index) => ({
                url: image.url,
                order: index,
              })),
            },
            tags: {
              connect: dto.tagIds.map((id) => ({ id })),
            },
          },
          include: NEWS_INCLUDE,
        }),
      );

      return toNewsDto(news);
    } catch (error) {
      await this.newsImageDownloadService.cleanup(downloaded);
      throw this.mapMissingTagIdError(error);
    }
  }

  async update(id: string, dto: UpdateNewsDto): Promise<NewsDto> {
    const current = await this.findExisting(id);

    let resolvedImages: ResolvedNewsImage[] | undefined;
    const downloaded: string[] = [];

    if (dto.imageUrls) {
      const resolution = await this.newsImageDownloadService.resolveImageUrls(
        dto.imageUrls,
      );
      resolvedImages = resolution.resolved;
      downloaded.push(...resolution.downloadedFilePaths);
    }

    const finalImageUrls = resolvedImages
      ? resolvedImages.map((image) => image.url)
      : current.images.map((image) => image.url);

    let cover: Partial<NewsCoverPersistence> = {};

    try {
      if (dto.cover) {
        const resolvedCover = await this.resolveCoverInput(
          dto.cover,
          dto.imageUrls ?? [],
          finalImageUrls,
        );
        cover = resolvedCover.data;
        downloaded.push(...resolvedCover.downloadedFilePaths);
      } else {
        this.assertCoverSurvivesNewImageSet(current, finalImageUrls);
      }
    } catch (error) {
      await this.newsImageDownloadService.cleanup(downloaded);
      throw error;
    }

    let news;

    try {
      news = await this.prisma.$transaction(async (tx) => {
        if (resolvedImages) {
          await tx.newsImage.deleteMany({ where: { newsId: id } });
        }

        return tx.news.update({
          where: { id },
          data: {
            title: dto.title,
            description: dto.description,
            publishedAt: dto.publishedAt
              ? new Date(dto.publishedAt)
              : undefined,
            ...cover,
            images: resolvedImages
              ? { create: this.rebuildImages(resolvedImages, current.images) }
              : undefined,
            tags: dto.tagIds
              ? { set: dto.tagIds.map((tagId) => ({ id: tagId })) }
              : undefined,
          },
          include: NEWS_INCLUDE,
        });
      });
    } catch (error) {
      await this.newsImageDownloadService.cleanup(downloaded);
      throw this.mapMissingTagIdError(error);
    }

    // Только после успешной записи: пока транзакция могла откатиться, файл
    // старой обложки ещё нужен (ОБЛ-Б-03).
    if (dto.cover && current.coverUrl !== cover.coverUrl) {
      await this.deleteOwnCoverFile(current);
    }

    // То же для набора: старые записи NewsImage уже пересозданы транзакцией,
    // и только сейчас видно, какие адреса остались без единой ссылки.
    // deleteIfUnreferenced проверяет это по БД заново для каждого адреса, так
    // что переживший rebuildImages() адрес (тот же файл в новом наборе)
    // просто не пройдёт проверку и останется на диске (ФАЙ-Б-04).
    if (resolvedImages) {
      await Promise.all(
        current.images.map((image) =>
          this.uploadedFileCleanupService.deleteIfUnreferenced(image.url),
        ),
      );
    }

    return toNewsDto(news);
  }

  /**
   * Состав изображений по-прежнему заменяется целиком (удалить все и создать
   * заново — проще и безопаснее, чем diff по url), но **точка фокуса
   * переносится по адресу картинки** (`ИЗО-Б-02`, streamer.API#79).
   *
   * До этого фокус пропадал вместе со старой записью, и администратор
   * расставлял его заново после каждой правки состава — причём узнавал об
   * этом уже на публичной странице, где карточка вдруг начинала резать
   * картинку по центру.
   *
   * Фокус принадлежит изображению, а не закреплению (`ФОК-О-01`), поэтому
   * ключ переноса — адрес: та же картинка в новом наборе получает свой
   * прежний фокус, впервые добавленная — `null` (кадрируется по центру,
   * `ФОК-О-02`), выбывшая исчезает вместе со своим. Порядок при этом
   * берётся из НОВОГО набора и старым не консервируется (`ИЗО-О-01`).
   */
  private rebuildImages(
    resolvedImages: ResolvedNewsImage[],
    currentImages: {
      url: string;
      focalX: number | null;
      focalY: number | null;
    }[],
  ) {
    const focalByUrl = new Map(
      currentImages.map((image) => [
        image.url,
        { focalX: image.focalX, focalY: image.focalY },
      ]),
    );

    return resolvedImages.map((image, index) => {
      const focal = focalByUrl.get(image.url);

      return {
        url: image.url,
        order: index,
        focalX: focal?.focalX ?? null,
        focalY: focal?.focalY ?? null,
      };
    });
  }

  async remove(id: string): Promise<NewsDto> {
    await this.findExisting(id);

    const news = await this.prisma.news.delete({
      where: { id },
      include: NEWS_INCLUDE,
    });

    await Promise.all([
      this.deleteOwnCoverFile(news),
      ...news.images.map((image) =>
        this.uploadedFileCleanupService.deleteIfUnreferenced(image.url),
      ),
    ]);

    return toNewsDto(news);
  }

  async updateImageFocalPoint(
    id: string,
    dto: UpdateNewsImageFocalPointDto,
  ): Promise<NewsImageDto> {
    const image = await this.prisma.newsImage.findUnique({ where: { id } });

    if (!image) {
      throw new NotFoundException('Изображение не найдено');
    }

    const updated = await this.prisma.newsImage.update({
      where: { id },
      data: { focalX: dto.focalX, focalY: dto.focalY },
    });

    return { ...updated, variants: listImageVariants(updated.url) };
  }

  /**
   * Фокус своей обложки: у обложки из набора он живёт на самой картинке и
   * правится через `PATCH /admin/news/images/:id/focal-point`, поэтому здесь
   * принимается только состояние `custom` (`ОБЛ-О-06`).
   */
  async updateCoverFocalPoint(
    id: string,
    dto: UpdateNewsImageFocalPointDto,
  ): Promise<NewsDto> {
    const current = await this.findExisting(id);

    if (current.coverType !== NewsCoverType.CUSTOM) {
      throw new BadRequestException(
        'Точка фокуса задаётся здесь только для своей обложки: у обложки из ' +
          'набора она правится у самого изображения',
      );
    }

    const news = await this.prisma.news.update({
      where: { id },
      data: { coverFocalX: dto.focalX, coverFocalY: dto.focalY },
      include: NEWS_INCLUDE,
    });

    return toNewsDto(news);
  }

  /**
   * Приводит присланное состояние обложки к тому, что ляжет в строку News.
   * Своя обложка проходит тот же приём, что и картинки набора (форматы, лимит
   * размера, перенос внешней ссылки на сервер), поэтому после сохранения
   * способ загрузки неразличим (`ОБЛ-Б-02`, `ИЗО-Б-01`).
   */
  private async resolveCoverInput(
    cover: NewsCoverInputDto | undefined,
    inputImageUrls: string[],
    finalImageUrls: string[],
  ): Promise<ResolvedNewsCoverInput> {
    if (!cover || cover.type === 'none') {
      return { data: NO_COVER, downloadedFilePaths: [] };
    }

    if (cover.type === 'image') {
      return {
        data: {
          coverType: NewsCoverType.IMAGE,
          coverUrl: this.matchCoverToImageSet(
            cover.url as string,
            inputImageUrls,
            finalImageUrls,
          ),
          coverFocalX: null,
          coverFocalY: null,
        },
        downloadedFilePaths: [],
      };
    }

    const { resolved, downloadedFilePaths } =
      await this.newsImageDownloadService.resolveImageUrls([
        cover.url as string,
      ]);

    return {
      data: {
        coverType: toPrismaNewsCoverType(cover.type),
        coverUrl: resolved[0].url,
        coverFocalX: cover.focalPoint?.x ?? null,
        coverFocalY: cover.focalPoint?.y ?? null,
      },
      downloadedFilePaths,
    };
  }

  /**
   * Обложка из набора адресуется тем же url, что прислан в `imageUrls` — а
   * внешняя ссылка к моменту записи уже скачана и сменила адрес, поэтому
   * сопоставление идёт по позиции во входном наборе.
   */
  private matchCoverToImageSet(
    coverUrl: string,
    inputImageUrls: string[],
    finalImageUrls: string[],
  ): string {
    const inputIndex = inputImageUrls.indexOf(coverUrl);

    if (inputIndex >= 0) {
      return finalImageUrls[inputIndex];
    }

    if (finalImageUrls.includes(coverUrl)) {
      return coverUrl;
    }

    throw new BadRequestException(
      `Обложка ссылается на изображение, которого нет в наборе новости: ${coverUrl}`,
    );
  }

  /**
   * Убрать из набора картинку, которая служит обложкой, и не сказать, чем её
   * заменить — не то же самое, что «обложка больше не нужна». Молчаливый сброс
   * администратор обнаружил бы уже на публичной странице, поэтому ошибка.
   */
  private assertCoverSurvivesNewImageSet(
    current: { coverType: NewsCoverType; coverUrl: string | null },
    finalImageUrls: string[],
  ): void {
    if (
      current.coverType === NewsCoverType.IMAGE &&
      current.coverUrl !== null &&
      !finalImageUrls.includes(current.coverUrl)
    ) {
      throw new BadRequestException(
        'Изображение, выбранное обложкой, отсутствует в новом наборе — ' +
          'выберите другое состояние обложки в том же запросе',
      );
    }
  }

  private async deleteOwnCoverFile(news: {
    coverType: NewsCoverType;
    coverUrl: string | null;
  }): Promise<void> {
    if (news.coverType !== NewsCoverType.CUSTOM) {
      return;
    }

    await this.uploadedFileCleanupService.deleteIfUnreferenced(news.coverUrl);
  }

  private async findExisting(id: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
      select: {
        id: true,
        coverType: true,
        coverUrl: true,
        // focalX/focalY нужны, чтобы перенести фокус на пересозданные записи
        // при замене состава изображений (ИЗО-Б-02, см. rebuildImages()).
        images: { select: { url: true, focalX: true, focalY: true } },
      },
    });

    if (!news) {
      throw new NotFoundException('Новость не найдена');
    }

    return news;
  }

  private mapMissingTagIdError(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return new BadRequestException('Один или несколько tagIds не существуют');
    }

    return error;
  }
}
