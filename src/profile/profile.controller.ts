import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ErrorResponseDto } from '../shared/dto/error-response.dto';
import { ProfileDto } from './dto/profile.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOkResponse({ type: ProfileDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  getOwnProfile(@Req() req: Request): Promise<ProfileDto> {
    return this.profileService.findByUserId(req.user!.id);
  }

  @Patch()
  @ApiOkResponse({ type: ProfileDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  updateOwnProfile(
    @Req() req: Request,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    return this.profileService.update(req.user!.id, dto);
  }

  @Patch('avatar')
  @ApiOkResponse({ type: ProfileDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  updateOwnAvatar(
    @Req() req: Request,
    @Body() dto: UpdateAvatarDto,
  ): Promise<ProfileDto> {
    return this.profileService.updateAvatar(req.user!.id, dto);
  }
}
