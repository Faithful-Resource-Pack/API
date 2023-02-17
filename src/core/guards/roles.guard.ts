import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES, ROLES_KEY } from '../decorators/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { jwtConstants } from '../auth/constants';
import * as jwt from 'jsonwebtoken';
import { UsersService } from '../routes/users/users.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector, private readonly usersService: UsersService) {
    super();
  }

  /**
   * Check if the user has sent a valid token and if the user has the required role
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<ROLES[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles) {
      return super.canActivate(context) && true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');

    // No token given
    if (!token) return false;

    // Roles check
    try {
      const { username } = jwt.verify(token, jwtConstants.secret);
      console.log((await this.usersService.findOne({ username })).roles);
      return (await this.usersService.findOne({ username })).roles.some((role) => requiredRoles.includes(role));
    } catch (err) {
      return false;
    }
  }
}
