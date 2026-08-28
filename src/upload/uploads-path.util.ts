import { UPLOADS_URL_PREFIX } from './constants/upload.constant';

/**
 * Извлекает имя файла из `/uploads/*`-адреса, отклоняя внешние (`http(s)://`)
 * ссылки и попытки выйти за пределы каталога (`/`, `..`) — общая проверка,
 * переиспользуемая всем, что работает с файлами в `uploads/` по их
 * публичному адресу (`UploadedFileCleanupService`, размерные варианты).
 */
export function toUploadsFilename(
  url: string | null | undefined,
): string | null {
  if (!url || !url.startsWith(`${UPLOADS_URL_PREFIX}/`)) {
    return null;
  }

  const filename = url.slice(UPLOADS_URL_PREFIX.length + 1);

  if (!filename || filename.includes('/') || filename.includes('..')) {
    return null;
  }

  return filename;
}
