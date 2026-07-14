import { ApiProperty } from '@nestjs/swagger';

export class AppInfoDto {
  @ApiProperty({ example: 'streamer-api' })
  name: string;

  @ApiProperty({ example: '0.0.1' })
  version: string;
}
