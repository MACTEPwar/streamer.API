import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GameAccountController } from './game-account/game-account.controller';
import { GameAccountService } from './game-account/game-account.service';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [AuthModule],
  controllers: [ProfileController, GameAccountController],
  providers: [ProfileService, GameAccountService],
})
export class ProfileModule {}
