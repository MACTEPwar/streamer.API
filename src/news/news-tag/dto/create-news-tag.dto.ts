import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateNewsTagDto {
  @ApiProperty({ example: 'Турниры', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '#FF5733', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  color: string;
}
