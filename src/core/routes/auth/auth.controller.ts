import { Controller, Post, UseGuards, Body, Param, Get, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '../../dto/users.dto';
import { UsersService } from '../users/users.service';
import { Public } from '../../decorators/public.decorator';
import { User } from 'src/core/schemas/users.schema';
import * as bcrypt from 'bcrypt';
import { HTTPException } from 'src/types';

@ApiTags('Authentication')
@Controller({ path: 'auth' })
export class AuthController {
  constructor(private authService: AuthService, private usersService: UsersService) {}

  //#region POST /auth/register
  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Register a new user',
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'The user to create',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Operation successful, the user has been created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Operation failed, either one or multiple credentials values are invalid or are already used',
  })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<User | HTTPException> {
    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltOrRounds);
    const result = await this.usersService.createUser({ ...createUserDto, password: hashedPassword });

    return result;
  }
  //#endregion

  //#region POST /auth/login
  @Post('login')
  @Public()
  @UseGuards(AuthGuard('local'))
  @ApiOperation({
    summary: 'Login a user',
    description: 'Login a user',
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'The user to login',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Operation successful',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Operation failed, either one or multiple credentials values are invalid',
  })
  async login(@Body() createUserDto: CreateUserDto): Promise<{ access_token: string }> {
    const res = await this.usersService.findOne({ username: createUserDto.username });
    return this.authService.login({ ...res, ...createUserDto });
  }
  //#endregion

  //#region GET /auth/verify/:id/:token
  @Get('verify/:id/:token')
  @Public()
  @ApiOperation({
    summary: 'Verify a user',
    description: 'Verify a user using its UUID and the token sent by email',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the user',
    type: String,
  })
  @ApiParam({
    name: 'token',
    description: 'The token associated to the user, sent by email',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Operation successful',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Operation failed, either the user does not exist or the token is invalid',
  })
  async verify(@Param('id') id: string, @Param('token') token: string): Promise<HTTPException> {
    if (await this.authService.verify(id, token)) {
      return { message: 'User verified, you can now close this window', status: HttpStatus.OK };
    }

    return {
      message: 'User cannot be verified, check if the user exist and if the token is valid',
      status: HttpStatus.BAD_REQUEST,
    };
  }
  //#endregion
}
