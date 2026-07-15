import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { diskStorage } from 'multer';
import {
  MAX_UPLOAD_SIZE_BYTES,
  MIME_EXTENSION_MAP,
  UPLOADS_DIR,
} from './constants/upload.constant';

export const multerOptions = {
  storage: diskStorage({
    destination: UPLOADS_DIR,
    filename: (
      _req: Express.Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => {
      callback(null, `${randomUUID()}${MIME_EXTENSION_MAP[file.mimetype]}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!MIME_EXTENSION_MAP[file.mimetype]) {
      callback(new BadRequestException('Недопустимый тип файла'), false);
      return;
    }
    callback(null, true);
  },
};
