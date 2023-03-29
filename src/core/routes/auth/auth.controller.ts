import { Controller, Post, UseGuards, Body, Param, Get, HttpStatus, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '../../dto/users.dto';
import { UsersService } from '../users/users.service';
import { Public } from '../../decorators/public.decorator';
import { User } from 'src/core/schemas/users.schema';
import { HTTPException } from 'src/types';
import * as bcrypt from 'bcrypt';

@ApiTags('Authentication')
@Controller({ path: 'auth' })
export class AuthController {
  constructor(private authService: AuthService, private usersService: UsersService) {}

  //#region POST /auth/register/:redirect
  @Post('register/:redirect')
  @Public()
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Register a new user',
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'The user to create',
  })
  @ApiParam({
    name: 'redirect',
    description: 'The redirect url to send to the user back after the verification',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Operation successful, the user has been created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Operation failed, either one or multiple credentials values are invalid or are already used',
  })
  async createUser(@Body() createUserDto: CreateUserDto, @Param('redirect') redirect: string): Promise<User | HTTPException> {
    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltOrRounds);
    const result = await this.usersService.createUser({ ...createUserDto, password: hashedPassword }, redirect);

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
  async login(@Body() createUserDto: CreateUserDto): Promise<{ access_token: string } | HTTPException> {
    const res = await this.usersService.findOne({ username: createUserDto.username });

    if (res.isVerified === false)
      return {
        message: 'User is not yet verified, please verify your account with the url sent by email first',
        status: HttpStatus.UNAUTHORIZED,
      };

    return this.authService.login({ ...res, ...createUserDto });
  }
  //#endregion

  //#region GET /auth/verify/:id/:token
  @Get('verify/:id/:token/:redirect')
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
  @ApiParam({
    name: 'redirect',
    description: 'The redirect url to send to the user back after the verification',
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
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Operation successful, the user has been verified and the redirect url has been sent back',
  })
  async verify(
    @Res() res: any,
    @Param('id') id: string,
    @Param('token') token: string,
    @Param('redirect') redirect?: string,
  ): Promise<HTTPException | void> {
    this.authService.verify(id, token).then((result) => {
      if (result) {
        if (redirect) return res.redirect(decodeURI(redirect));
        return { message: 'User verified, you can now close this window', status: HttpStatus.OK };
      }

      return {
        message: 'User cannot be verified, check if the user exist and if the token is valid',
        status: HttpStatus.BAD_REQUEST,
      };
    });
  }
  //#endregion
}
