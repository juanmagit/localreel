import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users.service';
import { ADMIN_ONLY_KEY } from '../decorators/user.decorator';
import { USER_ID_HEADER } from '@shared/types';

@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = (request.headers[USER_ID_HEADER] || request.query?.userId) as string;

    if (!userId) {
      throw new UnauthorizedException(`Identificación de usuario requerida (cabecera ${USER_ID_HEADER} ausente).`);
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('El usuario especificado no existe.');
    }

    request.user = user;

    const isAdminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isAdminOnly && user.role !== 'admin') {
      throw new ForbiddenException('Acceso denegado: se requieren permisos de administrador.');
    }

    return true;
  }
}
