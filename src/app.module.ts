import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { RolesGuard } from './core/guards/roles.guard';
import { User, UserSchema } from './core/schemas/users.schema';
import { AuthModule } from './core/auth/auth.module';
import { UsersService } from './core/routes/users/users.service';
import { UsersController } from './core/routes/users/users.controller';
import { UsersRoutine } from './core/routines/users.routine';
import { TextureSprite, TextureSpriteSchema, TextureTile, TextureTileSchema } from './core/schemas/textures/textures.schema';
import { TexturesSpritesController } from './core/routes/textures/sprite/sprite.controller';
import { TexturesSpriteService } from './core/routes/textures/sprite/sprite.service';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.DATABASE_URL, { dbName: process.env.DEV === 'false' ? 'faithful' : 'faithful-dev' }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: TextureSprite.name, schema: TextureSpriteSchema, collection: 'textures' },
      { name: TextureTile.name, schema: TextureTileSchema, collection: 'textures' },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [UsersController, TexturesSpritesController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    UsersService,
    UsersRoutine,
    TexturesSpriteService,
  ],
})
export class AppModule {}
