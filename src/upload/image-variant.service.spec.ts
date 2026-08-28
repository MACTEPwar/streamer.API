import { Logger } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { IMAGE_VARIANT_WIDTHS_PX } from './constants/image-variant-widths.constant';
import { ImageVariantService } from './image-variant.service';
import { toVariantFilename } from './image-variant.util';

jest.mock('node:fs/promises', () => ({ unlink: jest.fn() }));

const metadataMock = jest.fn();
const toFileMock = jest.fn();
const resizeMock = jest.fn();

jest.mock('sharp', () => {
  const sharpFactory = jest.fn(() => ({
    metadata: metadataMock,
    resize: resizeMock,
  }));
  return { __esModule: true, default: sharpFactory };
});

describe('ImageVariantService', () => {
  let service: ImageVariantService;
  const unlinkMock = unlink as jest.Mock;

  beforeAll(() => {
    // Ошибки ресайза — штатная ветка теста ниже, её error-строка не должна
    // засорять вывод прогона.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ImageVariantService();
    resizeMock.mockReturnValue({ toFile: toFileMock });
    toFileMock.mockResolvedValue(undefined);
  });

  describe('generate', () => {
    it('creates a variant for every configured width narrower than the original', async () => {
      metadataMock.mockResolvedValue({ width: 1000 });

      await service.generate('photo.jpg');

      const narrower = IMAGE_VARIANT_WIDTHS_PX.filter((width) => width < 1000);
      expect(resizeMock).toHaveBeenCalledTimes(narrower.length);
      for (const width of narrower) {
        expect(resizeMock).toHaveBeenCalledWith({ width });
      }
    });

    it('never generates a variant as wide as or wider than the original (no upscale)', async () => {
      const smallestWidth = IMAGE_VARIANT_WIDTHS_PX[0];
      metadataMock.mockResolvedValue({ width: smallestWidth });

      await service.generate('tiny.jpg');

      expect(resizeMock).not.toHaveBeenCalled();
    });

    it('does nothing when the image width cannot be determined', async () => {
      metadataMock.mockResolvedValue({ width: undefined });

      await service.generate('unknown.jpg');

      expect(resizeMock).not.toHaveBeenCalled();
    });

    it('does not throw when reading metadata fails', async () => {
      metadataMock.mockRejectedValue(new Error('corrupt file'));

      await expect(service.generate('broken.jpg')).resolves.toBeUndefined();
      expect(resizeMock).not.toHaveBeenCalled();
    });

    it('keeps generating the remaining widths when one variant fails', async () => {
      metadataMock.mockResolvedValue({ width: 1000 });
      toFileMock
        .mockRejectedValueOnce(new Error('disk full'))
        .mockResolvedValue(undefined);

      await expect(service.generate('photo.jpg')).resolves.toBeUndefined();
    });
  });

  describe('deleteVariants', () => {
    it('attempts to remove every configured width, ignoring missing files', async () => {
      unlinkMock.mockRejectedValue(new Error('ENOENT'));

      await expect(
        service.deleteVariants('photo.jpg'),
      ).resolves.toBeUndefined();

      expect(unlinkMock).toHaveBeenCalledTimes(IMAGE_VARIANT_WIDTHS_PX.length);
    });

    it('removes each variant by its filename convention', async () => {
      unlinkMock.mockResolvedValue(undefined);
      const width = IMAGE_VARIANT_WIDTHS_PX[0];

      await service.deleteVariants('photo.jpg');

      expect(unlinkMock).toHaveBeenCalledWith(
        expect.stringContaining(toVariantFilename('photo.jpg', width)),
      );
    });
  });
});
