import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateNewsDto } from './create-news.dto';

describe('CreateNewsDto', () => {
  const valid = {
    title: 'Открыт турнир по CS2',
    description: 'Подробное описание',
    imageUrls: ['/uploads/abc.jpg', 'https://example.com/pic.png'],
    tagIds: ['tag-1'],
  };

  it('passes validation with valid data', async () => {
    const dto = plainToInstance(CreateNewsDto, valid);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes validation without optional publishedAt', async () => {
    const dto = plainToInstance(CreateNewsDto, valid);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation with an empty title', async () => {
    const dto = plainToInstance(CreateNewsDto, { ...valid, title: '' });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'title')).toBe(true);
  });

  it('fails validation with an invalid publishedAt', async () => {
    const dto = plainToInstance(CreateNewsDto, {
      ...valid,
      publishedAt: 'not-a-date',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'publishedAt')).toBe(true);
  });

  it('fails validation when an imageUrl is neither an /uploads/* path nor an http(s) URL', async () => {
    const dto = plainToInstance(CreateNewsDto, {
      ...valid,
      imageUrls: ['not-a-valid-source'],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'imageUrls')).toBe(true);
  });

  it('fails validation when imageUrls contains a file:// URL', async () => {
    const dto = plainToInstance(CreateNewsDto, {
      ...valid,
      imageUrls: ['file:///etc/passwd'],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'imageUrls')).toBe(true);
  });

  it('fails validation when tagIds is not an array', async () => {
    const dto = plainToInstance(CreateNewsDto, { ...valid, tagIds: 'tag-1' });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'tagIds')).toBe(true);
  });

  it('passes validation without a cover', async () => {
    const dto = plainToInstance(CreateNewsDto, valid);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes validation for a news deliberately without a cover', async () => {
    const dto = plainToInstance(CreateNewsDto, {
      ...valid,
      imageUrls: [],
      cover: { type: 'none' },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes validation for an own cover with a focal point', async () => {
    const dto = plainToInstance(CreateNewsDto, {
      ...valid,
      cover: {
        type: 'custom',
        url: 'https://example.com/cover.png',
        focalPoint: { x: 70, y: 80 },
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation with an unknown cover state', async () => {
    const dto = plainToInstance(CreateNewsDto, {
      ...valid,
      cover: { type: 'first-image', url: '/uploads/abc.jpg' },
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'cover')).toBe(true);
  });

  it('fails validation when a chosen cover comes without an url', async () => {
    const dto = plainToInstance(CreateNewsDto, {
      ...valid,
      cover: { type: 'image' },
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'cover')).toBe(true);
  });

  it('fails validation when an url is given for a news without a cover', async () => {
    const dto = plainToInstance(CreateNewsDto, {
      ...valid,
      cover: { type: 'none', url: '/uploads/abc.jpg' },
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'cover')).toBe(true);
  });

  it('fails validation when the cover url is neither an /uploads/* path nor an http(s) URL', async () => {
    const dto = plainToInstance(CreateNewsDto, {
      ...valid,
      cover: { type: 'custom', url: 'file:///etc/passwd' },
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'cover')).toBe(true);
  });

  it('fails validation when the cover focal point is out of range', async () => {
    const dto = plainToInstance(CreateNewsDto, {
      ...valid,
      cover: {
        type: 'custom',
        url: '/uploads/abc.jpg',
        focalPoint: { x: 140, y: 50 },
      },
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'cover')).toBe(true);
  });
});
