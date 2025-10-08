module.exports = {
  displayName: 'Integration Tests',
  testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
  ],
  coverageDirectory: 'coverage/integration',
  setupFilesAfterEnv: ['<rootDir>/test/setup/jest.integration.setup.ts'],
  testTimeout: 60000, // Longer timeout for integration tests
  moduleNameMapping: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
