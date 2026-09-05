import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        demo: 'demo/index.html',
        privacy: 'privacy/index.html',
        terms: 'terms/index.html',
        offline: 'offline.html',
        notFound: '404.html'
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
