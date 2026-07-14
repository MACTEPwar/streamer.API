import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { APP_NAME, APP_VERSION } from './app-info';
import { AppInfoDto } from './app-info.dto';

@ApiTags('app')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Basic app info' })
  @ApiOkResponse({ type: AppInfoDto })
  getAppInfo(): AppInfoDto {
    return { name: APP_NAME, version: APP_VERSION };
  }
}
