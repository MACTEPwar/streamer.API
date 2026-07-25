import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from '../../../generated/prisma/enums';
import { UpdateUserRoleDto } from './update-user-role.dto';

describe('UpdateUserRoleDto', () => {
  it('passes validation with USER', async () => {
    const dto = plainToInstance(UpdateUserRoleDto, { role: Role.USER });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes validation with ADMIN', async () => {
    const dto = plainToInstance(UpdateUserRoleDto, { role: Role.ADMIN });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation with MODERATOR', async () => {
    const dto = plainToInstance(UpdateUserRoleDto, { role: Role.MODERATOR });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'role')).toBe(true);
  });

  it('fails validation with an arbitrary value', async () => {
    const dto = plainToInstance(UpdateUserRoleDto, { role: 'SUPERADMIN' });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'role')).toBe(true);
  });
});
