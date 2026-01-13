import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from the decorator
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('User not found in request');
      throw new ForbiddenException('User not found in request');
    }

    const userRole = user.role || user.roles;

    if (!userRole) {
      this.logger.warn(`User ${user.id} has no role`);
      throw new ForbiddenException('User does not have a role');
    }

    // Check if user role is in the required roles
    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      this.logger.warn(
        `User ${user.id} with role '${userRole}' tried to access resource requiring roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `User role '${userRole}' does not have access to this resource. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
