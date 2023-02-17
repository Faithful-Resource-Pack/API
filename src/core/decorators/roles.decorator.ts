import { SetMetadata } from '@nestjs/common';

export enum ROLES {
  ADMIN = 'Admin',
  DEVELOPER = 'Developer',
  USER = 'User',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ROLES[]) => SetMetadata(ROLES_KEY, roles);
