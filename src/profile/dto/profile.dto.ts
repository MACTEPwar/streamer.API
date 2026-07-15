import { ApiProperty } from '@nestjs/swagger';

export class ProfileDto {
  @ApiProperty({ example: 'cly1a2b3c0001abcd1234efgh' })
  id: string;

  @ApiProperty({ example: 'cly1a2b3c0000abcd1234efgh' })
  userId: string;

  @ApiProperty({ example: 'johndoe@example.com', nullable: true })
  email: string | null;
}
