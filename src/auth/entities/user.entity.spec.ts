import { Role } from '../../generated/prisma/enums';
import { UserEntity } from './user.entity';

describe('UserEntity', () => {
  it('assigns the given fields via the constructor', () => {
    const entity = new UserEntity({
      id: 'user-1',
      role: Role.USER,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    });

    expect(entity).toMatchObject({
      id: 'user-1',
      role: Role.USER,
    });
  });
});
