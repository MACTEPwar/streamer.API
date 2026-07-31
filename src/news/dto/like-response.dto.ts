import { ApiProperty } from '@nestjs/swagger';

export class LikeResponseDto {
  @ApiProperty({ example: 42 })
  likeCount: number;

  @ApiProperty({ example: true })
  likedByCurrentUser: boolean;
}
