import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GameAccountDto } from '../../../profile/game-account/dto/game-account.dto';
import { SocialLinkDto } from '../../../profile/social-link/dto/social-link.dto';
import { AdminUserDto } from './admin-user.dto';

export class AdminUserDetailDto extends AdminUserDto {
  @ApiPropertyOptional({ example: 'user@example.com', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ example: 'John Doe', nullable: true })
  name: string | null;

  @ApiPropertyOptional({ example: '/uploads/avatar.png', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ type: [GameAccountDto] })
  gameAccounts: GameAccountDto[];

  @ApiProperty({ type: [SocialLinkDto] })
  socialLinks: SocialLinkDto[];
}
