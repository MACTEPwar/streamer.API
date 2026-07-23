import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';
import { CreateSocialLinkDto } from './dto/create-social-link.dto';
import { SocialLinkDto } from './dto/social-link.dto';
import { UpdateSocialLinkDto } from './dto/update-social-link.dto';
import { SocialLinkService } from './social-link.service';

@ApiTags('profile')
@UseGuards(JwtAuthGuard)
@Controller('profile/social-links')
export class SocialLinkController {
  constructor(private readonly socialLinkService: SocialLinkService) {}

  @Get()
  @ApiOkResponse({ type: SocialLinkDto, isArray: true })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  findAll(@Req() req: Request): Promise<SocialLinkDto[]> {
    return this.socialLinkService.findAllByUserId(req.user!.id);
  }

  @Post()
  @ApiOkResponse({ type: SocialLinkDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  create(
    @Req() req: Request,
    @Body() dto: CreateSocialLinkDto,
  ): Promise<SocialLinkDto> {
    return this.socialLinkService.create(req.user!.id, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SocialLinkDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateSocialLinkDto,
  ): Promise<SocialLinkDto> {
    return this.socialLinkService.update(req.user!.id, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: SocialLinkDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  remove(@Req() req: Request, @Param('id') id: string): Promise<SocialLinkDto> {
    return this.socialLinkService.remove(req.user!.id, id);
  }
}
