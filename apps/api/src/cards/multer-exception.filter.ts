import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';
import { AppError } from '../common/errors/app-error';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const error = new AppError(
      'VALIDATION_ERROR',
      exception.code === 'LIMIT_FILE_SIZE'
        ? 'Файл должен быть изображением JPEG, PNG или WebP размером до 5 MB'
        : 'Некорректный файл загрузки',
      HttpStatus.BAD_REQUEST,
    );
    const body = error.getResponse();
    res.status(error.getStatus()).json(body);
  }
}
