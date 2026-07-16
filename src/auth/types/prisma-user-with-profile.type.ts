import { Prisma } from '../../generated/prisma/client';

/**
 * Raw shape returned by Prisma Client (`include: { profile: true }`) —
 * distinct from `UserWithProfile`, which wraps this in `UserEntity` for
 * safe serialization once it leaves the service layer.
 */
export type PrismaUserWithProfile = Prisma.UserGetPayload<{
  include: { profile: true };
}>;
