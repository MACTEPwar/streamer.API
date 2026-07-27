import { AuthMethodType } from '../../generated/prisma/enums';
import { UserEntity } from '../entities/user.entity';

export type UserWithProfile = UserEntity & {
  profile: { name: string | null; avatarUrl: string | null } | null;
  authMethods: { type: AuthMethodType }[];
};
