# Puzzle Verify Game 

一个使用 React + Vite 构建的交互式拼图验证游戏。

## 功能特性

-  动态的实时 3D Canvas 渲染
-  多个游戏模式（疯狂模式、经典模式等）
-  分数系统和高分排行
-  音效反馈
-  完全响应式设计
-  使用 Vite 的超快速开发体验

## 快速开始

### 本地运行

**前置要求：** Node.js 16+

1. 克隆仓库：
   \\\ash
   git clone https://github.com/YOUR_USERNAME/puzzle-game.git
   cd puzzle-game
   \\\

2. 安装依赖：
   \\\ash
   npm install
   \\\

3. 启动开发服务器：
   \\\ash
   npm run dev
   \\\
   
   然后访问 http://localhost:5173/

### 构建用于生产

\\\ash
npm run build
\\\

构建输出在 \dist/\ 目录中。

## 部署到 GitHub Pages

1. 在 GitHub 上创建仓库
2. 推送代码：
   \\\ash
   git remote add origin https://github.com/YOUR_USERNAME/puzzle-game.git
   git branch -M main
   git push -u origin main
   \\\

3. 在 GitHub 仓库设置中：
   - 转到 Settings  Pages
   - Source 选择 "Deploy from a branch"
   - Branch 选择 "main"，文件夹选择 "/dist"
   - 点击 Save

4. 稍等几分钟后，你的游戏将在以下地址可访问：
   \\\
   https://YOUR_USERNAME.github.io/puzzle-game
   \\\

## 技术栈

- **React** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Canvas API** - 高性能图形渲染

## 项目结构

\\\
puzzle-game/
 components/          # React 组件
    GameCanvas.tsx   # 主游戏画布
    UIOverlay.tsx    # 游戏界面层
 services/            # 业务逻辑
    audioService.ts  # 音频管理
 App.tsx              # 主应用组件
 index.tsx            # 入口文件
 types.ts             # TypeScript 类型定义
 constants.ts         # 常量定义
 dist/                # 构建输出（生产版本）
\\\

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
