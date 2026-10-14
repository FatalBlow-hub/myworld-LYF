/** 格子渲染 — 背包/箱子/熔炉面板共用的小格子画法 */

import { Stack } from '../world/Block';
import { Atlas } from '../render/Textures';

/** 往一个格子元素里画图标+数量；hideCount=true 时（创造模式）不画数字 */
export function renderStack(el: HTMLElement, stack: Stack | null, atlas: Atlas, hideCount = false): void {
  el.innerHTML = '';
  if (!stack) return;
  const img = document.createElement('img');
  img.src = atlas.iconFor(stack.id);
  el.appendChild(img);
  if (stack.durability !== undefined || (!hideCount && stack.count > 1)) {
    const n = document.createElement('b');
    n.className = 'count';
    n.textContent = String(stack.durability ?? stack.count);
    el.appendChild(n);
  }
}

/** 给格子绑点击：左键/轻点 = onClick（拿起或整摞放下）；右键/手机长按 = onAlt（放 1 个或拿起半摞） */
export function bindSlot(el: HTMLElement, onClick: () => void, onAlt?: () => void): void {
  // 长按触发过的瞬间记下来，抬手后浏览器合成的 mousedown 要吞掉，不然会连点两次
  let altAt = 0;
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    onAlt?.();
  });
  el.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (e.button === 2) return; // 右键走 contextmenu
    if (Date.now() - altAt < 800) return; // 刚长按完，这次是手指抬起合成的假点击
    onClick();
  });
  if (onAlt) {
    let timer = 0;
    const cancel = () => { if (timer) { clearTimeout(timer); timer = 0; } };
    el.addEventListener('touchstart', () => {
      cancel();
      timer = window.setTimeout(() => { timer = 0; altAt = Date.now(); onAlt(); }, 400);
    }, { passive: true });
    el.addEventListener('touchmove', cancel, { passive: true });
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchcancel', cancel);
  }
}

/** 创建"鼠标上捏着的东西"浮动元素 */
export function createHeldEl(host: HTMLElement): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'held-item';
  el.style.display = 'none';
  host.addEventListener('mousemove', (e) => {
    el.style.left = `${e.clientX - 18}px`;
    el.style.top = `${e.clientY - 18}px`;
  });
  // 手机上没有鼠标，跟着手指走
  host.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!t) return;
    el.style.left = `${t.clientX - 18}px`;
    el.style.top = `${t.clientY - 18}px`;
  }, { passive: true });
  document.body.appendChild(el);
  return el;
}
