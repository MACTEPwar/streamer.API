import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';

export class UpdateNewsImageFocalPointDto {
  @ApiProperty({
    example: 50,
    nullable: true,
    description: 'Процент по горизонтали (0..100); null — сброс в центр',
  })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(100)
  focalX: number | null;

  @ApiProperty({
    example: 50,
    nullable: true,
    description: 'Процент по вертикали (0..100); null — сброс в центр',
  })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(100)
  focalY: number | null;
}
