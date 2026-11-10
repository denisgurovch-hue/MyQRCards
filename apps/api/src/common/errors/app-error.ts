import { HttpException, HttpStatus } from '@nestjs/common';

export type ErrorBody = {
  error: {
    code: string;
    message: string;
    details: unknown;
  };
};

export class AppError extends HttpException {
  constructor(
    code: string,
    message: string,
    status: HttpStatus,
    details: unknown = null,
  ) {
    const body: ErrorBody = {
      error: { code, message, details },
    };
    super(body, status);
  }
}
