import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 关键配置：设置为相对路径，解决 GitHub Pages 白屏问题
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});