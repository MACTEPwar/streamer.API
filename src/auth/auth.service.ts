import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { Role } from '../generated/prisma/enums';
import { AUTH_COOKIE_NAME } from './constants/auth-cookie.constant';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  issueToken(payload: { sub: string; role: Role }): string {
    return this.jwtService.sign(payload);
  }

  setAuthCookie(res: Response, token: string): void {
    const { exp } = this.jwtService.decode<JwtPayload>(token);
    const maxAge = exp !== undefined ? exp * 1000 - Date.now() : undefined;

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge,
    });
  }

  clearAuthCookie(res: Response): void {
    res.clearCookie(AUTH_COOKIE_NAME);
  }

  verifyToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }
}
