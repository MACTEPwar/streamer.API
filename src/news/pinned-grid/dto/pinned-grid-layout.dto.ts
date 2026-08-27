import { ApiProperty } from '@nestjs/swagger';
import { NewsCoverDto } from '../../dto/news.dto';
import { NewsTagDto } from '../../news-tag/dto/news-tag.dto';
import { WIRE_CARD_IMAGE_POSITIONS } from '../pinned-grid-image-position.util';
import type { WireCardImagePosition } from '../pinned-grid-image-position.util';

export class PinnedGridConfigDto {
  @ApiProperty({ example: 3 })
  columns: number;

  @ApiProperty({ example: 12 })
  rows: number;
}

export class PinnedNewsSlotStyleDto {
  @ApiProperty({ enum: WIRE_CARD_IMAGE_POSITIONS, example: 'top' })
  imagePosition: WireCardImagePosition;

  @ApiProperty({ example: 50 })
  imageSizePercent: number;

  @ApiProperty({ example: '#f9f9f9' })
  backgroundColor: string;

  @ApiProperty({ example: '#1e1e1e' })
  textColor: string;
}

/**
 * Содержимое карточки витрины (`ЗАК-Б-01`, streamer.API#76). До этого
 * раскладка отдавала только положение и оформление, а содержимое клиент
 * доискивал сам — подгружал сотню свежих новостей и показывал те
 * закрепления, что в неё попали; закреплённая новость старше сотни молча
 * исчезала у посетителя.
 *
 * Поля — ровно те, что рисует карточка. Полного `NewsDto` здесь намеренно
 * нет: `images[]` витрине не нужны (картинку даёт `cover` слота), а тащить
 * их на каждый слот — тот же лишний объём, ради которого задача и заведена.
 */
export class PinnedNewsContentDto {
  @ApiProperty({ example: 'Открыт турнир по CS2' })
  title: string;

  @ApiProperty({ example: 'Подробное описание новости...' })
  description: string;

  @ApiProperty({ example: '2026-07-31T12:00:00.000Z' })
  publishedAt: Date;

  @ApiProperty({ example: 320 })
  viewCount: number;

  @ApiProperty({ example: 42 })
  likeCount: number;

  @ApiProperty({
    example: false,
    nullable: true,
    description:
      'null, если запрос выполнен без авторизации — это отличимо от «не ' +
      'реагировал» (РЕА-Б-02)',
  })
  likedByCurrentUser: boolean | null;

  @ApiProperty({
    example: false,
    nullable: true,
    description: 'null, если запрос выполнен без авторизации (РЕА-Б-02)',
  })
  viewedByCurrentUser: boolean | null;

  @ApiProperty({
    type: [NewsTagDto],
    description:
      'Полные темы, а не их id: карточка рисует плашку с собственными ' +
      'цветами фона и текста',
  })
  tags: NewsTagDto[];
}

export class PinnedNewsSlotDto {
  @ApiProperty({ example: 'cly1a2b3c0000abcd1234efgh' })
  newsId: string;

  @ApiProperty({ example: 1 })
  colStart: number;

  @ApiProperty({ example: 1 })
  rowStart: number;

  @ApiProperty({ example: 1 })
  colSpan: number;

  @ApiProperty({ example: 1 })
  rowSpan: number;

  @ApiProperty({ type: PinnedNewsSlotStyleDto })
  style: PinnedNewsSlotStyleDto;

  @ApiProperty({
    type: NewsCoverDto,
    description:
      'Обложка новости — та же, что в ленте: карточка витрины не показывает ' +
      'свою картинку и не подменяет отсутствующую обложку первым изображением',
  })
  cover: NewsCoverDto;

  @ApiProperty({
    type: PinnedNewsContentDto,
    description:
      'Содержимое карточки (ЗАК-Б-01) — клиенту не нужно доискивать его ' +
      'отдельно, поэтому закреплённая новость любой давности приходит целиком',
  })
  news: PinnedNewsContentDto;
}

export class PinnedGridLayoutDto {
  @ApiProperty({ type: PinnedGridConfigDto })
  config: PinnedGridConfigDto;

  @ApiProperty({ type: PinnedNewsSlotDto, isArray: true })
  slots: PinnedNewsSlotDto[];
}
