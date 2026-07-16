import { ApiProperty } from '@nestjs/swagger';

export class DonatorDto {
  @ApiProperty({ example: 'shadowfox' })
  nickname: string;

  @ApiProperty({ example: 5000 })
  amount: number;
}
