import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 部署配置 - 使用 docs 文件夹
  base: '/puzzle-game/',
  build: {
    outDir: 'docs',
    assetsDir: 'assets',
  }
});
