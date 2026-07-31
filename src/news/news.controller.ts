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
import { ApiPaginatedResponse } from '../shared/decorators/api-paginated-response.decorator';
import { ErrorResponseDto } from '../shared/dto/error-response.dto';
import { PaginationQueryDto } from '../shared/dto/pagination-query.dto';
import { LikeResponseDto } from './dto/like-response.dto';
import { NewsDto } from './dto/news.dto';
import { NewsService } from './news.service';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiPaginatedResponse(NewsDto)
  findAll(@Query() query: PaginationQueryDto, @Req() req: Request) {
    return this.newsService.findAll(query, req.user?.id);
  }

  @Get(':id')
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
}
