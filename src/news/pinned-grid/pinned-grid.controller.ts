import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';
import { PinnedGridLayoutDto } from './dto/pinned-grid-layout.dto';
import { parsePinnedGridViewport } from './pinned-grid-viewport.util';
import { PinnedGridService } from './pinned-grid.service';

@ApiTags('news/pinned-layout')
@Controller('news/pinned-layout')
export class PinnedGridController {
  constructor(private readonly pinnedGridService: PinnedGridService) {}

  @Get(':viewport')
  @ApiOkResponse({ type: PinnedGridLayoutDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  getLayout(@Param('viewport') viewport: string): Promise<PinnedGridLayoutDto> {
    return this.pinnedGridService.getLayout(parsePinnedGridViewport(viewport));
  }
}
