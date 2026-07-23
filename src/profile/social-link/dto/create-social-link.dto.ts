import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SocialLinkType } from '../../../generated/prisma/enums';

export class CreateSocialLinkDto {
  @ApiProperty({ enum: SocialLinkType, example: SocialLinkType.TELEGRAM })
  @IsEnum(SocialLinkType)
  type: SocialLinkType;

  @ApiProperty({ example: '@streamer_nick', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value: string;
}
