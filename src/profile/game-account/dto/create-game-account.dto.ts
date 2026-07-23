import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateGameAccountDto {
  @ApiProperty({ example: 'ProNickname', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nickname: string;

  @ApiProperty({ example: '76561198000000000', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  externalId: string;
}
