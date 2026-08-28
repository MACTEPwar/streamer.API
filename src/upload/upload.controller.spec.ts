import { BadRequestException } from '@nestjs/common';
import { UPLOADS_URL_PREFIX } from './constants/upload.constant';
import { ImageVariantService } from './image-variant.service';
import { UploadController } from './upload.controller';

describe('UploadController', () => {
  let controller: UploadController;
  const imageVariantServiceMock = { generate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UploadController(
      imageVariantServiceMock as unknown as ImageVariantService,
    );
  });

  it('generates size variants for the uploaded file before responding (streamer.API#78)', async () => {
    const file = { filename: 'abc.jpg' } as Express.Multer.File;

    const result = await controller.uploadFile(file);

    expect(imageVariantServiceMock.generate).toHaveBeenCalledWith('abc.jpg');
    expect(result).toEqual({ url: `${UPLOADS_URL_PREFIX}/abc.jpg` });
  });

  it('throws BadRequestException when no file is passed, without generating variants', async () => {
    await expect(
      controller.uploadFile(undefined as unknown as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
    expect(imageVariantServiceMock.generate).not.toHaveBeenCalled();
  });
});
