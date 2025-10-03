import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WinstonLoggerService } from '../logging/winston-logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: WinstonLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = this.getErrorResponse(exception, request);

    // Log the error
    this.logError(exception, request, httpStatus);

    response.status(httpStatus).json(errorResponse);
  }

  private getErrorResponse(exception: unknown, request: Request) {
    const timestamp = new Date().toISOString();
    const path = request.url;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      return {
        statusCode: exception.getStatus(),
        timestamp,
        path,
        error:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any).error || 'Bad Request',
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any).message || exception.message,
        ...(process.env.NODE_ENV === 'development' && {
          stack: exception.stack,
        }),
      };
    }

    // For non-HTTP exceptions
    const error =
      exception instanceof Error ? exception : new Error('Unknown error');

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      error: 'Internal Server Error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    };
  }

  private logError(
    exception: unknown,
    request: Request,
    httpStatus: number,
  ): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';

    const errorMessage =
      exception instanceof Error ? exception.message : 'Unknown error';
    const errorStack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `${method} ${url} ${httpStatus} - ${errorMessage}`,
      errorStack,
      'ExceptionFilter',
    );

    // Log additional context for debugging
    this.logger.debug(
      `Request details: ${method} ${url} from ${ip}`,
      'ExceptionFilter',
    );
  }
}
