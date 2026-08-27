import { ApiProperty } from '@nestjs/swagger';
import { NewsCoverDto } from '../../dto/news.dto';
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
}

export class PinnedGridLayoutDto {
  @ApiProperty({ type: PinnedGridConfigDto })
  config: PinnedGridConfigDto;

  @ApiProperty({ type: PinnedNewsSlotDto, isArray: true })
  slots: PinnedNewsSlotDto[];
}
