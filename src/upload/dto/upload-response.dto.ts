import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ example: '/uploads/9c858901-8a57-4791-81fe-4c455b099bc9.png' })
  url: string;
}
