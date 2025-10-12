import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

// Simple API response interface for error handling
interface ApiResponse<T = any> {
  success: boolean;
  code: number;
  data: T | null;
  messages: string[];
}

// Define interface for HTTP exception response
interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let messages: string[] = ['Internal server error'];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as HttpExceptionResponse;

        // Handle validation errors (array of messages)
        if (Array.isArray(responseObj.message)) {
          messages = responseObj.message.map((msg) => String(msg));
        } else if (responseObj.message) {
          messages = [String(responseObj.message)];
        } else {
          messages = [exception.message];
        }
      } else {
        messages = [String(exceptionResponse)];
      }
    } else {
      // Handle non-HTTP exceptions
      const error =
        exception instanceof Error ? exception : new Error('Unknown error');

      // Log unexpected errors
      this.logger.error(`Unexpected error: ${error.message}`, error.stack);

      // Don't expose internal error details in production
      if (process.env.NODE_ENV === 'production') {
        messages = ['Internal server error'];
      } else {
        messages = [error.message];
      }
    }

    const errorResponse: ApiResponse<null> = {
      success: false,
      code: status,
      data: null,
      messages,
    };

    response.status(status).json(errorResponse);
  }
}
