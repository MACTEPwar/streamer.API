import { Exclude } from 'class-transformer';
import { Role } from '../../generated/prisma/enums';

/**
 * Обёртка над результатом Prisma `User` в виде настоящего класса —
 * `ClassSerializerInterceptor` применяет `@Exclude()` только к экземплярам
 * класса, а не к обычным объектам, которые возвращает Prisma Client.
 */
export class UserEntity {
  id: string;
  login: string;
  role: Role;
  provider: string | null;
  createdAt: Date;
  updatedAt: Date;

  @Exclude()
  passwordHash: string | null;

  @Exclude()
  googleId: string | null;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
