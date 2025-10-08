import { Injectable } from '@nestjs/common';
import type { LoggingConfig } from '../interfaces/logging.interface';

@Injectable()
export class LogSanitizerService {
  private sensitivePatterns: RegExp[] = [
    // Password patterns
    /'([^']*password[^']*)'/gi,
    /'([^']*pwd[^']*)'/gi,
    // Token patterns
    /'([^']*token[^']*)'/gi,
    /'([^']*jwt[^']*)'/gi,
    // Secret patterns
    /'([^']*secret[^']*)'/gi,
    /'([^']*key[^']*)'/gi,
    // API key patterns
    /'([^']*api[_-]?key[^']*)'/gi,
    // Email patterns
    /'([^']*@[^']*\.[^']*)'/gi,
    // Phone number patterns
    /'(\+?[\d\s\-()]{10,})'/gi,
    // Credit card patterns
    /'(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})'/gi,
    // SSN patterns
    /'(\d{3}-\d{2}-\d{4})'/gi,
    // Long string values (>50 chars) that might be sensitive
    /'([^']{50,})'/gi,
    // UUID patterns that might be sensitive IDs
    /'([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})'/gi,
  ];

  private sensitiveFields: string[] = [
    'password',
    'pwd',
    'token',
    'secret',
    'key',
    'apiKey',
    'authorization',
    'cookie',
    'session',
    'csrf',
    'x-api-key',
  ];

  constructor(private config?: LoggingConfig) {
    if (config?.sensitiveFields) {
      this.sensitiveFields.push(...config.sensitiveFields);
    }
  }

  /**
   * Sanitize SQL query or any string content
   */
  sanitizeQuery(query: string): string {
    let sanitized = query;

    // Apply sensitive pattern replacements
    this.sensitivePatterns.forEach((pattern, index) => {
      const replacements = [
        "'[PASSWORD_REDACTED]'",
        "'[PASSWORD_REDACTED]'",
        "'[TOKEN_REDACTED]'",
        "'[TOKEN_REDACTED]'",
        "'[SECRET_REDACTED]'",
        "'[KEY_REDACTED]'",
        "'[API_KEY_REDACTED]'",
        "'[EMAIL_REDACTED]'",
        "'[PHONE_REDACTED]'",
        "'[CARD_REDACTED]'",
        "'[SSN_REDACTED]'",
        (match: string, group: string) =>
          `'[LONG_VALUE_REDACTED_${group.length}_CHARS]'`,
        "'[UUID_REDACTED]'",
      ];

      const replacement = replacements[index];
      if (typeof replacement === 'string') {
        sanitized = sanitized.replace(pattern, replacement);
      } else if (typeof replacement === 'function') {
        sanitized = sanitized.replace(pattern, replacement);
      }
    });

    // Truncate very long queries
    const maxLength = 2000;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '... [TRUNCATED]';
    }

    return sanitized;
  }

  /**
   * Sanitize object by removing or masking sensitive fields
   */
  sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if key is sensitive
      const isSensitive = this.sensitiveFields.some((field) =>
        lowerKey.includes(field.toLowerCase()),
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else if (typeof value === 'string' && value.length > 100) {
        // Truncate very long strings
        sanitized[key] = value.substring(0, 100) + '... [TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize headers object
   */
  sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
      'x-csrf-token',
    ];

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Extract safe user info for logging
   */
  extractSafeUserInfo(user: any): any {
    if (!user) return null;

    return {
      id: user.id,
      email: user.email ? this.maskEmail(user.email) : undefined,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  /**
   * Mask email address for logging
   */
  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (!username || !domain) return '[INVALID_EMAIL]';

    const maskedUsername =
      username.length > 3
        ? username.substring(0, 2) + '*'.repeat(username.length - 2)
        : '*'.repeat(username.length);

    return `${maskedUsername}@${domain}`;
  }
}
