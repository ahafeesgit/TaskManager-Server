/**
 * Configuration token for interceptors module
 */
export const INTERCEPTOR_CONFIG = Symbol('INTERCEPTOR_CONFIG');

/**
 * Default configuration values for interceptors
 */
export const DEFAULT_INTERCEPTOR_CONFIG = {
  response: {
    enabled: true,
    includeTimestamp: false,
    includeRequestId: false,
    excludeRoutes: ['/health', '/metrics', '/docs'],
    includeServerInfo: false,
    wrapSingleValues: true,
  },
  logging: {
    enabled: true,
    logRequests: true,
    logResponses: false,
    sanitizeData: true,
    excludeRoutes: ['/health', '/metrics'],
    maxBodyLength: 1000,
    logHeaders: false,
    logQueryParams: true,
    logUserInfo: true,
    includePerformanceMetrics: true,
  },
  timeout: {
    enabled: false,
    timeout: 30000, // 30 seconds
    excludeRoutes: ['/upload', '/download', '/export'],
    timeoutMessage: 'Request timeout exceeded',
  },
  transform: {
    enabled: false,
    removeNullValues: false,
    removeUndefinedValues: false,
    trimStrings: true,
    lowercaseEmails: true,
    standardizeDates: true,
    removeEmptyObjects: false,
    convertNumericStrings: false,
  },
  error: {
    enabled: true,
    includeStackTrace: false,
    logErrors: true,
    transformValidationErrors: true,
    includeErrorContext: true,
  },
};

/**
 * Sensitive field names to sanitize in logs
 */
export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
  'authorization',
  'cookie',
  'session',
  'apiKey',
  'accessToken',
  'refreshToken',
  'privateKey',
  'passphrase',
  'salt',
  'hash',
  'creditCard',
  'ssn',
  'socialSecurityNumber',
  'bankAccount',
];

/**
 * HTTP methods that typically don't have request bodies
 */
export const METHODS_WITHOUT_BODY = ['GET', 'HEAD', 'DELETE'];

/**
 * Content types that should be logged
 */
export const LOGGABLE_CONTENT_TYPES = [
  'application/json',
  'application/x-www-form-urlencoded',
  'text/plain',
  'text/html',
];

/**
 * Routes that are typically excluded from interceptors
 */
export const DEFAULT_EXCLUDED_ROUTES = [
  '/health',
  '/metrics',
  '/docs',
  '/swagger',
  '/favicon.ico',
  '/robots.txt',
];

/**
 * Common timeout configurations for different route types
 */
export const COMMON_ROUTE_TIMEOUTS = {
  '/upload': 300000, // 5 minutes for file uploads
  '/download': 300000, // 5 minutes for file downloads
  '/export': 180000, // 3 minutes for data exports
  '/import': 300000, // 5 minutes for data imports
  '/auth/login': 5000, // 5 seconds for login
  '/auth/logout': 5000, // 5 seconds for logout
};

/**
 * Cache TTL configurations for different route patterns
 */
export const COMMON_CACHE_TTL = {
  '/api/public': 300, // 5 minutes for public data
  '/api/config': 600, // 10 minutes for configuration
  '/api/static': 3600, // 1 hour for static content
  '/api/lookup': 1800, // 30 minutes for lookup data
};

/**
 * Email field patterns for automatic lowercase conversion
 */
export const EMAIL_FIELD_PATTERNS = [
  'email',
  'emailAddress',
  'userEmail',
  'contactEmail',
  'adminEmail',
  'supportEmail',
  'notificationEmail',
];

/**
 * Date field patterns for automatic standardization
 */
export const DATE_FIELD_PATTERNS = [
  'createdAt',
  'updatedAt',
  'deletedAt',
  'publishedAt',
  'expiresAt',
  'startDate',
  'endDate',
  'birthDate',
  'dateOfBirth',
  'timestamp',
];
