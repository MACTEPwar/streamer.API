import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BCRYPT_SALT_ROUNDS } from './constants/password.constant';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserEntity } from './entities/user.entity';
import { PrismaUserWithProfile } from './types/prisma-user-with-profile.type';
import { UserWithProfile } from './types/user-with-profile.type';

const INVALID_CREDENTIALS_MESSAGE = 'Неверный логин или пароль';

@Injectable()
export class LocalAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto): Promise<UserWithProfile> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          role: 'USER',
          profile: { create: { name: dto.login } },
          settings: { create: {} },
          authMethods: {
            create: { type: 'LOCAL', identifier: dto.login, passwordHash },
          },
        },
        include: { profile: true, authMethods: true },
      });
      return this.toUserWithProfile(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Логин уже занят');
      }
      throw error;
    }
  }

  async validateCredentials(dto: LoginDto): Promise<UserWithProfile> {
    const authMethod = await this.prisma.authMethod.findUnique({
      where: { type_identifier: { type: 'LOCAL', identifier: dto.login } },
    });

    if (!authMethod || !authMethod.passwordHash) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      authMethod.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: authMethod.userId },
      include: { profile: true, authMethods: true },
    });

    return this.toUserWithProfile(user);
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
