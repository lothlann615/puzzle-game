import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 子路径部署配置
  base: '/puzzle-game/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
