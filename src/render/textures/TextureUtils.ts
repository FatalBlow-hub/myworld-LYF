/** 贴图工具 — 提供程序化像素画共用的画布尺寸和绘制方法 */

export const TILE = 16;
export type Painter = (ctx: CanvasRenderingContext2D, ox: number, oy: number) => void;

export function fill(ctx: CanvasRenderingContext2D, ox: number, oy: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(ox, oy, TILE, TILE);
}

export function speckle(ctx: CanvasRenderingContext2D, ox: number, oy: number, colors: string[], count: number): void {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(ox + Math.floor(Math.random() * TILE), oy + Math.floor(Math.random() * TILE), 1, 1);
  }
}

/** 颜色微调：把 #rrggbb 变亮(+)或变暗(-)一点，画噪点/包边用 */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.min(255, Math.max(0, v + amt));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
