import { Role } from '../../generated/prisma/enums';

/**
 * Обёртка над результатом Prisma `User` в виде настоящего класса —
 * `ClassSerializerInterceptor` применяет `@Exclude()`/`@Expose()` только к
 * экземплярам класса, а не к обычным объектам, которые возвращает Prisma
 * Client. Начиная с #63 `User` больше не хранит чувствительные поля
 * (`passwordHash`/`googleId` переехали в `AuthMethod`), поэтому здесь нет
 * `@Exclude()` — все поля этого класса безопасны для прямой сериализации.
 */
export class UserEntity {
  id: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
