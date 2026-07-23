import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GameAccountController } from './game-account/game-account.controller';
import { GameAccountService } from './game-account/game-account.service';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { SocialLinkController } from './social-link/social-link.controller';
import { SocialLinkService } from './social-link/social-link.service';

@Module({
  imports: [AuthModule],
  controllers: [ProfileController, GameAccountController, SocialLinkController],
  providers: [ProfileService, GameAccountService, SocialLinkService],
})
export class ProfileModule {}
