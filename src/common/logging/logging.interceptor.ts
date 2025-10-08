import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { WinstonLoggerService } from './winston-logger.service';
import { LogFormatterService } from './services/log-formatter.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly formatter: LogFormatterService;

  constructor(private readonly logger: WinstonLoggerService) {
    this.formatter = new LogFormatterService();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Generate correlation ID if not present
    if (!request.correlationId) {
      request.correlationId = this.formatter.generateCorrelationId();
    }

    // Skip logging for health endpoints to avoid noise
    if (request.url?.includes('/health')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.logRequest(request, response, responseTime);
      }),
      catchError((error: any) => {
        const responseTime = Date.now() - now;

        // Log the error with request context
        this.logger.logError(error, 'HTTP Request Error', request.user?.id);

        // Still log the request even if it failed
        response.statusCode = error.status || 500;
        this.logger.logRequest(request, response, responseTime);

        return throwError(() => error);
      }),
    );
  }
}
