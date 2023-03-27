import { Controller, Delete, Get, HttpStatus, Param, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from 'src/core/schemas/users.schema';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { HTTPException } from 'src/types';
import { ROLES, Roles } from 'src/core/decorators/roles.decorator';

@ApiTags('Users')
@Controller({ path: 'users' })
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  //#region GET /:id
  @Get(':id')
  @ApiBearerAuth()
  @Roles(ROLES.ADMIN)
  @ApiOperation({
    summary: 'Get a user',
    description: 'Get all information about a user, from its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the user',
    required: true,
    type: String,
    allowEmptyValue: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The user has been found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'The user could not be found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'You are not authorized to access this resource',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'The user could not be found, the UUID may be invalid',
  })
  async findOne(@Param('id') id: string): Promise<User | HTTPException> {
    return this.userService
      .findOne({ _id: id })
      .then((user) => (user === null ? { message: 'User not found', status: HttpStatus.NOT_FOUND } : user))
      .catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }
  //#endregion

  //#region PUT /:id/roles/:role
  @Put(':id/roles/:role')
  @Roles(ROLES.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add a role from a user',
    description: 'Add a role from a user',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the user',
    required: true,
    type: String,
    allowEmptyValue: false,
  })
  @ApiParam({
    name: 'role',
    description: `The role to add, can be one of: ${Object.values(ROLES).join(', ')}`,
    required: true,
    type: String,
    allowEmptyValue: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The role has been added',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'The role could not be added, it may be invalid',
  })
  async updateRole(@Param('id') id: string, @Param('role') role: ROLES): Promise<User | HTTPException> {
    return this.userService.addRole(id, role).catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }
  //#endregion

  //#region DELETE /:id/roles/:role
  @Delete(':id/roles/:role')
  @Roles(ROLES.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove a role from a user',
    description: 'Remove a role from a user',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the user',
    required: true,
    type: String,
    allowEmptyValue: false,
  })
  @ApiParam({
    name: 'role',
    description: `The role to remove, can be one of: ${Object.values(ROLES).join(', ')}`,
    required: true,
    type: String,
    allowEmptyValue: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The role has been removed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'The role could not be removed, it may be invalid',
  })
  async deleteRole(@Param('id') id: string, @Param('role') role: ROLES): Promise<User | HTTPException> {
    return this.userService.deleteRole(id, role).catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }
  //#endregion

  //#region DELETE /:id
  @Delete(':id')
  @Roles(ROLES.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a user',
    description:
      'Delete a user from the database, other object will remain untouched, only the user is deleted, this action is irreversible',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the user',
    required: true,
    type: String,
    allowEmptyValue: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The user has been deleted',
  })
  async delete(@Param('id') id: string): Promise<User | HTTPException> {
    return this.userService.delete(id).catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }
  //#endregion
}
