export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  HTTP: 'http';
  VERBOSE: 'verbose';
  DEBUG: 'debug';
  SILLY: 'silly';
}

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  context?: string;
  trace?: string;
  meta?: LogContext;
}

export interface LoggerService {
  log(message: any, context?: string): void;
  error(message: any, trace?: string, context?: string): void;
  warn(message: any, context?: string): void;
  debug(message: any, context?: string): void;
  verbose(message: any, context?: string): void;
}

export interface LoggingConfig {
  level?: string;
  enableFileLogging?: boolean;
  enableConsoleLogging?: boolean;
  logDirectory?: string;
  maxFileSize?: string;
  maxFiles?: string;
  enableQueryLogging?: boolean;
  enableRequestLogging?: boolean;
  sensitiveFields?: string[];
}

export interface RequestLogData {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  ip: string;
  userAgent: string;
  userId?: string;
  correlationId?: string;
}

export interface DatabaseLogData {
  query: string;
  duration: number;
  rowCount?: number;
  operation?: string;
}

export interface ErrorLogData {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  context?: string;
  userId?: string;
  correlationId?: string;
}
