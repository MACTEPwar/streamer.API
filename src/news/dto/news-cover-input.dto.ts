import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { WIRE_NEWS_COVER_TYPES } from '../news-cover';
import type { WireNewsCoverType } from '../news-cover';
import { isImageSourceValue } from './is-image-source.decorator';

/**
 * Адрес обложки и её состояние — одно решение, а не два независимых поля:
 * у «нет обложки» адреса быть не может, у двух других он обязателен. Проверять
 * это одним декоратором приходится потому, что `@ValidateIf` отключает для
 * поля все декораторы разом и две ветки на одном поле так не выразить.
 */
function IsNewsCoverUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNewsCoverUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const type = (args.object as NewsCoverInputDto).type;

          if (type === 'none') {
            return value === undefined || value === null;
          }

          return isImageSourceValue(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return (args.object as NewsCoverInputDto).type === 'none'
            ? 'url не задаётся для обложки в состоянии none'
            : 'url обложки должен быть путём /uploads/* или http(s)-ссылкой';
        },
      },
    });
  };
}

export class NewsCoverFocalPointInputDto {
  @ApiProperty({ example: 50, description: 'Процент по горизонтали (0..100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  x: number;

  @ApiProperty({ example: 50, description: 'Процент по вертикали (0..100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  y: number;
}

export class NewsCoverInputDto {
  @ApiProperty({
    enum: WIRE_NEWS_COVER_TYPES,
    example: 'image',
    description:
      'none — новость осознанно без обложки; image — одна из её изображений ' +
      '(url обязан быть среди imageUrls); custom — своя обложка, в набор ' +
      'изображений не входящая',
  })
  @IsIn(WIRE_NEWS_COVER_TYPES)
  type: WireNewsCoverType;

  @ApiPropertyOptional({
    example: '/uploads/1c2d3e4f.jpg',
    description:
      'Путь /uploads/* или внешняя http(s)-ссылка — внешняя скачивается на ' +
      'сервер и дальше не хранится. Обязателен для image и custom, запрещён ' +
      'для none',
  })
  @IsNewsCoverUrl()
  url?: string;

  @ApiPropertyOptional({
    type: NewsCoverFocalPointInputDto,
    description:
      'Точка фокуса своей обложки. Для image фокус правится через ' +
      'PATCH /admin/news/images/:id/focal-point у самого изображения',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewsCoverFocalPointInputDto)
  focalPoint?: NewsCoverFocalPointInputDto;
}
