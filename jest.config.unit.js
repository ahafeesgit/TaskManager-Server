module.exports = {
  displayName: 'Unit Tests',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
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
  coverageDirectory: 'coverage/unit',
  testResultsProcessor: 'jest-sonar-reporter',
  setupFilesAfterEnv: ['<rootDir>/test/setup/jest.setup.ts'],
  moduleNameMapping: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
