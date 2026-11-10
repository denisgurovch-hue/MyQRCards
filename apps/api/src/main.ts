import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'readyz', method: RequestMethod.GET }],
  });

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
