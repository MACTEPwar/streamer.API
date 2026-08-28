import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { IMAGE_VARIANT_WIDTHS_PX } from './constants/image-variant-widths.constant';
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from './constants/upload.constant';
import { toUploadsFilename } from './uploads-path.util';

export interface ImageVariant {
  width: number;
  url: string;
}

/** `photo.jpg` + `330` → `photo-330w.jpg` (конвенция имени, `streamer.API#78`). */
export function toVariantFilename(filename: string, width: number): string {
  const extension = extname(filename);
  const base = filename.slice(0, filename.length - extension.length);

  return `${base}-${width}w${extension}`;
}

/**
 * Варианты, реально лежащие на диске для этого адреса — существование
 * проверяется файлом, а не читается из записи (список вариантов намеренно не
 * хранится в БД, см. `IMAGE_VARIANT_WIDTHS_PX`). Внешние адреса и адреса вне
 * `/uploads/*` вариантов не имеют.
 */
export function listImageVariants(
  url: string | null | undefined,
): ImageVariant[] {
  const filename = toUploadsFilename(url);

  if (!filename) {
    return [];
  }

  return IMAGE_VARIANT_WIDTHS_PX.filter((width) =>
    existsSync(join(UPLOADS_DIR, toVariantFilename(filename, width))),
  ).map((width) => ({
    width,
    url: `${UPLOADS_URL_PREFIX}/${toVariantFilename(filename, width)}`,
  }));
}
