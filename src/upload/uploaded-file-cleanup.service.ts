import { Injectable, Logger } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from './constants/upload.constant';

/**
 * Удаление файла, переставшего использоваться (`ФАЙ-Б-04`). Проверка «не нужен
 * больше нигде» обязательна: один и тот же адрес мог быть выбран несколькими
 * записями — например, своя обложка новости и такая же у соседней.
 *
 * Вызывается после замены/удаления владеющей записи: своя обложка новости и
 * набор изображений (`AdminNewsService`, `streamer.API#84`), аватар профиля
 * (`ProfileService`). Всегда после успешной транзакции/операции в БД — файловая
 * уборка не откатывается вместе с ней.
 */
@Injectable()
export class UploadedFileCleanupService {
  private readonly logger = new Logger(UploadedFileCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async deleteIfUnreferenced(url: string | null | undefined): Promise<void> {
    const filename = this.toUploadsFilename(url);

    if (!filename) {
      return;
    }

    if (await this.isReferenced(url as string)) {
      return;
    }

    try {
      await unlink(join(UPLOADS_DIR, filename));
    } catch {
      // Файла может уже не быть — удаление best-effort, ронять из-за него
      // операцию, которая в остальном прошла, нечего.
      this.logger.debug(`Не удалось удалить файл ${filename}`);
    }
  }

  private toUploadsFilename(url: string | null | undefined): string | null {
    if (!url || !url.startsWith(`${UPLOADS_URL_PREFIX}/`)) {
      return null;
    }

    const filename = url.slice(UPLOADS_URL_PREFIX.length + 1);

    if (!filename || filename.includes('/') || filename.includes('..')) {
      return null;
    }

    return filename;
  }

  private async isReferenced(url: string): Promise<boolean> {
    const [asNewsImage, asNewsCover, asAvatar] = await Promise.all([
      this.prisma.newsImage.count({ where: { url } }),
      this.prisma.news.count({ where: { coverUrl: url } }),
      this.prisma.profile.count({ where: { avatarUrl: url } }),
    ]);

    return asNewsImage > 0 || asNewsCover > 0 || asAvatar > 0;
  }
}
