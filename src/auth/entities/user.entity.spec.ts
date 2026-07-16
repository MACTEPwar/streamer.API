import { instanceToPlain } from 'class-transformer';
import { Role } from '../../generated/prisma/enums';
import { UserEntity } from './user.entity';

describe('UserEntity', () => {
  it('excludes passwordHash and googleId on serialization', () => {
    const entity = new UserEntity({
      id: 'user-1',
      login: 'johndoe',
      role: Role.USER,
      provider: 'google',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      passwordHash: '$2b$10$hashedpassword',
      googleId: 'google-sub-123',
    });

    const plain = instanceToPlain(entity);

    expect(plain).not.toHaveProperty('passwordHash');
    expect(plain).not.toHaveProperty('googleId');
    expect(plain).toMatchObject({
      id: 'user-1',
      login: 'johndoe',
      role: Role.USER,
      provider: 'google',
    });
  });
});
