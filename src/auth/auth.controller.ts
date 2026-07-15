import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorResponseDto } from '../shared/dto/error-response.dto';
import { AuthService } from './auth.service';
import { UserMeDto } from './dto/user-me.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOkResponse({ type: UserMeDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async me(@Req() req: Request): Promise<UserMeDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      include: { profile: true },
    });

    return {
      id: user.id,
      login: user.login,
      role: user.role,
      email: user.profile?.email ?? null,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { example: { success: true } } })
  logout(@Res({ passthrough: true }) res: Response): { success: true } {
    this.authService.clearAuthCookie(res);
    return { success: true };
  }
}
