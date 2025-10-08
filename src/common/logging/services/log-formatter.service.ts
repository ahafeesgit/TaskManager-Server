import { Injectable } from '@nestjs/common';
import type {
  RequestLogData,
  LogContext,
} from '../interfaces/logging.interface';

@Injectable()
export class LogFormatterService {
  /**
   * Format request log data into a structured format
   */
  formatRequestLog(data: RequestLogData): LogContext {
    return {
      type: 'http_request',
      method: data.method,
      url: data.url,
      statusCode: data.statusCode,
      responseTime: `${data.responseTime}ms`,
      ip: data.ip,
      userAgent: data.userAgent,
      userId: data.userId,
      correlationId: data.correlationId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format database log data
   */
  formatDatabaseLog(data: {
    query: string;
    duration: number;
    operation?: string;
  }): LogContext {
    return {
      type: 'database_query',
      operation: data.operation || 'unknown',
      duration: `${data.duration}ms`,
      query: data.query,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format error log data
   */
  formatErrorLog(error: Error, context?: string, userId?: string): LogContext {
    return {
      type: 'error',
      name: error.name,
      message: error.message,
      stack: error.stack,
      context: context,
      userId: userId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format application event log
   */
  formatEventLog(event: string, data?: any, context?: string): LogContext {
    return {
      type: 'application_event',
      event: event,
      data: data,
      context: context,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format performance metric log
   */
  formatPerformanceLog(
    metric: string,
    value: number,
    unit = 'ms',
    context?: string,
  ): LogContext {
    return {
      type: 'performance_metric',
      metric: metric,
      value: value,
      unit: unit,
      context: context,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format security event log
   */
  formatSecurityLog(event: string, data?: any, severity = 'info'): LogContext {
    return {
      type: 'security_event',
      event: event,
      severity: severity,
      data: data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create correlation ID for request tracking
   */
  generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format log entry with consistent structure
   */
  formatLogEntry(
    level: string,
    message: string,
    context?: string,
    meta?: LogContext,
  ): any {
    return {
      level: level,
      message: message,
      context: context,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      ...meta,
    };
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms.toFixed(2)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(2);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Format memory usage
   */
  formatMemoryUsage(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
