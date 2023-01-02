import { Module } from '@nestjs/common';
import { TexturesController } from './textures.controller';
import { TexturesService } from './textures.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TextureSchema } from 'src/schemas/texture.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Texture', schema: TextureSchema }]),
  ],
  controllers: [TexturesController],
  providers: [TexturesService],
  exports: [TexturesService],
})
export class TexturesModule {}
