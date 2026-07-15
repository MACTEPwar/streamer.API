import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { AUTH_COOKIE_NAME } from '../constants/auth-cookie.constant';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = (request.cookies as Record<string, string> | undefined)?.[
      AUTH_COOKIE_NAME
    ];

    if (!token) {
      throw new UnauthorizedException('No auth cookie provided');
    }

    try {
      const payload = await this.authService.verifyToken(token);
      request.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired auth cookie');
    }
  }
}
