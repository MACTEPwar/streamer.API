import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
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
    const payload = await this.verifyIdToken(dto.idToken);
    const googleId = payload.sub;

    const existing = await this.prisma.authMethod.findUnique({
      where: { type_identifier: { type: 'GOOGLE', identifier: googleId } },
    });

    if (existing) {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: existing.userId },
        include: { profile: true, authMethods: true },
      });
      return this.toUserWithProfile(user);
    }

    const created = await this.prisma.user.create({
      data: {
        role: 'USER',
        profile: {
          create: { name: payload.name, avatarUrl: payload.picture },
        },
        settings: { create: {} },
        authMethods: { create: { type: 'GOOGLE', identifier: googleId } },
        ...(payload.email && {
          socialLinks: { create: { type: 'EMAIL', value: payload.email } },
        }),
      },
      include: { profile: true, authMethods: true },
    });
    return this.toUserWithProfile(created);
  }

  /**
   * Публичный, т.к. переиспользуется `AuthMethodsService` (`POST
   * /auth/methods/google`) — верификация ID-токена одна на оба места, не
   * дублируется.
   */
  async verifyIdToken(idToken: string): Promise<TokenPayload> {
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

  private toUserWithProfile({
    profile,
    authMethods,
    ...user
  }: PrismaUserWithProfile): UserWithProfile {
    return Object.assign(new UserEntity(user), {
      profile,
      authMethods: authMethods.map(({ type }) => ({ type })),
    });
  }
}
