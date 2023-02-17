import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Faithful API')
    .setDescription('An API for Faithful Resource Pack textures, add-ons and more')
    .setVersion('3.0.0')
    .addBearerAuth()
    .build();

  const options: SwaggerCustomOptions = {
    customCssUrl: '/custom.css',
    customJs: '/custom.js',
    customSiteTitle: 'Faithful API',
    customfavIcon: 'https://database.faithfulpack.net/images/branding/site/favicon.ico',
  };

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, options);

  app.useStaticAssets('public');

  await app.listen(3000);
  console.log(`Application is running on: http://localhost:3000/docs`);
}

bootstrap();
