/**
 * Simple Filter Configuration
 * Just for handling errors consistently
 */
export interface FilterConfig {
  /** Global exception filter */
  exception?: ExceptionFilterConfig;
}

/**
 * Exception Filter Configuration
 * Standardizes all error responses to consistent format
 */
export interface ExceptionFilterConfig {
  /** Enable/disable exception filtering */
  enabled?: boolean;

  /** Log errors to console/files */
  logErrors?: boolean;

  /** Hide stack traces in production */
  hideStackTrace?: boolean;
}
