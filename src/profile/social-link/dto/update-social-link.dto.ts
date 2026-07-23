import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SocialLinkType } from '../../../generated/prisma/enums';

export class UpdateSocialLinkDto {
  @ApiPropertyOptional({
    enum: SocialLinkType,
    example: SocialLinkType.TELEGRAM,
  })
  @IsOptional()
  @IsEnum(SocialLinkType)
  type?: SocialLinkType;

  @ApiPropertyOptional({ example: '@streamer_nick', maxLength: 255 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value?: string;
}
