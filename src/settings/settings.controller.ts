import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ErrorResponseDto } from '../shared/dto/error-response.dto';
import { SettingsDto } from './dto/settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOkResponse({ type: SettingsDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  getOwnSettings(@Req() req: Request): Promise<SettingsDto> {
    return this.settingsService.findByUserId(req.user!.id);
  }

  @Patch()
  @ApiOkResponse({ type: SettingsDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  updateOwnSettings(
    @Req() req: Request,
    @Body() dto: UpdateSettingsDto,
  ): Promise<SettingsDto> {
    return this.settingsService.update(req.user!.id, dto);
  }
}
