import {
  Injectable,
  LoggerService,
  ConsoleLogger,
  Optional,
} from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import type {
  LoggingConfig,
  RequestLogData,
  DatabaseLogData,
  ErrorLogData,
  LogContext,
} from './interfaces/logging.interface';
import { LogSanitizerService } from './services/log-sanitizer.service';
import { LogFormatterService } from './services/log-formatter.service';

@Injectable()
export class WinstonLoggerService
  extends ConsoleLogger
  implements LoggerService
{
  private readonly winston: winston.Logger;
  private readonly sanitizer: LogSanitizerService;
  private readonly formatter: LogFormatterService;
  private readonly config: LoggingConfig;

  constructor(@Optional() config?: LoggingConfig) {
    super();
    this.config = this.mergeWithDefaults(config);
    this.sanitizer = new LogSanitizerService(this.config);
    this.formatter = new LogFormatterService();
    this.winston = this.createWinstonLogger();
  }

  private mergeWithDefaults(config?: LoggingConfig): LoggingConfig {
    return {
      level: process.env.LOG_LEVEL || 'info',
      enableFileLogging: process.env.LOG_FILE_ENABLED === 'true',
      enableConsoleLogging: true,
      logDirectory: 'logs',
      maxFileSize: '20m',
      maxFiles: '30d',
      enableQueryLogging: process.env.LOG_DATABASE_QUERIES === 'true',
      enableRequestLogging: true,
      sensitiveFields: ['password', 'token', 'secret', 'key'],
      ...config,
    };
  }

  private createWinstonLogger(): winston.Logger {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(
        ({ timestamp, level, message, context, trace, ...meta }) => {
          const logEntry = this.formatter.formatLogEntry(
            String(level),
            String(message),
            context ? String(context) : undefined,
            {
              trace,
              ...meta,
            },
          );
          return JSON.stringify(logEntry);
        },
      ),
    );

    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.enableConsoleLogging) {
      transports.push(
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
              const levelStr =
                typeof level === 'string' ? level : String(level);
              return `${tsStr} ${levelStr}: ${ctx}${msgStr}`;
            }),
          ),
        }),
      );
    }

    // File transports
    if (this.config.enableFileLogging) {
      // Error logs
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: `${this.config.logDirectory}/error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          format: logFormat,
          maxSize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles,
          zippedArchive: true,
        }),
      );

      // Combined logs
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: `${this.config.logDirectory}/combined-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          format: logFormat,
          maxSize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles,
          zippedArchive: true,
        }),
      );
    }

    const exceptionHandlers: winston.transport[] = [
      new winston.transports.Console(),
    ];

    const rejectionHandlers: winston.transport[] = [
      new winston.transports.Console(),
    ];

    if (this.config.enableFileLogging) {
      exceptionHandlers.push(
        new winston.transports.DailyRotateFile({
          filename: `${this.config.logDirectory}/exceptions-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: this.config.maxFileSize,
          maxFiles: '14d',
        }) as winston.transport,
      );

      rejectionHandlers.push(
        new winston.transports.DailyRotateFile({
          filename: `${this.config.logDirectory}/rejections-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: this.config.maxFileSize,
          maxFiles: '14d',
        }) as winston.transport,
      );
    }

    return winston.createLogger({
      level: this.config.level,
      format: logFormat,
      transports,
      exceptionHandlers,
      rejectionHandlers,
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

  // Enhanced utility methods
  logRequest(
    req: Record<string, unknown>,
    res: Record<string, unknown>,
    responseTime: number,
  ): void {
    if (!this.config.enableRequestLogging) return;

    const requestData: RequestLogData = {
      method: req.method as string,
      url: req.originalUrl as string,
      statusCode: res.statusCode as number,
      responseTime,
      ip: req.ip as string,
      userAgent:
        (req.headers as Record<string, string>)['user-agent'] || 'unknown',
      userId: (req as any).user?.id,
      correlationId: (req as any).correlationId,
    };

    const sanitizedHeaders = this.sanitizer.sanitizeHeaders(
      req.headers as Record<string, any>,
    );
    const formattedLog = this.formatter.formatRequestLog(requestData);

    this.winston.info('HTTP Request', {
      ...formattedLog,
      headers: sanitizedHeaders,
    });
  }

  logError(error: Error, context?: string, userId?: string): void {
    const formattedError = this.formatter.formatErrorLog(
      error,
      context,
      userId,
    );
    this.winston.error(error.message, formattedError);
  }

  logDatabaseQuery(
    query: string,
    duration: number,
    context = 'Database',
  ): void {
    if (!this.config.enableQueryLogging) {
      // Only log basic query metrics without the actual query
      this.winston.debug('Database Query Executed', {
        context,
        duration: this.formatter.formatDuration(duration),
        queryLength: query.length,
      });
      return;
    }

    const sanitizedQuery = this.sanitizer.sanitizeQuery(query);
    const formattedLog = this.formatter.formatDatabaseLog({
      query: sanitizedQuery,
      duration,
    });

    this.winston.debug('Database Query', {
      context,
      ...formattedLog,
      originalLength: query.length,
    });
  }

  // New enhanced methods
  logEvent(event: string, data?: any, context?: string): void {
    const formattedLog = this.formatter.formatEventLog(
      event,
      this.sanitizer.sanitizeObject(data),
      context,
    );
    this.winston.info('Application Event', formattedLog);
  }

  logPerformance(
    metric: string,
    value: number,
    unit = 'ms',
    context?: string,
  ): void {
    const formattedLog = this.formatter.formatPerformanceLog(
      metric,
      value,
      unit,
      context,
    );
    this.winston.info('Performance Metric', formattedLog);
  }

  logSecurity(
    event: string,
    data?: any,
    severity: 'info' | 'warn' | 'error' = 'info',
  ): void {
    const formattedLog = this.formatter.formatSecurityLog(
      event,
      this.sanitizer.sanitizeObject(data),
      severity,
    );

    switch (severity) {
      case 'error':
        this.winston.error('Security Event', formattedLog);
        break;
      case 'warn':
        this.winston.warn('Security Event', formattedLog);
        break;
      default:
        this.winston.info('Security Event', formattedLog);
    }
  }

  logUserAction(
    userId: string,
    action: string,
    data?: any,
    context?: string,
  ): void {
    const sanitizedData = this.sanitizer.sanitizeObject(data);
    this.winston.info('User Action', {
      type: 'user_action',
      userId,
      action,
      data: sanitizedData,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  logMemoryUsage(context?: string): void {
    const memoryUsage = process.memoryUsage();
    this.winston.debug('Memory Usage', {
      type: 'memory_usage',
      context: context || 'System',
      heapUsed: this.formatter.formatMemoryUsage(memoryUsage.heapUsed),
      heapTotal: this.formatter.formatMemoryUsage(memoryUsage.heapTotal),
      rss: this.formatter.formatMemoryUsage(memoryUsage.rss),
      external: this.formatter.formatMemoryUsage(memoryUsage.external),
      timestamp: new Date().toISOString(),
    });
  }

  createChildLogger(context: string): WinstonLoggerService {
    // Create a child logger with the same configuration but different context
    const childLogger = new WinstonLoggerService(this.config);
    childLogger.setContext(context);
    return childLogger;
  }

  // Correlation ID support
  withCorrelationId(correlationId: string) {
    return {
      log: (message: any, context?: string) => {
        this.winston.info(String(message), { context, correlationId });
      },
      error: (message: any, trace?: string, context?: string) => {
        this.winston.error(String(message), { context, trace, correlationId });
      },
      warn: (message: any, context?: string) => {
        this.winston.warn(String(message), { context, correlationId });
      },
      debug: (message: any, context?: string) => {
        this.winston.debug(String(message), { context, correlationId });
      },
    };
  }
}
