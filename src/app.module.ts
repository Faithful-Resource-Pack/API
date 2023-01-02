import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { TexturesModule } from './textures/textures.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.DATABASE_URL, {
      dbName: process.env.DEV === 'false' ? 'faithful' : 'faithful-dev',
    }),
    TexturesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
