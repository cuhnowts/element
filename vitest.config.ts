import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.test.ts', 'src/lib/**/*.test.tsx'],
      reportOnFailure: true,
    },
  },
}));
