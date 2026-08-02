import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CardImagePosition } from '../../../generated/prisma/enums';

export class UpdatePinnedGridConfigDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  columns: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  rows: number;
}

export class UpdatePinnedNewsSlotStyleDto {
  @ApiProperty({ enum: CardImagePosition, example: CardImagePosition.TOP })
  @IsEnum(CardImagePosition)
  imagePosition: CardImagePosition;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  @Max(100)
  imageSizePercent: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  @Max(3)
  imageScale: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  @Max(100)
  imageOffsetX: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  @Max(100)
  imageOffsetY: number;

  @ApiProperty({ example: '#f9f9f9' })
  @IsString()
  backgroundColor: string;

  @ApiProperty({ example: '#1e1e1e' })
  @IsString()
  textColor: string;
}

export class UpdatePinnedNewsSlotDto {
  @ApiProperty({ example: 'cly1a2b3c0000abcd1234efgh' })
  @IsString()
  @IsNotEmpty()
  newsId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  colStart: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  rowStart: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  colSpan: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  rowSpan: number;

  @ApiProperty({ type: UpdatePinnedNewsSlotStyleDto })
  @ValidateNested()
  @Type(() => UpdatePinnedNewsSlotStyleDto)
  style: UpdatePinnedNewsSlotStyleDto;

  @ApiProperty({ example: null, nullable: true, required: false })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;
}

export class UpdatePinnedGridLayoutDto {
  @ApiProperty({ type: UpdatePinnedGridConfigDto })
  @ValidateNested()
  @Type(() => UpdatePinnedGridConfigDto)
  config: UpdatePinnedGridConfigDto;

  @ApiProperty({ type: UpdatePinnedNewsSlotDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePinnedNewsSlotDto)
  slots: UpdatePinnedNewsSlotDto[];
}
