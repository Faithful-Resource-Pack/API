import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { Pack, PackSchema } from './core/schemas/packs.schema';
import { PacksController } from './core/routes/packs/packs.controller';
import { PacksService } from './core/routes/packs/packs.service';
import { TexturesController } from './core/routes/textures/textures.controller';
import { TexturesService } from './core/routes/textures/textures.service';
import { Texture, TextureSchema } from './core/schemas/texture.schema';
import { RolesGuard } from './core/guards/roles.guard';
import { User, UserSchema } from './core/schemas/users.schema';
import { AuthModule } from './core/auth/auth.module';
import { UsersService } from './core/routes/users/users.service';
import { UsersController } from './core/routes/users/users.controller';
import { UsersRoutine } from './core/routines/users.routine';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.DATABASE_URL, { dbName: process.env.DEV === 'false' ? 'faithful' : 'faithful-dev' }),
    MongooseModule.forFeature([
      { name: Pack.name, schema: PackSchema },
      { name: Texture.name, schema: TextureSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [PacksController, TexturesController, UsersController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    PacksService,
    TexturesService,
    UsersService,
    UsersRoutine,
  ],
})
export class AppModule {}
