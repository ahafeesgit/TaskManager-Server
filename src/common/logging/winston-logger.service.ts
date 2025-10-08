import { Injectable, LoggerService, ConsoleLogger } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class WinstonLoggerService
  extends ConsoleLogger
  implements LoggerService
{
  private readonly winston: winston.Logger;

  constructor() {
    super();
    this.winston = this.createWinstonLogger();
  }

  private createWinstonLogger(): winston.Logger {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(
        ({ timestamp, level, message, context, trace, ...meta }) => {
          const logObject: Record<string, unknown> = {
            timestamp,
            level,
            context,
            message,
            ...meta,
          };

          if (trace) {
            logObject.trace = trace;
          }

          return JSON.stringify(logObject);
        },
      ),
    );

    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.printf(({ timestamp, level, message, context }) => {
            const ctx = context
              ? `[${typeof context === 'string' ? context : JSON.stringify(context)}] `
              : '';
            const msgStr =
              typeof message === 'string' ? message : String(message);
            const tsStr =
              typeof timestamp === 'string' ? timestamp : String(timestamp);
            const levelStr = typeof level === 'string' ? level : String(level);
            return `${tsStr} ${levelStr}: ${ctx}${msgStr}`;
          }),
        ),
      }),
    ];

    // File transports (only if enabled via environment)
    if (process.env.LOG_FILE_ENABLED === 'true') {
      // Error logs
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          format: logFormat,
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true,
        }),
      );

      // Combined logs
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          format: logFormat,
          maxSize: '20m',
          maxFiles: '30d',
          zippedArchive: true,
        }),
      );
    }

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports,
      exceptionHandlers: [
        new winston.transports.Console(),
        ...(process.env.LOG_FILE_ENABLED === 'true'
          ? [
              new winston.transports.DailyRotateFile({
                filename: 'logs/exceptions-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: '14d',
              }),
            ]
          : []),
      ],
      rejectionHandlers: [
        new winston.transports.Console(),
        ...(process.env.LOG_FILE_ENABLED === 'true'
          ? [
              new winston.transports.DailyRotateFile({
                filename: 'logs/rejections-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: '14d',
              }),
            ]
          : []),
      ],
    });
  }

  log(message: unknown, context?: string): void {
    const msgStr = typeof message === 'string' ? message : String(message);
    this.winston.info(msgStr, { context });
  }

  error(message: unknown, trace?: string, context?: string): void {
    const msgStr = typeof message === 'string' ? message : String(message);
    this.winston.error(msgStr, { context, trace });
  }

  warn(message: unknown, context?: string): void {
    const msgStr = typeof message === 'string' ? message : String(message);
    this.winston.warn(msgStr, { context });
  }

  debug(message: unknown, context?: string): void {
    const msgStr = typeof message === 'string' ? message : String(message);
    this.winston.debug(msgStr, { context });
  }

  verbose(message: unknown, context?: string): void {
    const msgStr = typeof message === 'string' ? message : String(message);
    this.winston.verbose(msgStr, { context });
  }

  // Additional utility methods
  logRequest(
    req: Record<string, unknown>,
    res: Record<string, unknown>,
    responseTime: number,
  ): void {
    const method = req.method as string;
    const originalUrl = req.originalUrl as string;
    const ip = req.ip as string;
    const headers = req.headers as Record<string, string>;
    const statusCode = res.statusCode as number;

    this.winston.info('HTTP Request', {
      context: 'HTTP',
      method,
      url: originalUrl,
      statusCode,
      responseTime: `${responseTime}ms`,
      ip,
      userAgent: headers['user-agent'] || 'unknown',
    });
  }

  logError(error: Error, context?: string): void {
    this.winston.error(error.message, {
      context,
      stack: error.stack,
      name: error.name,
    });
  }

  logDatabaseQuery(
    query: string,
    duration: number,
    context = 'Database',
  ): void {
    // Only log database queries in development or when explicitly enabled
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isQueryLoggingEnabled = process.env.LOG_DATABASE_QUERIES === 'true';

    if (!isDevelopment && !isQueryLoggingEnabled) {
      // In production, only log basic query metrics without the actual query
      this.winston.debug('Database Query Executed', {
        context,
        duration: `${duration}ms`,
        queryLength: query.length,
      });
      return;
    }

    // Sanitize query to remove potential sensitive data
    const sanitizedQuery = this.sanitizeQuery(query);

    this.winston.debug('Database Query', {
      context,
      query: sanitizedQuery,
      duration: `${duration}ms`,
      originalLength: query.length,
    });
  }

  private sanitizeQuery(query: string): string {
    // Remove or mask common patterns that might contain sensitive data
    const sanitized = query
      // Replace string literals that might contain sensitive data
      .replace(/'([^']*password[^']*)'/gi, "'[PASSWORD_REDACTED]'")
      .replace(/'([^']*token[^']*)'/gi, "'[TOKEN_REDACTED]'")
      .replace(/'([^']*secret[^']*)'/gi, "'[SECRET_REDACTED]'")
      .replace(/'([^']*key[^']*)'/gi, "'[KEY_REDACTED]'")
      // Replace email patterns
      .replace(/'([^']*@[^']*\.[^']*)'/gi, "'[EMAIL_REDACTED]'")
      // Replace phone number patterns
      .replace(/'(\+?[\d\s\-()]{10,})'/gi, "'[PHONE_REDACTED]'")
      // Replace credit card patterns
      .replace(
        /'(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})'/gi,
        "'[CARD_REDACTED]'",
      )
      // Replace long string values that might be sensitive (>50 chars)
      .replace(/'([^']{50,})'/gi, (match: string, group: string) => {
        return `'[LONG_VALUE_REDACTED_${group.length}_CHARS]'`;
      })
      // Replace UUID patterns that might be sensitive IDs
      .replace(
        /'([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})'/gi,
        "'[UUID_REDACTED]'",
      );

    // Truncate very long queries
    const truncated = sanitized.substring(0, 2000);
    return truncated + (query.length > 2000 ? '... [TRUNCATED]' : '');
  }
}
