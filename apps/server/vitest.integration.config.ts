import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for integration tests
 * Run with: npm run test:integration
 * Requires: CONVEX_URL environment variable pointing to a non-production deployment
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // Include only integration and e2e tests
    include: [
      'src/**/*.integration.test.ts',
      'src/**/tests/*.test.ts',
      'src/**/*.e2e.test.ts',
    ],
    testTimeout: 60000, // Longer timeout for integration tests
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
