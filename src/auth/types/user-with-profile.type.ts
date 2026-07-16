import { UserEntity } from '../entities/user.entity';

export type UserWithProfile = UserEntity & {
  profile: { email: string | null } | null;
};
