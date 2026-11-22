import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
  // Next's tsconfig uses jsx: "preserve", so compile TS/TSX (including the
  // workspace @repo/* source packages) with the React JSX runtime for Jest.
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowJs: true,
          isolatedModules: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!@repo/)'],
};

export default config;
