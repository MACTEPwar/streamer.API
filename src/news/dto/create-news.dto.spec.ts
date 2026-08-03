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

  it('passes validation without optional hasNoImage', async () => {
    const dto = plainToInstance(CreateNewsDto, valid);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes validation with hasNoImage true and an empty imageUrls array', async () => {
    const dto = plainToInstance(CreateNewsDto, {
      ...valid,
      imageUrls: [],
      hasNoImage: true,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation when hasNoImage is not a boolean', async () => {
    const dto = plainToInstance(CreateNewsDto, {
      ...valid,
      hasNoImage: 'yes',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'hasNoImage')).toBe(true);
  });
});
