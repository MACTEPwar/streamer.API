import { ApiProperty } from '@nestjs/swagger';
import { ImageVariantDto } from '../../upload/dto/image-variant.dto';
import { NewsTagDto } from '../news-tag/dto/news-tag.dto';
import { WIRE_NEWS_COVER_TYPES } from '../news-cover';
import type { WireNewsCoverType } from '../news-cover';
import { NewsImageDto } from './news-image.dto';

export class NewsCoverFocalPointDto {
  @ApiProperty({ example: 50 })
  x: number;

  @ApiProperty({ example: 50 })
  y: number;
}

export class NewsCoverDto {
  @ApiProperty({
    enum: WIRE_NEWS_COVER_TYPES,
    example: 'image',
    description:
      'Состояние обложки: none — новость осознанно без обложки, image — одна ' +
      'из её изображений, custom — своя, в набор изображений не входящая',
  })
  type: WireNewsCoverType;

  @ApiProperty({
    example: '/uploads/1c2d3e4f.jpg',
    nullable: true,
    description: 'null при type = none',
  })
  url: string | null;

  @ApiProperty({
    type: NewsCoverFocalPointDto,
    nullable: true,
    example: null,
    description: 'null — фокус не задан, показывать по центру (50/50)',
  })
  focalPoint: NewsCoverFocalPointDto | null;

  @ApiProperty({
    type: [ImageVariantDto],
    description:
      'Размерные варианты обложки (streamer.API#78) — пусто при type = none',
  })
  variants: ImageVariantDto[];
}

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

  @ApiProperty({
    type: NewsCoverDto,
    description:
      'Картинка, представляющая новость там, где показывается одна: в витрине ' +
      'и в ленте. Первое изображение новости обложку не подменяет',
  })
  cover: NewsCoverDto;

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
