import { registerDecorator, ValidationOptions } from 'class-validator';
import { UPLOADS_URL_PREFIX } from '../../upload/constants/upload.constant';

/**
 * Validates that a value is either an already-uploaded local `/uploads/*`
 * path (from `POST /upload`) or an absolute http(s) URL — the two ways the
 * frontend can supply a news image (see streamer.API#65). `@IsUrl()` alone
 * rejects the relative `/uploads/*` form, so this combines both cases.
 */
export function IsImageSource(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isImageSource',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string' || value.length === 0) {
            return false;
          }

          if (value.startsWith(`${UPLOADS_URL_PREFIX}/`)) {
            return true;
          }

          try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        },
        defaultMessage(): string {
          return 'each value in imageUrls must be an existing /uploads/* path or a valid http(s) URL';
        },
      },
    });
  };
}
