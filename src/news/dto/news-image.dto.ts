import { ApiProperty } from '@nestjs/swagger';

export class NewsImageDto {
  @ApiProperty({ example: 'cly1a2b3c0000abcd1234efgh' })
  id: string;

  @ApiProperty({ example: '/uploads/1c2d3e4f.jpg' })
  url: string;

  @ApiProperty({ example: 0 })
  order: number;
}
