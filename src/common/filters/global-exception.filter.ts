import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let messages: string[] = ['Internal server error'];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        
        // Handle validation errors (array of messages)
        if (Array.isArray(responseObj.message)) {
          messages = responseObj.message;
        } else if (responseObj.message) {
          messages = [responseObj.message];
        } else {
          messages = [exception.message];
        }
      } else {
        messages = [exceptionResponse as string];
      }
    } else {
      // Log unexpected errors
      this.logger.error(
        `Unexpected error: ${exception?.message || 'Unknown error'}`,
        exception?.stack,
      );
      
      // Don't expose internal error details in production
      if (process.env.NODE_ENV === 'production') {
        messages = ['Internal server error'];
      } else {
        messages = [exception?.message || 'Unknown error'];
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
