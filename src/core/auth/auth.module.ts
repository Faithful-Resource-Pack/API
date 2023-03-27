import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/users.schema';
import { UsersService } from '../routes/users/users.service';
import { AuthService } from '../routes/auth/auth.service';
import { AuthController } from '../routes/auth/auth.controller';
import { JwtStrategy } from './jwt.auth';
import { LocalStrategy } from './local.auth';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.TOKEN_JWT,
      signOptions: { expiresIn: '7d' },
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [AuthService, UsersService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
