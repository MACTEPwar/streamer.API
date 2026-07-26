import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserEntity } from '../../auth/entities/user.entity';
import { Role } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta } from '../../shared/pagination/paginate';
import { AdminUserDetailDto } from './dto/admin-user-detail.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AdminUsersQueryDto) {
    const where = {
      ...(query.login && { login: { contains: query.login } }),
      ...(query.role && { role: query.role }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder } : undefined,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((user) => new UserEntity(user)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findOne(id: string): Promise<AdminUserDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, gameAccounts: true, socialLinks: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return {
      id: user.id,
      login: user.login,
      role: user.role,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      email: user.profile?.email ?? null,
      name: user.profile?.name ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
      gameAccounts: user.gameAccounts,
      socialLinks: user.socialLinks,
    };
  }

  async updateRole(
    currentUserId: string,
    id: string,
    role: Role,
  ): Promise<UserEntity> {
    this.assertNotSelf(currentUserId, id);
    await this.findUserOrThrow(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { role },
    });

    return new UserEntity(user);
  }

  async remove(currentUserId: string, id: string): Promise<UserEntity> {
    this.assertNotSelf(currentUserId, id);
    await this.findUserOrThrow(id);

    const user = await this.prisma.user.delete({ where: { id } });

    return new UserEntity(user);
  }

  private assertNotSelf(currentUserId: string, id: string): void {
    if (currentUserId === id) {
      throw new ForbiddenException(
        'Нельзя изменить роль или удалить самого себя',
      );
    }
  }

  private async findUserOrThrow(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
  }
}
