/** vite 配置 — 开发时把 /api 开头的请求代理给后端小服务（server/index.mjs，跑在 8787）
 *  后端没开也不碍事：接口请求失败，前端自动退回"本地模式"，只用浏览器存档 */

import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5174, // 开发地址固定 http://localhost:5174/
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
