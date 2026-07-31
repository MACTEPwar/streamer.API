import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateNewsTagDto } from './create-news-tag.dto';

describe('CreateNewsTagDto', () => {
  it('passes validation with a valid name, color and textColor', async () => {
    const dto = plainToInstance(CreateNewsTagDto, {
      name: 'Турниры',
      color: '#FF5733',
      textColor: '#FFFFFF',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation with an empty name', async () => {
    const dto = plainToInstance(CreateNewsTagDto, {
      name: '',
      color: '#FF5733',
      textColor: '#FFFFFF',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'name')).toBe(true);
  });

  it('fails validation with an empty color', async () => {
    const dto = plainToInstance(CreateNewsTagDto, {
      name: 'Турниры',
      color: '',
      textColor: '#FFFFFF',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'color')).toBe(true);
  });

  it('fails validation with an empty textColor', async () => {
    const dto = plainToInstance(CreateNewsTagDto, {
      name: 'Турниры',
      color: '#FF5733',
      textColor: '',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'textColor')).toBe(true);
  });
});
