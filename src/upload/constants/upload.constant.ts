import { join } from 'node:path';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');
export const UPLOADS_URL_PREFIX = '/uploads';
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

export const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
