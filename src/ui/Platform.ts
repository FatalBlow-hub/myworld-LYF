/** 平台判定 — 决定这一局用桌面 UI 还是手机 UI（虚拟按键、触屏提示文案、移动端布局都看它）
 *
 *  判定优先级：网址强制 ?touch=1 > 域名（m.xxx 这类手机版域名）> 设备本身是不是触屏
 *  用法:
 *    applyPlatformClass();                       // 入口调一次，给 <html> 打 is-mobile 标记供 CSS 分支
 *    if (isMobile()) new TouchControls(ctrl);    // 手机版才挂虚拟按键
 */

import { MOBILE } from '../config';

/** 网址带 ?touch=1 强制手机版（电脑上想预览手机版时用） */
export function wantsTouchOverride(): boolean {
  return location.search.includes('touch=1');
}

/** 设备本身是不是触屏（注意：带触摸屏的笔记本也会是 true，所以当不了唯一依据） */
export function isTouchDevice(): boolean {
  return navigator.maxTouchPoints > 0;
}

/** 是不是从手机版域名进来的（Nginx 把 m.xxx 反代到同一个服务） */
export function isMobileHost(): boolean {
  const host = location.hostname.toLowerCase();
  return (
    MOBILE.HOST_PREFIXES.some((prefix) => host.startsWith(prefix)) ||
    MOBILE.HOSTS.includes(host)
  );
}

/** 这一局要不要用手机版 UI */
export function isMobile(): boolean {
  return wantsTouchOverride() || isMobileHost() || isTouchDevice();
}

/** 给 <html> 打标记：CSS 里用 .is-mobile 就能针对手机版改样式 */
export function applyPlatformClass(): void {
  document.documentElement.classList.toggle('is-mobile', isMobile());
}
