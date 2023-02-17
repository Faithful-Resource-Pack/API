import { Body, Controller, Get, HttpStatus, Param, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';
import { User } from 'src/core/schemas/users.schema';
import { ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from 'src/core/dto/users.dto';
import { HTTPException } from 'src/types';
import { Public } from 'src/core/decorators/public.decorator';

@ApiTags('Users')
@Controller({ path: 'users' })
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Post('/signup')
  async createUser(@Body() createUserDto: CreateUserDto): Promise<User> {
    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltOrRounds);
    const result = await this.userService.createUser(createUserDto.username, hashedPassword);

    return result;
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User | HTTPException> {
    return this.userService.findOne({ id }).catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }
}
