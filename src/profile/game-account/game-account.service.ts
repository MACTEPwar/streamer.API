import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GameAccount } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGameAccountDto } from './dto/create-game-account.dto';
import { UpdateGameAccountDto } from './dto/update-game-account.dto';

@Injectable()
export class GameAccountService {
  constructor(private readonly prisma: PrismaService) {}

  findAllByUserId(userId: string): Promise<GameAccount[]> {
    return this.prisma.gameAccount.findMany({ where: { userId } });
  }

  create(userId: string, dto: CreateGameAccountDto): Promise<GameAccount> {
    return this.prisma.gameAccount.create({ data: { ...dto, userId } });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateGameAccountDto,
  ): Promise<GameAccount> {
    await this.assertOwnership(userId, id);

    return this.prisma.gameAccount.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string): Promise<GameAccount> {
    await this.assertOwnership(userId, id);

    return this.prisma.gameAccount.delete({ where: { id } });
  }

  private async assertOwnership(userId: string, id: string): Promise<void> {
    const gameAccount = await this.prisma.gameAccount.findUnique({
      where: { id },
    });

    if (!gameAccount) {
      throw new NotFoundException('Game account not found');
    }

    if (gameAccount.userId !== userId) {
      throw new ForbiddenException('Not the owner of this game account');
    }
  }
}
