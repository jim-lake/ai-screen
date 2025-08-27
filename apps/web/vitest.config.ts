import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    watch: false,
    run: true,
    env: {
      // Suppress React act() warnings in integration tests
      // These occur due to async WebSocket/xterm.js operations that are hard to wrap in act()
      SUPPRESS_REACT_ACT_WARNINGS: 'true',
    },
  },
});
