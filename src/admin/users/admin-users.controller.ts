import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserEntity } from '../../auth/entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';
import { ApiPaginatedResponse } from '../../shared/decorators/api-paginated-response.decorator';
import { AdminUsersService } from './admin-users.service';
import { AdminUserDetailDto } from './dto/admin-user-detail.dto';
import { AdminUserDto } from './dto/admin-user.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@ApiTags('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiPaginatedResponse(AdminUserDto)
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  findAll(@Query() query: AdminUsersQueryDto) {
    return this.adminUsersService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: AdminUserDetailDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  findOne(@Param('id') id: string): Promise<AdminUserDetailDto> {
    return this.adminUsersService.findOne(id);
  }

  @Patch(':id/role')
  @ApiOkResponse({ type: AdminUserDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  updateRole(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserEntity> {
    return this.adminUsersService.updateRole(req.user!.id, id, dto.role);
  }

  @Delete(':id')
  @ApiOkResponse({ type: AdminUserDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  remove(@Req() req: Request, @Param('id') id: string): Promise<UserEntity> {
    return this.adminUsersService.remove(req.user!.id, id);
  }
}
