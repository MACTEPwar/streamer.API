import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import { AuthMethodType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { BCRYPT_SALT_ROUNDS } from '../constants/password.constant';
import { GoogleAuthDto } from '../dto/google-auth.dto';
import { GoogleAuthService } from '../google-auth.service';
import { AddLocalMethodDto } from './dto/add-local-method.dto';
import { ChangeLocalPasswordDto } from './dto/change-local-password.dto';

const INVALID_CURRENT_PASSWORD_MESSAGE = 'Неверный текущий пароль';

@Injectable()
export class AuthMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  findAll(
    userId: string,
  ): Promise<{ type: AuthMethodType; identifier: string }[]> {
    return this.prisma.authMethod.findMany({
      where: { userId },
      select: { type: true, identifier: true },
    });
  }

  async addLocal(userId: string, dto: AddLocalMethodDto): Promise<void> {
    const existing = await this.prisma.authMethod.findFirst({
      where: { userId, type: 'LOCAL' },
    });

    if (existing) {
      throw new ConflictException('У аккаунта уже есть локальный метод входа');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    try {
      await this.prisma.authMethod.create({
        data: {
          userId,
          type: 'LOCAL',
          identifier: dto.login,
          passwordHash,
        },
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

  async changeLocalPassword(
    userId: string,
    dto: ChangeLocalPasswordDto,
  ): Promise<void> {
    const method = await this.prisma.authMethod.findFirst({
      where: { userId, type: 'LOCAL' },
    });

    if (!method || !method.passwordHash) {
      throw new BadRequestException('У аккаунта нет локального метода входа');
    }

    const passwordMatches = await bcrypt.compare(
      dto.currentPassword,
      method.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CURRENT_PASSWORD_MESSAGE);
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);

    await this.prisma.authMethod.update({
      where: { id: method.id },
      data: { passwordHash },
    });
  }

  async addGoogle(userId: string, dto: GoogleAuthDto): Promise<void> {
    const payload = await this.googleAuthService.verifyIdToken(dto.idToken);
    const googleId = payload.sub;

    const existingForUser = await this.prisma.authMethod.findFirst({
      where: { userId, type: 'GOOGLE' },
    });

    if (existingForUser) {
      throw new ConflictException('У аккаунта уже подключён Google');
    }

    const existingByGoogleId = await this.prisma.authMethod.findUnique({
      where: { type_identifier: { type: 'GOOGLE', identifier: googleId } },
    });

    if (existingByGoogleId) {
      throw new ConflictException(
        'Этот Google-аккаунт уже привязан к другому пользователю',
      );
    }

    await this.prisma.authMethod.create({
      data: { userId, type: 'GOOGLE', identifier: googleId },
    });
  }

  async remove(userId: string, type: AuthMethodType): Promise<void> {
    const method = await this.prisma.authMethod.findFirst({
      where: { userId, type },
    });

    if (!method) {
      throw new NotFoundException('Метод входа не найден');
    }

    const totalMethods = await this.prisma.authMethod.count({
      where: { userId },
    });

    if (totalMethods <= 1) {
      throw new ForbiddenException(
        'Нельзя отключить последний оставшийся метод входа',
      );
    }

    await this.prisma.authMethod.delete({ where: { id: method.id } });
  }
}
