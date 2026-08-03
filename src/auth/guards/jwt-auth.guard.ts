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
  constructor(protected readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No auth cookie provided');
    }

    const user = await this.verifyUser(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired auth cookie');
    }

    request.user = user;
    return true;
  }

  protected extractToken(request: Request): string | undefined {
    return (request.cookies as Record<string, string> | undefined)?.[
      AUTH_COOKIE_NAME
    ];
  }

  protected async verifyUser(
    token: string,
  ): Promise<Express.Request['user'] | undefined> {
    try {
      const payload = await this.authService.verifyToken(token);
      return { id: payload.sub, role: payload.role };
    } catch {
      return undefined;
    }
  }
}
