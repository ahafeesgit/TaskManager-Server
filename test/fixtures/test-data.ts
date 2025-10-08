// Test data fixtures for consistent testing
export const mockUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    role: 'user',
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
  },
  invalidUser: {
    email: 'invalid-email',
    password: '123', // Too short
    name: '',
    role: 'invalid-role',
  },
};

export const mockAuthTokens = {
  validToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  expiredToken: 'expired.token.here',
  invalidToken: 'invalid.token',
};

export const mockApiResponses = {
  userCreated: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },

  healthCheckResponse: {
    status: 'ok',
    info: {
      database: { status: 'up' },
      memory_heap: { status: 'up' },
      memory_rss: { status: 'up' },
      storage: { status: 'up' },
    },
    error: {},
    details: {
      database: { status: 'up' },
      memory_heap: { status: 'up' },
      memory_rss: { status: 'up' },
      storage: { status: 'up' },
    },
  },
};
