import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { AUTH_COOKIE_NAME } from '../constants/auth-cookie.constant';
import { Role } from '../../generated/prisma/enums';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  const createContext = (cookies?: Record<string, string>) => {
    const request = { cookies, user: undefined } as unknown as Request;

    return {
      context: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext,
      request,
    };
  };

  it('sets req.user and allows access when the cookie holds a valid token', async () => {
    const authService = {
      verifyToken: jest.fn().mockResolvedValue({ sub: 'u1', role: Role.USER }),
    } as unknown as AuthService;
    const guard = new OptionalJwtAuthGuard(authService);
    const { context, request } = createContext({
      [AUTH_COOKIE_NAME]: 'valid-token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', role: Role.USER });
  });

  it('allows access without setting req.user when there is no auth cookie', async () => {
    const verifyToken = jest.fn();
    const authService = { verifyToken } as unknown as AuthService;
    const guard = new OptionalJwtAuthGuard(authService);
    const { context, request } = createContext(undefined);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('allows access without setting req.user when the token is invalid or expired', async () => {
    const authService = {
      verifyToken: jest.fn().mockRejectedValue(new Error('invalid token')),
    } as unknown as AuthService;
    const guard = new OptionalJwtAuthGuard(authService);
    const { context, request } = createContext({
      [AUTH_COOKIE_NAME]: 'expired-token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });
});
