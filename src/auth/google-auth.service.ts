import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { UserEntity } from './entities/user.entity';
import { PrismaUserWithProfile } from './types/prisma-user-with-profile.type';
import { UserWithProfile } from './types/user-with-profile.type';

const INVALID_TOKEN_MESSAGE = 'Невалидный или просроченный Google-токен';

@Injectable()
export class GoogleAuthService {
  private readonly client: OAuth2Client;
  private readonly googleClientId: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.googleClientId = config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    this.client = new OAuth2Client(this.googleClientId);
  }

  async authenticate(dto: GoogleAuthDto): Promise<UserWithProfile> {
    const payload = await this.verifyToken(dto.idToken);
    const googleId = payload.sub;

    const existingByGoogleId = await this.prisma.user.findUnique({
      where: { googleId },
      include: { profile: true },
    });
    if (existingByGoogleId) {
      return this.toUserWithProfile(existingByGoogleId);
    }

    if (payload.email && payload.email_verified) {
      const existingByEmail = await this.prisma.user.findFirst({
        where: { profile: { email: payload.email } },
        include: { profile: true },
      });
      if (existingByEmail) {
        const updated = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId },
          include: { profile: true },
        });
        return this.toUserWithProfile(updated);
      }
    }

    const created = await this.prisma.user.create({
      data: {
        login: googleId,
        googleId,
        role: 'USER',
        profile: { create: { email: payload.email } },
        settings: { create: {} },
      },
      include: { profile: true },
    });
    return this.toUserWithProfile(created);
  }

  private toUserWithProfile({
    profile,
    ...user
  }: PrismaUserWithProfile): UserWithProfile {
    return Object.assign(new UserEntity(user), { profile });
  }

  private async verifyToken(idToken: string) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) {
        throw new Error('Missing sub claim');
      }
      return payload;
    } catch {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }
  }
}
