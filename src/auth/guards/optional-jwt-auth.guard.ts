import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      return true;
    }

    const user = await this.verifyUser(token);

    if (user) {
      request.user = user;
    }

    return true;
  }
}
