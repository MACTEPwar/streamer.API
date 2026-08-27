import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { CreateNewsDto } from '../../news/dto/create-news.dto';
import { NewsDto } from '../../news/dto/news.dto';
import { NewsImageDto } from '../../news/dto/news-image.dto';
import { UpdateNewsDto } from '../../news/dto/update-news.dto';
import { UpdateNewsImageFocalPointDto } from '../../news/dto/update-news-image-focal-point.dto';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';
import { AdminNewsService } from './admin-news.service';

@ApiTags('admin/news')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/news')
export class AdminNewsController {
  constructor(private readonly adminNewsService: AdminNewsService) {}

  @Post()
  @ApiCreatedResponse({ type: NewsDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  create(@Body() dto: CreateNewsDto): Promise<NewsDto> {
    return this.adminNewsService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: NewsDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNewsDto,
  ): Promise<NewsDto> {
    return this.adminNewsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: NewsDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  remove(@Param('id') id: string): Promise<NewsDto> {
    return this.adminNewsService.remove(id);
  }

  @Patch(':id/cover/focal-point')
  @ApiOkResponse({ type: NewsDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  updateCoverFocalPoint(
    @Param('id') id: string,
    @Body() dto: UpdateNewsImageFocalPointDto,
  ): Promise<NewsDto> {
    return this.adminNewsService.updateCoverFocalPoint(id, dto);
  }

  @Patch('images/:id/focal-point')
  @ApiOkResponse({ type: NewsImageDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  updateImageFocalPoint(
    @Param('id') id: string,
    @Body() dto: UpdateNewsImageFocalPointDto,
  ): Promise<NewsImageDto> {
    return this.adminNewsService.updateImageFocalPoint(id, dto);
  }
}
