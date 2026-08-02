import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { PinnedGridLayoutDto } from '../../news/pinned-grid/dto/pinned-grid-layout.dto';
import { UpdatePinnedGridLayoutDto } from '../../news/pinned-grid/dto/update-pinned-grid-layout.dto';
import { parsePinnedGridViewport } from '../../news/pinned-grid/pinned-grid-viewport.util';
import { PinnedGridService } from '../../news/pinned-grid/pinned-grid.service';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';

@ApiTags('admin/news/pinned-layout')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/news/pinned-layout')
export class AdminPinnedGridController {
  constructor(private readonly pinnedGridService: PinnedGridService) {}

  @Put(':viewport')
  @ApiOkResponse({ type: PinnedGridLayoutDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  updateLayout(
    @Param('viewport') viewport: string,
    @Body() dto: UpdatePinnedGridLayoutDto,
  ): Promise<PinnedGridLayoutDto> {
    return this.pinnedGridService.updateLayout(
      parsePinnedGridViewport(viewport),
      dto,
    );
  }
}
