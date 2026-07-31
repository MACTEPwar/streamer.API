import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { CreateNewsDto } from '../../news/dto/create-news.dto';
import { NewsDto } from '../../news/dto/news.dto';
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
}
