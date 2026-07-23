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
import { CreateGameAccountDto } from './dto/create-game-account.dto';
import { GameAccountDto } from './dto/game-account.dto';
import { UpdateGameAccountDto } from './dto/update-game-account.dto';
import { GameAccountService } from './game-account.service';

@ApiTags('profile')
@UseGuards(JwtAuthGuard)
@Controller('profile/game-accounts')
export class GameAccountController {
  constructor(private readonly gameAccountService: GameAccountService) {}

  @Get()
  @ApiOkResponse({ type: GameAccountDto, isArray: true })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  findAll(@Req() req: Request): Promise<GameAccountDto[]> {
    return this.gameAccountService.findAllByUserId(req.user!.id);
  }

  @Post()
  @ApiOkResponse({ type: GameAccountDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  create(
    @Req() req: Request,
    @Body() dto: CreateGameAccountDto,
  ): Promise<GameAccountDto> {
    return this.gameAccountService.create(req.user!.id, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: GameAccountDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateGameAccountDto,
  ): Promise<GameAccountDto> {
    return this.gameAccountService.update(req.user!.id, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: GameAccountDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  remove(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<GameAccountDto> {
    return this.gameAccountService.remove(req.user!.id, id);
  }
}
