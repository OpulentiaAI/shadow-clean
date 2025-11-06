import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        '**/*.test.tsx',
        '**/*.test.ts',
        '**/*.config.*',
      ],
    },
    include: ['**/*.test.tsx', '**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@repo/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
});
