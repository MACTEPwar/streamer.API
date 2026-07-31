import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsImageSource } from './is-image-source.decorator';

export class CreateNewsDto {
  @ApiProperty({ example: 'Открыт турнир по CS2', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Подробное описание новости...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    type: [String],
    example: ['/uploads/1c2d3e4f.jpg', 'https://example.com/pic.png'],
    description:
      'Уже загруженные через POST /upload пути (/uploads/*) или внешние http(s)-ссылки — внешние ссылки скачиваются и заменяются на локальный путь',
  })
  @IsArray()
  @IsImageSource({ each: true })
  imageUrls: string[];

  @ApiPropertyOptional({
    example: '2026-07-31T12:00:00.000Z',
    description: 'По умолчанию — текущее время',
  })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiProperty({ type: [String], example: ['cly1a2b3c0000abcd1234efgh'] })
  @IsArray()
  @IsString({ each: true })
  tagIds: string[];
}
