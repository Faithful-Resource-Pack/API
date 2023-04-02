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
import { TextureTile, TextureTileSchema } from './core/schemas/textures/texture/tile.schema';
import { TexturesSpritesController } from './core/routes/textures/sprite/sprite.controller';
import { TexturesSpritesService } from './core/routes/textures/sprite/sprite.service';
import { TexturesTilesController } from './core/routes/textures/tile/tile.controller';
import { TexturesTilesService } from './core/routes/textures/tile/tile.service';
import { TextureSprite, TextureSpriteSchema } from './core/schemas/textures/texture/sprite.schema';
import { TexturesAtlasController } from './core/routes/textures/atlas/atlas.controller';
import { TexturesAtlasService } from './core/routes/textures/atlas/atlas.service';
import { TextureAtlas, TextureAtlasSchema } from './core/schemas/textures/texture/atlas.schema';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.DATABASE_URL, { dbName: process.env.DEV === 'false' ? 'faithful' : 'faithful-dev' }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: TextureSprite.name, schema: TextureSpriteSchema, collection: 'textures' },
      { name: TextureTile.name, schema: TextureTileSchema, collection: 'textures' },
      { name: TextureAtlas.name, schema: TextureAtlasSchema, collection: 'textures' },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [UsersController, TexturesSpritesController, TexturesTilesController, TexturesAtlasController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    UsersService,
    UsersRoutine,
    TexturesSpritesService,
    TexturesTilesService,
    TexturesAtlasService,
  ],
})
export class AppModule {}
