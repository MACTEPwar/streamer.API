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
import { UserWithProfile } from './types/user-with-profile.type';

const INVALID_CREDENTIALS_MESSAGE = 'Неверный логин или пароль';

@Injectable()
export class LocalAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto): Promise<UserWithProfile> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    try {
      return await this.prisma.user.create({
        data: {
          login: dto.login,
          passwordHash,
          role: 'USER',
          profile: { create: {} },
          settings: { create: {} },
        },
        include: { profile: true },
      });
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
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
      include: { profile: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return user;
  }
}
