import { ApiProperty } from '@nestjs/swagger';

/**
 * Один размерный вариант изображения (`streamer.API#78`) — клиент выбирает
 * по `width`, не угадывая имя файла по конвенции.
 */
export class ImageVariantDto {
  @ApiProperty({ example: 330 })
  width: number;

  @ApiProperty({ example: '/uploads/1c2d3e4f-330w.jpg' })
  url: string;
}
