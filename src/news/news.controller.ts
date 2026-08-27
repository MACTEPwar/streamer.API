import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ApiPaginatedResponse } from '../shared/decorators/api-paginated-response.decorator';
import { ErrorResponseDto } from '../shared/dto/error-response.dto';
import { LikeResponseDto } from './dto/like-response.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { NewsDto } from './dto/news.dto';
import { ViewResponseDto } from './dto/view-response.dto';
import { NewsService } from './news.service';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  /**
   * Условия отбора описаны на самих полях `NewsQueryDto` — второго их
   * описания через `@ApiQuery` здесь нет намеренно: две копии контракта
   * расходятся при первой же правке.
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiPaginatedResponse(NewsDto)
  @ApiResponse({
    status: 401,
    type: ErrorResponseDto,
    description:
      'likedByCurrentUser/viewedByCurrentUser переданы без сессии — отбор по своим лайкам и просмотрам требует авторизации',
  })
  findAll(@Query() query: NewsQueryDto, @Req() req: Request) {
    return this.newsService.findAll(query, req.user?.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ type: NewsDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  findOne(@Param('id') id: string, @Req() req: Request): Promise<NewsDto> {
    return this.newsService.findOne(id, req.user?.id);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: LikeResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  like(@Param('id') id: string, @Req() req: Request): Promise<LikeResponseDto> {
    return this.newsService.like(req.user!.id, id);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: LikeResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  unlike(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<LikeResponseDto> {
    return this.newsService.unlike(req.user!.id, id);
  }

  @Post(':id/view')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: ViewResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  markViewed(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ViewResponseDto> {
    return this.newsService.markViewed(req.user!.id, id);
  }
}
