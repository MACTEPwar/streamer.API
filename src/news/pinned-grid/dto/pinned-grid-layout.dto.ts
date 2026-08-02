import { ApiProperty } from '@nestjs/swagger';
import { CardImagePosition } from '../../../generated/prisma/enums';

export class PinnedGridConfigDto {
  @ApiProperty({ example: 3 })
  columns: number;

  @ApiProperty({ example: 12 })
  rows: number;
}

export class PinnedNewsSlotStyleDto {
  @ApiProperty({ enum: CardImagePosition, example: CardImagePosition.TOP })
  imagePosition: CardImagePosition;

  @ApiProperty({ example: 50 })
  imageSizePercent: number;

  @ApiProperty({ example: 1 })
  imageScale: number;

  @ApiProperty({ example: 50 })
  imageOffsetX: number;

  @ApiProperty({ example: 50 })
  imageOffsetY: number;

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

  @ApiProperty({ example: null, nullable: true })
  coverImageUrl: string | null;
}

export class PinnedGridLayoutDto {
  @ApiProperty({ type: PinnedGridConfigDto })
  config: PinnedGridConfigDto;

  @ApiProperty({ type: PinnedNewsSlotDto, isArray: true })
  slots: PinnedNewsSlotDto[];
}
