import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';
import { PinnedGridLayoutDto } from './dto/pinned-grid-layout.dto';
import { parsePinnedGridViewport } from './pinned-grid-viewport.util';
import { PinnedGridService } from './pinned-grid.service';

@ApiTags('news/pinned-layout')
@Controller('news/pinned-layout')
export class PinnedGridController {
  constructor(private readonly pinnedGridService: PinnedGridService) {}

  /**
   * `OptionalJwtAuthGuard`, а не `JwtAuthGuard` (streamer.API#76): витрина
   * публичная и гостю отдаётся целиком, но авторизованному в каждом слоте
   * нужны признаки собственной реакции — без guard'а `req.user` не заполняется
   * и брать их неоткуда. Тот же приём и то же обоснование, что у `GET /news`.
   */
  @Get(':viewport')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ type: PinnedGridLayoutDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  getLayout(
    @Param('viewport') viewport: string,
    @Req() req: Request,
  ): Promise<PinnedGridLayoutDto> {
    return this.pinnedGridService.getLayout(
      parsePinnedGridViewport(viewport),
      req.user?.id,
    );
  }
}
