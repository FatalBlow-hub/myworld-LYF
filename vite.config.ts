/** vite 配置 — 开发时把 /api 和 /ws 开头的请求代理给后端小服务（server/index.mjs，跑在 8787）
 *  后端没开也不碍事：接口请求失败，前端自动退回"本地模式"，只用浏览器存档 */

import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  server: {
    port: 5174, // 开发地址固定 http://localhost:5174/
    proxy: {
      '/api': 'http://localhost:8787',
      '/ws': {
        target: 'http://localhost:8787',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      // 两个入口：main = 游戏（玩家），admin = 家长控制台（防沉迷管理，需管理员账号）
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
      },
    },
  },
});
