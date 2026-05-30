import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    // All assets inlined — no external files needed
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  assetsInclude: ['**/*.glsl', '**/*.json'],
  base: './',
});
