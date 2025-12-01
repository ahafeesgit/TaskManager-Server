/**
 * Configuration token for filters module
 */
export const FILTER_CONFIG = Symbol('FILTER_CONFIG');

/**
 * Simple default configuration - just for error standardization
 */
export const DEFAULT_FILTER_CONFIG = {
  exception: {
    enabled: true,
    logErrors: true,
    hideStackTrace: true,
  },
};
