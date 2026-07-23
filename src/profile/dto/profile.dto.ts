import { ApiProperty } from '@nestjs/swagger';

export class ProfileDto {
  @ApiProperty({ example: 'cly1a2b3c0001abcd1234efgh' })
  id: string;

  @ApiProperty({ example: 'cly1a2b3c0000abcd1234efgh' })
  userId: string;

  @ApiProperty({ example: 'johndoe@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: 'John Doe', nullable: true })
  name: string | null;

  @ApiProperty({
    example: '/uploads/9c858901-8a57-4791-81fe-4c455b099bc9.png',
    nullable: true,
  })
  avatarUrl: string | null;
}
