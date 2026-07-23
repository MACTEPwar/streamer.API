import { ApiProperty } from '@nestjs/swagger';
import { SocialLinkType } from '../../../generated/prisma/enums';

export class SocialLinkDto {
  @ApiProperty({ example: 'cly1a2b3c0002abcd1234efgh' })
  id: string;

  @ApiProperty({ example: 'cly1a2b3c0000abcd1234efgh' })
  userId: string;

  @ApiProperty({ enum: SocialLinkType, example: SocialLinkType.TELEGRAM })
  type: SocialLinkType;

  @ApiProperty({ example: '@streamer_nick' })
  value: string;

  @ApiProperty({ example: '2026-07-23T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-07-23T12:00:00.000Z' })
  updatedAt: Date;
}
