import { ApiProperty } from '@nestjs/swagger';

export class GameAccountDto {
  @ApiProperty({ example: 'cly1a2b3c0002abcd1234efgh' })
  id: string;

  @ApiProperty({ example: 'cly1a2b3c0000abcd1234efgh' })
  userId: string;

  @ApiProperty({ example: 'ProNickname' })
  nickname: string;

  @ApiProperty({ example: '76561198000000000' })
  externalId: string;

  @ApiProperty({ example: '2026-07-23T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-07-23T12:00:00.000Z' })
  updatedAt: Date;
}
