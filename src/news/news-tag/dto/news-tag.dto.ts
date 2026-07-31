import { ApiProperty } from '@nestjs/swagger';

export class NewsTagDto {
  @ApiProperty({ example: 'cly1a2b3c0000abcd1234efgh' })
  id: string;

  @ApiProperty({ example: 'Турниры' })
  name: string;

  @ApiProperty({ example: '#FF5733' })
  color: string;

  @ApiProperty({ example: '#FFFFFF' })
  textColor: string;

  @ApiProperty({ example: '2026-07-31T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-07-31T12:00:00.000Z' })
  updatedAt: Date;
}
