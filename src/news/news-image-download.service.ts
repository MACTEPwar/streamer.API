import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { access, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import {
  MAX_UPLOAD_SIZE_BYTES,
  MIME_EXTENSION_MAP,
  UPLOADS_DIR,
  UPLOADS_URL_PREFIX,
} from '../upload/constants/upload.constant';
import {
  ALLOWED_IMAGE_URL_PROTOCOLS,
  IMAGE_DOWNLOAD_TIMEOUT_MS,
} from './constants/news-image-download.constant';
import { isPrivateOrLoopbackAddress } from './utils/private-ip.util';

export interface ResolvedNewsImage {
  url: string;
}

export interface ResolvedNewsImages {
  resolved: ResolvedNewsImage[];
  /** Paths of files newly downloaded during this call — pass to `cleanup()` if a later step (e.g. saving the News row) fails. */
  downloadedFilePaths: string[];
}

/**
 * Resolves the image URLs of a news item to local `/uploads/*` paths.
 * Already-local paths are validated in place; external http(s) URLs are
 * downloaded to disk (with SSRF guards) using the same on-disk convention
 * as `POST /upload`. Any failure rolls back files downloaded during the
 * same call via `cleanup()`.
 */
@Injectable()
export class NewsImageDownloadService {
  async resolveImageUrls(imageUrls: string[]): Promise<ResolvedNewsImages> {
    const resolved: ResolvedNewsImage[] = [];
    const downloadedFilePaths: string[] = [];

    try {
      for (const imageUrl of imageUrls) {
        if (imageUrl.startsWith(`${UPLOADS_URL_PREFIX}/`)) {
          await this.assertLocalUploadExists(imageUrl);
          resolved.push({ url: imageUrl });
          continue;
        }

        const { url, filePath } = await this.downloadExternalImage(imageUrl);
        downloadedFilePaths.push(filePath);
        resolved.push({ url });
      }
    } catch (error) {
      await this.cleanup(downloadedFilePaths);
      throw error;
    }

    return { resolved, downloadedFilePaths };
  }

  async cleanup(filePaths: string[]): Promise<void> {
    await Promise.all(
      filePaths.map((filePath) => this.removeFileSafe(filePath)),
    );
  }

  private async assertLocalUploadExists(uploadUrl: string): Promise<void> {
    const filename = uploadUrl.slice(UPLOADS_URL_PREFIX.length + 1);

    if (!filename || filename.includes('/') || filename.includes('..')) {
      throw new BadRequestException(
        `Некорректный путь загруженного файла: ${uploadUrl}`,
      );
    }

    try {
      await access(join(UPLOADS_DIR, filename));
    } catch {
      throw new BadRequestException(`Загруженный файл не найден: ${uploadUrl}`);
    }
  }

  private async downloadExternalImage(
    rawUrl: string,
  ): Promise<{ url: string; filePath: string }> {
    const parsedUrl = this.parseUrl(rawUrl);
    await this.assertPublicHost(parsedUrl.hostname);

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      IMAGE_DOWNLOAD_TIMEOUT_MS,
    );

    let response: Response;
    try {
      response = await fetch(parsedUrl.href, {
        signal: controller.signal,
        redirect: 'manual',
      });
    } catch {
      throw new BadRequestException(
        `Не удалось скачать изображение по ссылке: ${rawUrl}`,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      throw new BadRequestException(
        `Редиректы по внешним ссылкам на изображения не поддерживаются: ${rawUrl}`,
      );
    }

    if (!response.ok) {
      throw new BadRequestException(
        `Не удалось скачать изображение (HTTP ${response.status}): ${rawUrl}`,
      );
    }

    const contentType = response.headers
      .get('content-type')
      ?.split(';')[0]
      ?.trim();
    const extension = contentType ? MIME_EXTENSION_MAP[contentType] : undefined;

    if (!extension) {
      throw new BadRequestException(
        `Недопустимый тип содержимого изображения: ${rawUrl}`,
      );
    }

    if (!response.body) {
      throw new BadRequestException(`Пустой ответ при скачивании: ${rawUrl}`);
    }

    const filename = `${randomUUID()}${extension}`;
    const filePath = join(UPLOADS_DIR, filename);

    await this.writeResponseToFile(response.body, filePath, rawUrl);

    return { url: `${UPLOADS_URL_PREFIX}/${filename}`, filePath };
  }

  private async writeResponseToFile(
    body: ReadableStream<Uint8Array>,
    filePath: string,
    rawUrl: string,
  ): Promise<void> {
    const nodeStream = Readable.fromWeb(
      body as unknown as import('node:stream/web').ReadableStream<Uint8Array>,
    );
    const writeStream = createWriteStream(filePath);
    let bytesWritten = 0;

    try {
      for await (const chunk of nodeStream) {
        bytesWritten += (chunk as Buffer).length;

        if (bytesWritten > MAX_UPLOAD_SIZE_BYTES) {
          throw new BadRequestException(
            `Изображение превышает допустимый размер: ${rawUrl}`,
          );
        }

        if (!writeStream.write(chunk)) {
          await once(writeStream, 'drain');
        }
      }

      writeStream.end();
      await once(writeStream, 'finish');
    } catch (error) {
      writeStream.destroy();
      await this.removeFileSafe(filePath);

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Ошибка при скачивании изображения: ${rawUrl}`,
      );
    }
  }

  private parseUrl(rawUrl: string): URL {
    let parsed: URL;

    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException(
        `Некорректная ссылка на изображение: ${rawUrl}`,
      );
    }

    if (!ALLOWED_IMAGE_URL_PROTOCOLS.includes(parsed.protocol)) {
      throw new BadRequestException(`Недопустимая схема ссылки: ${rawUrl}`);
    }

    return parsed;
  }

  private async assertPublicHost(hostname: string): Promise<void> {
    let addresses: { address: string; family: number }[];

    try {
      addresses = await lookup(hostname, { all: true });
    } catch {
      throw new BadRequestException(`Не удалось разрешить хост: ${hostname}`);
    }

    if (addresses.length === 0) {
      throw new BadRequestException(`Не удалось разрешить хост: ${hostname}`);
    }

    for (const { address, family } of addresses) {
      if (isPrivateOrLoopbackAddress(address, family)) {
        throw new BadRequestException(
          `Ссылка на приватный/локальный адрес запрещена: ${hostname}`,
        );
      }
    }
  }

  private async removeFileSafe(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch {
      // best-effort cleanup, ignore errors (e.g. file already removed)
    }
  }
}
