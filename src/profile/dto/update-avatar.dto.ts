import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateAvatarDto {
  @ApiProperty({ example: '/uploads/9c858901-8a57-4791-81fe-4c455b099bc9.png' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  avatarUrl: string;
}
