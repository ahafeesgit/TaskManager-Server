/**
 * Configuration token for interceptors module
 */
export const INTERCEPTOR_CONFIG = Symbol('INTERCEPTOR_CONFIG');

/**
 * Simple default configuration - just for response standardization
 */
export const DEFAULT_INTERCEPTOR_CONFIG = {
  response: {
    enabled: true,
    excludeRoutes: ['/health', '/metrics', '/docs'],
  },
};


