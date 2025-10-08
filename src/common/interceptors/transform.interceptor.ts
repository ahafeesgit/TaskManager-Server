import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { TransformInterceptorConfig } from './interfaces/interceptor.interface';
import {
  INTERCEPTOR_CONFIG,
  DEFAULT_INTERCEPTOR_CONFIG,
  EMAIL_FIELD_PATTERNS,
  DATE_FIELD_PATTERNS,
} from './constants';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(
    @Optional()
    @Inject(INTERCEPTOR_CONFIG)
    private readonly config: TransformInterceptorConfig = DEFAULT_INTERCEPTOR_CONFIG.transform,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (this.config?.enabled === false) {
      return next.handle();
    }

    return next.handle().pipe(map((data) => this.transformData(data)));
  }

  /**
   * Recursively transform data based on configuration
   */
  private transformData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      const transformed = data
        .map((item) => this.transformData(item))
        .filter((item) => {
          // Remove null values if configured
          if (this.config?.removeNullValues && item === null) {
            return false;
          }
          // Remove undefined values if configured
          if (this.config?.removeUndefinedValues && item === undefined) {
            return false;
          }
          return true;
        });

      // Remove empty arrays if configured
      if (this.config?.removeEmptyObjects && transformed.length === 0) {
        return undefined;
      }

      return transformed;
    }

    if (typeof data === 'object' && data !== null) {
      const transformed: any = {};
      let hasValidProperties = false;

      for (const [key, value] of Object.entries(data)) {
        // Skip null values if configured
        if (this.config?.removeNullValues && value === null) {
          continue;
        }

        // Skip undefined values if configured
        if (this.config?.removeUndefinedValues && value === undefined) {
          continue;
        }

        let transformedValue = value;

        // Transform string values
        if (typeof value === 'string') {
          transformedValue = this.transformString(key, value);
        }
        // Transform numeric strings if configured
        else if (
          this.config?.convertNumericStrings &&
          typeof value === 'string' &&
          this.isNumericString(value)
        ) {
          transformedValue = this.parseNumericString(value);
        }
        // Recursively transform nested objects and arrays
        else if (typeof value === 'object' && value !== null) {
          transformedValue = this.transformData(value);

          // Skip empty objects if configured
          if (
            this.config?.removeEmptyObjects &&
            this.isEmpty(transformedValue)
          ) {
            continue;
          }
        }

        transformed[key] = transformedValue;
        hasValidProperties = true;
      }

      // Return undefined for empty objects if configured
      if (this.config?.removeEmptyObjects && !hasValidProperties) {
        return undefined;
      }

      return transformed;
    }

    return data;
  }

  /**
   * Transform string values based on field name and configuration
   */
  private transformString(key: string, value: string): any {
    let transformed = value;

    // Trim strings if configured
    if (this.config?.trimStrings) {
      transformed = transformed.trim();
    }

    // Convert email fields to lowercase if configured
    if (this.config?.lowercaseEmails && this.isEmailField(key)) {
      transformed = transformed.toLowerCase();
    }

    // Standardize date strings if configured
    if (this.config?.standardizeDates && this.isDateField(key)) {
      const date = this.parseDate(transformed);
      if (date) {
        return date.toISOString();
      }
    }

    return transformed;
  }

  /**
   * Check if field name indicates an email field
   */
  private isEmailField(key: string): boolean {
    const keyLower = key.toLowerCase();
    return EMAIL_FIELD_PATTERNS.some((pattern) =>
      keyLower.includes(pattern.toLowerCase()),
    );
  }

  /**
   * Check if field name indicates a date field
   */
  private isDateField(key: string): boolean {
    const keyLower = key.toLowerCase();
    return DATE_FIELD_PATTERNS.some((pattern) =>
      keyLower.includes(pattern.toLowerCase()),
    );
  }

  /**
   * Check if string represents a number
   */
  private isNumericString(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed === '') return false;

    // Check for integer
    if (/^-?\d+$/.test(trimmed)) return true;

    // Check for float
    if (/^-?\d*\.\d+$/.test(trimmed)) return true;

    // Check for scientific notation
    if (/^-?\d*\.?\d*e[+-]?\d+$/i.test(trimmed)) return true;

    return false;
  }

  /**
   * Parse numeric string to appropriate number type
   */
  private parseNumericString(value: string): number {
    const trimmed = value.trim();

    // Try integer first
    if (/^-?\d+$/.test(trimmed)) {
      const int = parseInt(trimmed, 10);
      // Check if it's within safe integer range
      if (Number.isSafeInteger(int)) {
        return int;
      }
    }

    // Parse as float
    return parseFloat(trimmed);
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(value: string): Date | null {
    try {
      const date = new Date(value);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return null;
      }

      return date;
    } catch {
      return null;
    }
  }

  /**
   * Check if object/array is empty
   */
  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value).length === 0;
    }

    return false;
  }
}
