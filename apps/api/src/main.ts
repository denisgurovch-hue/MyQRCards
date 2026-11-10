import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppError } from './common/errors/app-error';
import { HttpStatus } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new AppError(
          'VALIDATION_ERROR',
          'Request validation failed',
          HttpStatus.BAD_REQUEST,
          errors.map((error) => ({
            field: error.property,
            constraints: error.constraints,
          })),
        ),
    }),
  );

  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({
    origin: webOrigin,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'readyz', method: RequestMethod.GET }],
  });

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
