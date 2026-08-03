import { ApiProperty } from '@nestjs/swagger';

export class ViewResponseDto {
  @ApiProperty({ example: 42 })
  viewCount: number;

  @ApiProperty({ example: true })
  viewedByCurrentUser: boolean;
}
