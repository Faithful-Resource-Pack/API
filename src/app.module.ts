import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Pack, PackSchema } from './schemas/packs.schema';
import { PacksController } from './routes/packs/packs.controller';
import { PacksService } from './routes/packs/packs.service';
import { TexturesController } from './routes/textures/textures.controller';
import { TexturesService } from './routes/textures/textures.service';
import { Texture, TextureSchema } from './schemas/texture.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.DATABASE_URL, { dbName: process.env.DEV === 'false' ? 'faithful' : 'faithful-dev' }),
    MongooseModule.forFeature([
      { name: Pack.name, schema: PackSchema },
      { name: Texture.name, schema: TextureSchema },
    ]),
  ],
  controllers: [PacksController, TexturesController],
  providers: [PacksService, TexturesService],
})
export class AppModule {}
