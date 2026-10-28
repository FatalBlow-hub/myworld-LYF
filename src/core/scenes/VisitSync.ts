/** 同屏访岛（VisitSync） — 真·双人同屏的客户端半边：位置互播、方块改动互播、对方 3D 小人渲染、会话收尾
 *
 *  快照副本是"进他家照片"，同屏是"他真人也在"：两条路共存——联机会话活着时走同屏，断了退回快照。
 *  用法（Game 里接线）：
 *    访客落地后  visitSync.start('guest', 岛主名)
 *    岛主迎客后  visitSync.start('host', 访客名)
 *    每帧       visitSync.update(dt, body, 自己的形象, day.time)
 *    换场景前   visitSync.leave()
 *  消息入口（NetClient 回调接进来）：onPeerPos / onRemoteBlocks / onPeerEnd
 */

import * as THREE from 'three';
import { CharacterKind, CharacterModel, createCharacter, isCharacterKind } from '../../entities/creatures/Character';
import { World } from '../../world/World';
import { PlayerBody } from '../../player/motion/Physics';
import { NetClient } from '../../net/Client';
import { S2CVisitPeerMsg } from '../../net/Protocol';
import { DayCycle } from '../loops/DayCycle';

const POS_INTERVAL = 1 / 10;  // 位置每秒发 10 次：跟得上跑跳又不刷屏
const LERP_SPEED = 12;        // 对方小人的追赶速度（越大越跟手，太小会像滑冰）
const CELLS_PER_MSG = 200;    // 一条方块同步消息最多带几格（瀑布成片变化拆多条发）

export type VisitRole = 'guest' | 'host';

export interface VisitSyncDeps {
  scene: THREE.Scene;
  world: World;
  day: DayCycle;
  net: () => NetClient | null;
  /** 对面小人第一次"活"过来（收到第一帧位置）时叫一声：访客拿掉迎客雕像，岛主知道客人落地了 */
  onPeerAlive?: (name: string, role: VisitRole) => void;
  /** 对端结束会话（离开/掉线）时叫一声，role = 自己在会话里的角色 */
  onPeerEnd?: (reason: 'left' | 'offline', name: string | undefined, role: VisitRole) => void;
}

export class VisitSync {
  private role: VisitRole | null = null;
  private peerName = '';
  private model: CharacterModel | null = null;
  private modelKind: CharacterKind | null = null;
  private target = { x: 0, y: 0, z: 0, yaw: 0 };
  private hasTarget = false;
  private sendAcc = 0;
  /** 本地改过的格子（去重，发的时候再读最新 id+朝向，免得门/床朝向丢） */
  private touched = new Map<string, [number, number, number]>();
  private applying = false; // 正在落地对端改来的方块，防回声循环

  constructor(private d: VisitSyncDeps) {}

  /** 当前是否在同屏会话里 */
  get active(): boolean {
    return this.role !== null;
  }

  /** 对面玩家的名字（送礼物面板标题用） */
  get peer(): string {
    return this.peerName;
  }

  /** 对端小人当前位置（插值后的实时位置）；模型不在场景里时返回 null */
  peerPosition(): { x: number; y: number; z: number } | null {
    return this.model ? { x: this.model.group.position.x, y: this.model.group.position.y, z: this.model.group.position.z } : null;
  }

  /** 拳头打没打中对面小人：从 (x,y,z) 沿 (dx,dy,dz) 发出的射线，离对方身体中心线的距离在 hitDist 内且没打过头 */
  hitPeer(x: number, y: number, z: number, dx: number, dy: number, dz: number, hitDist: number): boolean {
    const p = this.peerPosition();
    if (!p) return false;
    // 对方身体中心在脚底上方约半人高；中心线偏离拳头射线不超过 hitDist 就算命中
    const cx = p.x, cy = p.y + 0.9, cz = p.z;
    const vx = cx - x, vy = cy - y, vz = cz - z;
    const along = vx * dx + vy * dy + vz * dz;
    if (along < -0.5 || along > 4) return false; // 在背后或者够不着
    const px = x + dx * along, py = y + dy * along, pz = z + dz * along;
    const dist = Math.hypot(px - cx, py - cy, pz - cz);
    return dist <= hitDist;
  }

  /** 开始同屏：挂上世界改动钩子，之后每帧 update 会自动广播位置与方块改动 */
  start(role: VisitRole, peerName: string): void {
    this.stop();
    this.role = role;
    this.peerName = peerName;
    this.d.world.onBlockChange = (x, y, z) => {
      if (!this.applying) this.touched.set(`${x},${y},${z}`, [x, y, z]);
    };
  }

  /** 收到对端位置（NetClient 的 visit.peer 接进来） */
  onPeerPos(m: S2CVisitPeerMsg): void {
    if (!this.role) return;
    const first = !this.hasTarget;
    this.target = { x: m.x, y: m.y, z: m.z, yaw: m.yaw };
    this.hasTarget = true;
    // 访客的钟表跟岛主走：他家天黑我这儿也天黑
    if (this.role === 'guest' && typeof m.day === 'number') this.d.day.time = m.day;
    const kind: CharacterKind = isCharacterKind(m.kind) ? m.kind : 'steve';
    if (!this.model || this.modelKind !== kind) this.replaceModel(kind);
    if (first) this.d.onPeerAlive?.(this.peerName, this.role);
  }

  /** 收到对端改的一批方块：落到本地世界（applying 标记挡住回声，不会再广播回去） */
  onRemoteBlocks(cells: number[][]): void {
    if (!this.role || !Array.isArray(cells)) return;
    this.applying = true;
    try {
      for (const c of cells) {
        const [x, y, z, id, meta] = c;
        if (![x, y, z, id].every(Number.isFinite)) continue;
        this.d.world.setBlock(x, y, z, id);
        if (Number.isFinite(meta) && meta !== 0) this.d.world.setMeta(x, y, z, meta);
      }
    } finally {
      this.applying = false;
    }
  }

  /** 对端走了（服务器 visit.end 接进来）：收摊，对面小人消失 */
  onPeerEnd(reason: 'left' | 'offline', name?: string): void {
    const role = this.role;
    this.stop();
    if (role) this.d.onPeerEnd?.(reason, name, role);
  }

  /** 每帧：到点发位置、有改动发方块、对面小人朝最新位置滑过去 */
  update(dt: number, body: PlayerBody, ownKind: CharacterKind, dayTime: number): void {
    if (!this.role) return;
    this.sendAcc += dt;
    const net = this.d.net();
    if (this.sendAcc >= POS_INTERVAL && net) {
      this.sendAcc = 0;
      net.sendVisitPos({
        x: body.x, y: body.y, z: body.z, yaw: body.yaw, pitch: body.pitch,
        kind: ownKind,
        day: this.role === 'host' ? dayTime : undefined,
      });
    }
    if (this.touched.size && net) {
      const batch = [...this.touched.values()].slice(0, CELLS_PER_MSG);
      for (const [x, y, z] of batch) this.touched.delete(`${x},${y},${z}`);
      net.sendVisitBlocks(batch.map(([x, y, z]) => [x, y, z, this.d.world.getBlock(x, y, z), this.d.world.getMeta(x, y, z)]));
    }
    if (this.model && this.hasTarget) {
      const g = this.model.group;
      const k = Math.min(1, dt * LERP_SPEED);
      g.position.x += (this.target.x - g.position.x) * k;
      g.position.y += (this.target.y - g.position.y) * k;
      g.position.z += (this.target.z - g.position.z) * k;
      g.rotation.y = this.target.yaw; // 模型正面朝 -z，rotation.y = yaw 正好脸朝对方视线的方向
      this.model.update(dt);
    }
  }

  /** 我要换场景了：跟对端打声招呼再走（对方好收摊），带上名字防误杀新会话 */
  leave(): void {
    if (!this.role) return;
    this.d.net()?.sendVisitLeave(this.peerName);
    this.stop();
  }

  /** 完全收摊：摘钩子、收小人、清状态（不通知对端——对端走了或不熟才调） */
  private stop(): void {
    this.d.world.onBlockChange = null;
    if (this.model) {
      this.d.scene.remove(this.model.group);
      this.model.dispose();
      this.model = null;
    }
    this.role = null;
    this.peerName = '';
    this.modelKind = null;
    this.hasTarget = false;
    this.sendAcc = 0;
    this.touched.clear();
    this.applying = false;
  }

  /** 按皮肤换/造对面小人：第一帧直接落在目标点（不然从原点滑过去很鬼畜） */
  private replaceModel(kind: CharacterKind): void {
    if (this.model) {
      this.d.scene.remove(this.model.group);
      this.model.dispose();
    }
    this.model = createCharacter(kind, this.peerName);
    this.modelKind = kind;
    this.model.group.position.set(this.target.x, this.target.y, this.target.z);
    this.model.group.rotation.y = this.target.yaw;
    this.d.scene.add(this.model.group);
  }
}
