/** 商店经济系统 — 三台售卖机的买卖、收购箱、白萝卜双价、岛币账本与每日限量（2026-10-29 从 Game.ts 抽出） */

import { BLACK_PICKAXE } from '../../world/blocks/black';
import { BLACK_PICK } from '../../config';
import { BLOCKS, Slots } from '../../world/blocks/Block';
import { CHARACTER_NAMES, CharacterKind } from '../../entities/creatures/Character';
import { BOW_FORM_NAMES, BOW_FORM_OF } from '../../entities/summons/Archer';
import { DRINK_GOODS, SPECIAL_GOODS, STORE_GOODS, ShopGood, fmtCoins, rollGood } from '../../world/economy/Shop';
import { consumeQuota, remainingOf, ShopQuota } from '../../world/economy/shopLimits';
import { blackPriceOf, refreshBlackMarket, BlackMarketState } from '../../world/economy/blackMarket';
import { hashName, radishBuyPrice, radishSellPrice, WHITE_RADISH } from '../../world/economy/radish';
import { dayOfYear, isMonday, weekdayOf, WEEKDAY_CN, GameDate } from '../loops/Calendar';
import { ContainerPanel } from '../../ui/panels/Container';
import { ShopPanel } from '../../ui/panels/ShopPanel';
import { Hud } from '../../ui/hud/Hud';
import { Inventory } from '../../player/Inventory';
import type { Atlas } from '../../render/textures/Textures';

/** 皮肤账本只用到这三下 */
interface AppearanceLike {
  owns: (kind: CharacterKind) => boolean;
  unlock: (kind: CharacterKind) => void;
}

interface EconomyCtx {
  inventory: () => Inventory | null;
  hud: () => Hud | null;
  slot: () => number;
  /** 收购箱面板（对着收购箱按 M 时打开） */
  container: () => ContainerPanel | null;
  appearance: () => AppearanceLike;
  /** 游戏内日期：黑色售卖机换货 / 白萝卜按天摇价 */
  date: () => GameDate;
  playerName: () => string;
  saveNow: () => void;
}

export class EconomySystem {
  /** 售卖机面板（Game 的 PanelStack 登记） */
  readonly shopPanel: ShopPanel;
  /** 收购箱的 9 个格子：东西放进去立刻折算成岛币，不跨场景保存 */
  readonly buyBoxSlots: Slots = Array(9).fill(null) as Slots;
  private coinsValue = 0;
  private quotaValue: ShopQuota | undefined;
  private marketValue: BlackMarketState | undefined;

  constructor(atlas: Atlas, private ctx: EconomyCtx) {
    this.shopPanel = new ShopPanel(atlas, () => this.coins, (good) => this.buyGood(good));
  }

  /** 岛币余额（Game 用 getter/setter 委托过来，存档读写不用改） */
  get coins(): number { return this.coinsValue; }
  set coins(v: number) { this.coinsValue = v; }
  get quota(): ShopQuota | undefined { return this.quotaValue; }
  set quota(v: ShopQuota | undefined) { this.quotaValue = v; }
  get blackMarket(): BlackMarketState | undefined { return this.marketValue; }
  set blackMarket(v: BlackMarketState | undefined) { this.marketValue = v; }

  /** 岛币增减（收购箱进账 / 售卖机扣钱）：顺手刷新 HUD 上的余额 */
  addCoins(n: number): void {
    this.coinsValue = Math.max(0, Math.round((this.coinsValue + n) * 100) / 100);
    this.ctx.hud()?.setCoins(this.coinsValue);
  }

  /** 跨天：黑色售卖机换货（昨天的货架清空） */
  refreshMarketForNewDay(): void {
    this.marketValue = refreshBlackMarket(this.marketValue, this.ctx.date());
  }

  /** 对机器按 M：打开对应货架（杂货铺多带一个"今天还能买几个"的查询） */
  openShop(kind: 'special' | 'drink' | 'store' | 'black'): void {
    if (kind === 'black') {
      // 黑色售卖机：每个游戏日只随机进一种货（1 件），卖完/跨日都清空，明天再来
      this.marketValue = refreshBlackMarket(this.marketValue, this.ctx.date());
      const item = this.marketValue.item;
      const goods: ShopGood[] = item === null ? [] : [{
        id: item,
        price: blackPriceOf(item),
        label: this.blackLabelOf(item),
        note: item === BLACK_PICKAXE ? '能挖 30 个方块，挖满就坏' : BOW_FORM_OF[item] ? '对地按 M 召唤弓箭手小战士（永久）' : undefined,
        stock: () => (this.marketValue?.item === item ? 1 : 0),
        afterBuy: () => {
          this.marketValue = this.marketValue ? { day: this.marketValue.day, item: null } : undefined;
          this.shopPanel?.refresh();
        },
        soldNote: '今天卖完了',
      }];
      // 白萝卜：买入/回收各一个价（2026-10-29 设定：进货 4~10、回收 2~12），都按人按天固定；下周一没卖全烂
      const date = this.ctx.date();
      const nameHash = hashName(this.ctx.playerName() || '游客');
      const dayIdx = dayOfYear(date);
      const rBuy = radishBuyPrice(nameHash, dayIdx);
      const rSell = radishSellPrice(nameHash, dayIdx);
      const wd = WEEKDAY_CN[weekdayOf(date)];
      if (isMonday(date)) {
        goods.push({
          id: WHITE_RADISH, price: rBuy,
          note: `${wd}进货价 · 下周一没卖会烂`,
        });
      }
      goods.push({
        id: WHITE_RADISH, price: rSell, sellPrice: rSell,
        label: `白萝卜回收（今天 ${fmtCoins(rSell)}/个）`,
        have: () => this.ctx.inventory()?.countOf(WHITE_RADISH) ?? 0,
      });
      this.shopPanel?.open('黑色售卖机', goods, (g) => g.stock?.(),
        '今天的货卖完了，明天再来碰碰运气吧');
      return;
    }
    this.shopPanel?.open(
      kind === 'special' ? '特殊物品售卖机' : kind === 'drink' ? '饮料售卖机' : '杂货铺',
      kind === 'special' ? SPECIAL_GOODS : kind === 'drink' ? DRINK_GOODS : STORE_GOODS,
      kind === 'store' ? (g) => remainingOf(this.quotaValue, g.id!, g.dailyLimit) : undefined,
    );
  }

  /** 黑色售卖机商品一行字：弓要标形态（普通/火/冰），别的直接用方块表名字 */
  private blackLabelOf(item: number): string {
    const form = BOW_FORM_OF[item];
    if (!form) return BLOCKS[item]?.cn ?? '神秘商品';
    return `小战士弓（${BOW_FORM_NAMES[form]}）：召唤一名弓箭手小战士守家`;
  }

  /** 买皮肤：扣岛币、永久解锁，走和售卖机一样的存档时机（大厅里要回岛才整档写入） */
  private buySkin(good: ShopGood, kind: CharacterKind): void {
    const hud = this.ctx.hud()!;
    if (this.ctx.appearance().owns(kind)) { hud.showMessage(`你已经有「${CHARACTER_NAMES[kind]}」啦`, 2.5); return; }
    if (this.coinsValue < good.price) {
      hud.showMessage(`岛币不够，还差 ${fmtCoins(good.price - this.coinsValue)} 岛币`, 2.5);
      return;
    }
    this.addCoins(-good.price);
    this.ctx.appearance().unlock(kind);
    this.shopPanel?.refreshCoins();
    hud.showMessage(`买到了${CHARACTER_NAMES[kind]}皮肤！背包里点「人物」就能换上`, 3);
    this.ctx.saveNow();
  }

  /** 点「购买」：先看钱、存量和背包够不够，够了扣钱发货（小战士蛋还要抽品质；皮肤走 buySkin） */
  private buyGood(good: ShopGood): void {
    const hud = this.ctx.hud()!;
    if (good.unlock) { this.buySkin(good, good.unlock); return; }
    if (good.sellPrice !== undefined) { this.sellRadish(good); return; }
    const inv = this.ctx.inventory()!;
    if (this.coinsValue < good.price) {
      hud.showMessage(`岛币不够，还差 ${fmtCoins(good.price - this.coinsValue)} 岛币`, 2.5);
      return;
    }
    const id = rollGood(good);
    if (!inv.hasRoom(id, 1)) {
      hud.showMessage('背包满了，先腾个格子再来买', 2.5);
      return;
    }
    // 黑色售卖机这类"一天一件"的货：卖掉这一件今天就收摊
    if (good.stock && good.stock() <= 0) {
      hud.showMessage('今天卖完了，明天再来吧', 2.5);
      return;
    }
    // 每日限量（杂货铺）：买完今天这份就明天再来，记录随档存
    if (good.dailyLimit !== undefined) {
      if (remainingOf(this.quotaValue, id, good.dailyLimit) <= 0) {
        hud.showMessage(`${BLOCKS[id]?.cn ?? '这个'}今天买过了，明天再来吧`, 2.5);
        return;
      }
      this.quotaValue = consumeQuota(this.quotaValue, id, 1);
    }
    this.addCoins(-good.price);
    // 黑色木镐带 30 点耐久，别的商品照常
    inv.add(id, 1, id === BLACK_PICKAXE ? BLACK_PICK.USES : undefined);
    hud.refreshHotbar(inv, this.ctx.slot());
    this.shopPanel?.refreshCoins();     // 余额
    this.shopPanel?.refresh();          // 限量买点/按钮灰亮
    const name = BLOCKS[id]?.cn ?? '东西';
    hud.showMessage(id === good.id ? `买到 ${name}！` : `叮——抽到了${name}！`, 2.5);
    good.afterBuy?.();
    this.ctx.saveNow();
  }

  /** 黑色售卖机的白萝卜回收行：手里有多少卖多少，按今天这台机器的回收价结账 */
  private sellRadish(good: ShopGood): void {
    const inv = this.ctx.inventory()!;
    const hud = this.ctx.hud()!;
    const count = inv.countOf(WHITE_RADISH);
    if (count <= 0) { hud.showMessage('你手里一个白萝卜也没有', 2.5); return; }
    inv.take(WHITE_RADISH, count);
    this.addCoins(count * good.sellPrice!);
    hud.showMessage(`卖出 ${count} 个白萝卜，赚了 ${fmtCoins(count * good.sellPrice!)} 岛币！`, 3);
    hud.refreshHotbar(inv, this.ctx.slot());
    this.shopPanel?.refresh();
    this.ctx.saveNow();
  }

  /** 对着收购箱按 M：东西放进去立刻按价目表换成岛币 */
  openBuyBox(): void {
    this.ctx.container()!.openBuyBox(this.buyBoxSlots, (coins) => {
      this.addCoins(coins);
      this.ctx.hud()!.showMessage(`卖了 ${fmtCoins(coins)} 岛币（余额 ${fmtCoins(this.coinsValue)}）`, 2.5);
      this.ctx.saveNow();
    }, (text) => this.ctx.hud()!.showMessage(text, 3));
  }
}
