import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorResponseDto } from '../shared/dto/error-response.dto';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserMeDto } from './dto/user-me.dto';
import { UserEntity } from './entities/user.entity';
import { GoogleAuthService } from './google-auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthService } from './local-auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly localAuthService: LocalAuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @ApiCreatedResponse({ type: UserMeDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  @ApiResponse({ status: 429, type: ErrorResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserMeDto> {
    const user = await this.localAuthService.register(dto);
    const token = this.authService.issueToken({
      sub: user.id,
      role: user.role,
    });
    this.authService.setAuthCookie(res, token);

    return this.toUserMeDto(user);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOkResponse({ type: UserMeDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 429, type: ErrorResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserMeDto> {
    const user = await this.localAuthService.validateCredentials(dto);
    const token = this.authService.issueToken({
      sub: user.id,
      role: user.role,
    });
    this.authService.setAuthCookie(res, token);

    return this.toUserMeDto(user);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UserMeDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async google(
    @Body() dto: GoogleAuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserMeDto> {
    const user = await this.googleAuthService.authenticate(dto);
    const token = this.authService.issueToken({
      sub: user.id,
      role: user.role,
    });
    this.authService.setAuthCookie(res, token);

    return this.toUserMeDto(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOkResponse({ type: UserMeDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async me(@Req() req: Request): Promise<UserMeDto> {
    const { profile, ...raw } = await this.prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      include: { profile: true },
    });
    const user = Object.assign(new UserEntity(raw), { profile });

    return this.toUserMeDto(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { example: { success: true } } })
  logout(@Res({ passthrough: true }) res: Response): { success: true } {
    this.authService.clearAuthCookie(res);
    return { success: true };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ schema: { example: { success: true } } })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async changePassword(
    @Req() req: Request,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ success: true }> {
    await this.localAuthService.changePassword(req.user!.id, dto);
    return { success: true };
  }

  private toUserMeDto(user: {
    id: string;
    login: string;
    role: UserMeDto['role'];
    profile: { email: string | null } | null;
  }): UserMeDto {
    return {
      id: user.id,
      login: user.login,
      role: user.role,
      email: user.profile?.email ?? null,
    };
  }
}
