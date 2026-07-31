import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { CreateNewsTagDto } from '../../news/news-tag/dto/create-news-tag.dto';
import { NewsTagDto } from '../../news/news-tag/dto/news-tag.dto';
import { UpdateNewsTagDto } from '../../news/news-tag/dto/update-news-tag.dto';
import { NewsTagService } from '../../news/news-tag/news-tag.service';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';

@ApiTags('admin/news-tags')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/news-tags')
export class AdminNewsTagsController {
  constructor(private readonly newsTagService: NewsTagService) {}

  @Post()
  @ApiOkResponse({ type: NewsTagDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  create(@Body() dto: CreateNewsTagDto): Promise<NewsTagDto> {
    return this.newsTagService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: NewsTagDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNewsTagDto,
  ): Promise<NewsTagDto> {
    return this.newsTagService.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: NewsTagDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  remove(@Param('id') id: string): Promise<NewsTagDto> {
    return this.newsTagService.remove(id);
  }
}
