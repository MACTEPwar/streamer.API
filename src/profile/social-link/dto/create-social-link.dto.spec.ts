import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SocialLinkType } from '../../../generated/prisma/enums';
import { CreateSocialLinkDto } from './create-social-link.dto';

describe('CreateSocialLinkDto', () => {
  it('passes validation with a valid type and value', async () => {
    const dto = plainToInstance(CreateSocialLinkDto, {
      type: SocialLinkType.TELEGRAM,
      value: '@streamer_nick',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation with an invalid type', async () => {
    const dto = plainToInstance(CreateSocialLinkDto, {
      type: 'NOT_A_TYPE',
      value: '@streamer_nick',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'type')).toBe(true);
  });

  it('fails validation with an empty value', async () => {
    const dto = plainToInstance(CreateSocialLinkDto, {
      type: SocialLinkType.TELEGRAM,
      value: '',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'value')).toBe(true);
  });
});
