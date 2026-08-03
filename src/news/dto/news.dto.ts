import { ApiProperty } from '@nestjs/swagger';
import { NewsTagDto } from '../news-tag/dto/news-tag.dto';
import { NewsImageDto } from './news-image.dto';

export class NewsDto {
  @ApiProperty({ example: 'cly1a2b3c0000abcd1234efgh' })
  id: string;

  @ApiProperty({ example: 'Открыт турнир по CS2' })
  title: string;

  @ApiProperty({ example: 'Подробное описание новости...' })
  description: string;

  @ApiProperty({ example: '2026-07-31T12:00:00.000Z' })
  publishedAt: Date;

  @ApiProperty({ example: 0 })
  viewCount: number;

  @ApiProperty({ example: 42 })
  likeCount: number;

  @ApiProperty({
    example: false,
    nullable: true,
    description: 'null, если запрос выполнен без авторизации',
  })
  likedByCurrentUser: boolean | null;

  @ApiProperty({
    example: false,
    nullable: true,
    description: 'null, если запрос выполнен без авторизации',
  })
  viewedByCurrentUser: boolean | null;

  @ApiProperty({ type: [NewsImageDto] })
  images: NewsImageDto[];

  @ApiProperty({ type: [NewsTagDto] })
  tags: NewsTagDto[];

  @ApiProperty({ example: '2026-07-31T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-07-31T12:00:00.000Z' })
  updatedAt: Date;
}
