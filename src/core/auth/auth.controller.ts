import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '../dto/users.dto';
import { UsersService } from '../routes/users/users.service';
import { Public } from '../decorators/public.decorator';

@ApiTags('Authentication')
@Controller({ path: 'auth' })
export class AuthController {
  constructor(private authService: AuthService, private usersService: UsersService) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Body() createUserDto: CreateUserDto) {
    const res = this.usersService.findOne({ username: createUserDto.username });

    return this.authService.login({ ...res, ...createUserDto });
  }
}
