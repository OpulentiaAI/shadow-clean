import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/types/',
        '**/*.config.*',
      ],
    },
    // Separate unit and integration tests
    include: ['**/*.test.ts', '**/*.test.tsx'],
    // Allow skipping integration tests based on env
    env: {
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/server/src'),
      '@repo/db': path.resolve(__dirname, './packages/db/src'),
      '@repo/types': path.resolve(__dirname, './packages/types/src'),
      '@repo/command-security': path.resolve(__dirname, './packages/command-security/src'),
    },
  },
});
