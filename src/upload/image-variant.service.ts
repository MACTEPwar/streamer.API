import { Injectable, Logger } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { IMAGE_VARIANT_WIDTHS_PX } from './constants/image-variant-widths.constant';
import { UPLOADS_DIR } from './constants/upload.constant';
import { toVariantFilename } from './image-variant.util';

/**
 * Создание и удаление размерных вариантов изображения (`streamer.API#78`,
 * `АДП-Б-01`) — единая точка для всего, что кладёт файл в `uploads/`
 * (`UploadController`, `NewsImageDownloadService`) и для того, что его
 * убирает (`UploadedFileCleanupService`).
 */
@Injectable()
export class ImageVariantService {
  private readonly logger = new Logger(ImageVariantService.name);

  /**
   * Создаёт файл-вариант на каждую ширину из `IMAGE_VARIANT_WIDTHS_PX`,
   * которая СТРОГО МЕНЬШЕ ширины оригинала — апскейл не нужен, а вариант
   * шире оригинала совпал бы с ним по факту, только занимая место на диске
   * второй раз. Синхронно при приёме файла, не на каждый запрос.
   */
  async generate(filename: string): Promise<void> {
    const originalPath = join(UPLOADS_DIR, filename);
    let originalWidth: number | undefined;

    try {
      originalWidth = (await sharp(originalPath).metadata()).width;
    } catch (error) {
      this.logger.error(
        `Не удалось прочитать метаданные ${filename}, варианты не созданы`,
        error instanceof Error ? error.stack : undefined,
      );
      return;
    }

    if (!originalWidth) {
      this.logger.warn(
        `Не удалось определить ширину ${filename}, варианты не созданы`,
      );
      return;
    }

    const widths = IMAGE_VARIANT_WIDTHS_PX.filter(
      (width) => width < originalWidth,
    );

    await Promise.all(
      widths.map((width) => this.generateOne(originalPath, filename, width)),
    );
  }

  /** Удаляет все возможные файлы-варианты этого имени — best-effort, как и `UploadedFileCleanupService.deleteIfUnreferenced()`. */
  async deleteVariants(filename: string): Promise<void> {
    await Promise.all(
      IMAGE_VARIANT_WIDTHS_PX.map(async (width) => {
        try {
          await unlink(join(UPLOADS_DIR, toVariantFilename(filename, width)));
        } catch {
          // Варианта могло не быть (оригинал уже её ширины) — не ошибка.
        }
      }),
    );
  }

  private async generateOne(
    originalPath: string,
    filename: string,
    width: number,
  ): Promise<void> {
    try {
      await sharp(originalPath)
        .resize({ width })
        .toFile(join(UPLOADS_DIR, toVariantFilename(filename, width)));
    } catch (error) {
      this.logger.error(
        `Не удалось создать вариант ${width}w для ${filename}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
