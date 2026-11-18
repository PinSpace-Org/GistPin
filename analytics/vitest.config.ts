import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Keep PostCSS/Tailwind out of vitest: postcss.config.mjs lists plugins by
  // string name, which Vite's PostCSS loader cannot resolve under test.
  css: { postcss: { plugins: [] } },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});