import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { WinstonLoggerService } from '../logging/winston-logger.service';

@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: WinstonLoggerService) {}

  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { code, meta } = exception;
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error occurred';

    switch (code) {
      case 'P2002': // Unique constraint violation
        status = HttpStatus.CONFLICT;
        message = this.getUniqueConstraintMessage(meta);
        break;
      case 'P2025': // Record not found
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;
      case 'P2003': // Foreign key constraint violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Foreign key constraint violation';
        break;
      case 'P2014': // Required relation missing
        status = HttpStatus.BAD_REQUEST;
        message = 'Required relation is missing';
        break;
      case 'P2000': // Value too long
        status = HttpStatus.BAD_REQUEST;
        message = 'Input value is too long';
        break;
      case 'P2001': // Record not found in nested operation
        status = HttpStatus.NOT_FOUND;
        message = 'Related record not found';
        break;
      default:
        this.logger.error(
          `Unhandled Prisma error: ${code}`,
          exception.stack,
          'PrismaExceptionFilter',
        );
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: this.getErrorName(status),
      message,
      ...(process.env.NODE_ENV === 'development' && {
        prismaCode: code,
        prismaMessage: exception.message,
      }),
    };

    this.logger.warn(
      `Prisma error ${code}: ${message}`,
      'PrismaExceptionFilter',
    );

    response.status(status).json(errorResponse);
  }

  private getUniqueConstraintMessage(meta?: Record<string, unknown>): string {
    if (meta?.target && Array.isArray(meta.target)) {
      const fields = meta.target.join(', ');
      return `A record with this ${fields} already exists`;
    }
    return 'A record with these values already exists';
  }

  private getErrorName(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      default:
        return 'Internal Server Error';
    }
  }
}
