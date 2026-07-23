import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'old-correct-horse-battery-staple' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'new-correct-horse-battery-staple', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}
