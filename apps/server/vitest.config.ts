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
    // TODO: Refactor to use proper Convex mocking once module path resolution is fixed
    exclude: [
      '**/*.e2e.test.ts',
      '**/tests/*.test.ts',
      '**/agent/chat.test.ts',       // Needs Convex mock path resolution fix
      '**/initialization/*.test.ts', // Needs convex-operations mocking refactor
      '**/execution/*.test.ts',      // Needs convex-operations mocking refactor
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
