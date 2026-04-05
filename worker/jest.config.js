module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  verbose: true,
  testTimeout: 10000,
  forceExit: true,
  detectOpenHandles: true,
};
