import { defineConfig } from 'vite';

export default defineConfig({
  ssr: {
    external: [
      '@capacitor/status-bar',
      '@capacitor/keyboard',
      '@capacitor/app'
    ]
  },
  server: {
    middlewareMode: true,
  },
  build: {
    rollupOptions: {
      external: [
        '@capacitor/status-bar',
        '@capacitor/keyboard',
        '@capacitor/app'
      ]
    }
  }
});
