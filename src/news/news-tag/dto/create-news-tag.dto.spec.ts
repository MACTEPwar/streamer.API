import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateNewsTagDto } from './create-news-tag.dto';

describe('CreateNewsTagDto', () => {
  it('passes validation with a valid name and color', async () => {
    const dto = plainToInstance(CreateNewsTagDto, {
      name: 'Турниры',
      color: '#FF5733',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation with an empty name', async () => {
    const dto = plainToInstance(CreateNewsTagDto, {
      name: '',
      color: '#FF5733',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'name')).toBe(true);
  });

  it('fails validation with an empty color', async () => {
    const dto = plainToInstance(CreateNewsTagDto, {
      name: 'Турниры',
      color: '',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'color')).toBe(true);
  });
});
