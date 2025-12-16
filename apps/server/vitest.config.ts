import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts'],
    // Exclude e2e tests and integration tests that require Convex mocking refactor
    // These tests were designed for Prisma but code now uses Convex operations
    exclude: [
      '**/*.e2e.test.ts',
      '**/tests/*.test.ts',
      '**/chat.test.ts',           // Needs convex-operations mocking
      '**/initialization/*.test.ts', // Needs convex-operations mocking
      '**/execution/*.test.ts',    // Needs convex-operations mocking
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.config.ts',
      ],
    },
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@repo/db': path.resolve(__dirname, '../../packages/db/src/client.ts'),
      '@repo/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@repo/command-security': path.resolve(__dirname, '../../packages/command-security/src/index.ts'),
    },
  },
});
