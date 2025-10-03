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
          const logObject: any = {
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
            const ctx = context ? `[${context}] ` : '';
            return `${timestamp} ${level}: ${ctx}${message}`;
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

  log(message: any, context?: string): void {
    this.winston.info(message, { context });
  }

  error(message: any, trace?: string, context?: string): void {
    this.winston.error(message, { context, trace });
  }

  warn(message: any, context?: string): void {
    this.winston.warn(message, { context });
  }

  debug(message: any, context?: string): void {
    this.winston.debug(message, { context });
  }

  verbose(message: any, context?: string): void {
    this.winston.verbose(message, { context });
  }

  // Additional utility methods
  logRequest(req: any, res: any, responseTime: number): void {
    const { method, originalUrl, ip, headers } = req;
    const { statusCode } = res;

    this.winston.info('HTTP Request', {
      context: 'HTTP',
      method,
      url: originalUrl,
      statusCode,
      responseTime: `${responseTime}ms`,
      ip,
      userAgent: headers['user-agent'],
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
    this.winston.debug('Database Query', {
      context,
      query,
      duration: `${duration}ms`,
    });
  }
}
