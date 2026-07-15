import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID token, полученный на фронте' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
