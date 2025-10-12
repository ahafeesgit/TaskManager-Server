import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from './types/api-response.types';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        // If data is already an ApiResponse, return it
        if (this.isApiResponse(data)) {
          return data as ApiResponse<T>;
        }

        // Create simple ApiResponse
        return this.createApiResponse(data, statusCode);
      }),
    );
  }

  private createApiResponse<T>(data: T, statusCode: number): ApiResponse<T> {
    const success = statusCode >= 200 && statusCode < 300;

    return {
      success,
      code: statusCode,
      data,
      messages: [],
    };
  }

  private isApiResponse(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      'code' in data &&
      'data' in data &&
      'messages' in data
    );
  }
}
