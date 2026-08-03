import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  AUTH_THROTTLE_LIMIT,
  AUTH_THROTTLE_TTL,
} from './constants/throttle.constant';
import { GoogleAuthService } from './google-auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { LocalAuthService } from './local-auth.service';
import { AuthMethodsController } from './methods/auth-methods.controller';
import { AuthMethodsService } from './methods/auth-methods.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>(
            'JWT_EXPIRES_IN',
          ) as SignOptions['expiresIn'],
        },
      }),
    }),
    ThrottlerModule.forRoot([
      { ttl: AUTH_THROTTLE_TTL, limit: AUTH_THROTTLE_LIMIT },
    ]),
  ],
  controllers: [AuthController, AuthMethodsController],
  providers: [
    AuthService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
    LocalAuthService,
    GoogleAuthService,
    AuthMethodsService,
    ThrottlerGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
    JwtModule,
  ],
})
export class AuthModule {}
