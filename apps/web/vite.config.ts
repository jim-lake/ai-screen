import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import buildNumberPlugin, {
  getVersion,
} from './scripts/vite-increment-build-number';

export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: { format: { comments: false } },
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'static/[hash:16].js',
        chunkFileNames: 'static/[hash:16].js',
        assetFileNames: 'media/[hash:16].[ext]',
      },
    },
  },
  plugins: [
    buildNumberPlugin(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html.replace(/<%= __VERSION__ %>/g, getVersion());
      },
    },
    react({ babel: { plugins: ['babel-plugin-react-compiler'] } }),
  ],
});
