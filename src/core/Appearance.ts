/** 人物形象（Appearance） — 当前用的形象 + 已拥有的皮肤
 *
 *  默认两个（史蒂夫、艾力克斯）新账号就有；海晶/末影史蒂夫在特殊售卖机买，买一次永久解锁。
 *  背包里点「人物」只在已拥有的形象里按 CHARACTER_KINDS 的顺序循环。
 *  本类只管内存里的状态，什么时候落盘由 Game 决定（大厅/岛上的存档规则不同）。
 */

import { CHARACTER_KINDS, CharacterKind, isCharacterKind } from '../entities/Character';

/** 新账号默认就拥有的形象 */
export const STARTER_SKINS: readonly CharacterKind[] = ['steve', 'alex'];

export class Appearance {
  /** 当前用的形象 */
  character: CharacterKind = 'steve';
  /** 存档里是否记过形象（没记过就按账号名固定挑一个） */
  characterFromSave = false;
  private skins: CharacterKind[] = [...STARTER_SKINS];

  /** 读档：老档没有 skins 字段就只有默认两个 */
  load(save?: { character?: CharacterKind; skins?: CharacterKind[] }): void {
    this.character = save?.character ?? 'steve';
    this.characterFromSave = Boolean(save?.character);
    this.skins = [...new Set([...STARTER_SKINS, ...(save?.skins ?? []).filter(isCharacterKind), this.character])];
  }

  /** 已拥有的形象（存档要写的就是这一份） */
  get owned(): CharacterKind[] {
    return [...this.skins];
  }

  owns(kind: CharacterKind): boolean {
    return this.skins.includes(kind);
  }

  /** 换成某个形象（自动挑选或背包里选） */
  set(kind: CharacterKind): void {
    this.character = kind;
    this.characterFromSave = true;
  }

  /** 背包点「人物」：在已拥有的形象里切到下一个 */
  swap(): void {
    const list = CHARACTER_KINDS.filter((k) => this.owns(k));
    this.set(list[(list.indexOf(this.character) + 1) % list.length]);
  }

  /** 买下一个皮肤，永久解锁；已经有了返回 false */
  unlock(kind: CharacterKind): boolean {
    if (this.owns(kind)) return false;
    this.skins.push(kind);
    return true;
  }
}
