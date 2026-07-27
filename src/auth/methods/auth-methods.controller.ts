import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthMethodType } from '../../generated/prisma/enums';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';
import { GoogleAuthDto } from '../dto/google-auth.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthMethodsService } from './auth-methods.service';
import { AddLocalMethodDto } from './dto/add-local-method.dto';
import { AuthMethodDto } from './dto/auth-method.dto';
import { ChangeLocalPasswordDto } from './dto/change-local-password.dto';

@ApiTags('auth/methods')
@UseGuards(JwtAuthGuard)
@Controller('auth/methods')
export class AuthMethodsController {
  constructor(private readonly authMethodsService: AuthMethodsService) {}

  @Get()
  @ApiOkResponse({ type: [AuthMethodDto] })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  findAll(@Req() req: Request): Promise<AuthMethodDto[]> {
    return this.authMethodsService.findAll(req.user!.id);
  }

  @Post('local')
  @ApiOkResponse({ schema: { example: { success: true } } })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  async addLocal(
    @Req() req: Request,
    @Body() dto: AddLocalMethodDto,
  ): Promise<{ success: true }> {
    await this.authMethodsService.addLocal(req.user!.id, dto);
    return { success: true };
  }

  @Patch('local/password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { example: { success: true } } })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async changeLocalPassword(
    @Req() req: Request,
    @Body() dto: ChangeLocalPasswordDto,
  ): Promise<{ success: true }> {
    await this.authMethodsService.changeLocalPassword(req.user!.id, dto);
    return { success: true };
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { example: { success: true } } })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  async addGoogle(
    @Req() req: Request,
    @Body() dto: GoogleAuthDto,
  ): Promise<{ success: true }> {
    await this.authMethodsService.addGoogle(req.user!.id, dto);
    return { success: true };
  }

  @Delete(':type')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { example: { success: true } } })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async remove(
    @Req() req: Request,
    @Param('type', new ParseEnumPipe(AuthMethodType)) type: AuthMethodType,
  ): Promise<{ success: true }> {
    await this.authMethodsService.remove(req.user!.id, type);
    return { success: true };
  }
}
