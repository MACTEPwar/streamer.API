import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserEntity } from '../../auth/entities/user.entity';
import { Role } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../shared/dto/pagination-query.dto';
import { buildPaginationMeta } from '../../shared/pagination/paginate';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder } : undefined,
      }),
      this.prisma.user.count(),
    ]);

    return {
      items: users.map((user) => new UserEntity(user)),
      meta: buildPaginationMeta(query.page, query.limit, total),
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
