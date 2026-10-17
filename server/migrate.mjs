/** 数据库迁移执行器 — 启动时把 migrations/ 里没执行过的 .up.sql 按序跑掉
 *
 * 约定（对应 db-migration 规范）：
 *  - 每个迁移一对文件：NNN-xxx.up.sql（变更）/ NNN-xxx.down.sql（回滚）
 *  - schema_migrations 表记录已执行的文件名 → 幂等，重复执行不会重跑
 *  - 全量权威 schema 在 server/schema.sql；migrate 只承担已部署环境的增量迁移
 *  - 每次 schema 变更必须在 docs/数据库/schema演进.md 留痕
 *
 * 用法:
 *   node server/index.mjs             # 正常启动，自动跑未应用的迁移
 *   node server/migrate.mjs --down 0001   # 回滚指定编号的迁移
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const DIR = dirname(fileURLToPath(import.meta.url));
const DB_FILE = join(DIR, 'data.db');

/** 迁移记录表（记录哪个迁移文件已执行） */
function ensureTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,        -- 迁移文件名，如 0001_addict.up.sql
    applied_at INTEGER NOT NULL   -- 执行时间戳（秒）
  );`);
}

/** 执行所有未应用过的 up 迁移（按文件名排序；SQLite 的 ADD COLUMN 不支持 IF NOT EXISTS，
 *  遇到"列已存在"按已应用处理，保证脚本可重复执行不炸启动） */
export function runMigrations(db) {
  ensureTable(db);
  const dir = join(DIR, 'migrations');
  const done = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name));
  const ups = readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort();
  for (const f of ups) {
    if (done.has(f)) continue;
    try {
      db.exec(readFileSync(join(dir, f), 'utf8'));
    } catch (e) {
      // 重复加列 = 库已被别的方式改过，视为已应用，不阻断启动
      if (!String(e.message).includes('duplicate column name')) throw e;
      console.warn(`[migrate] ${f}: 列已存在，按已应用处理`);
    }
    db.prepare('INSERT OR IGNORE INTO schema_migrations (name, applied_at) VALUES (?, ?)')
      .run(f, Math.floor(Date.now() / 1000));
    console.log(`[migrate] 已执行迁移: ${f}`);
  }
}

/** 直接以 CLI 运行时才走这里（回滚用；被 index.mjs import 时不触发） */
if (process.argv[1] && process.argv[1].endsWith('migrate.mjs')) {
  const db = new Database(DB_FILE);
  ensureTable(db);
  const i = process.argv.indexOf('--down');
  if (i < 0) { console.log('回滚用法: node server/migrate.mjs --down <编号>（如 0001）'); process.exit(0); }
  const id = String(process.argv[i + 1] ?? '');
  const dir = join(DIR, 'migrations');
  const f = readdirSync(dir).find((x) => x.startsWith(id) && x.endsWith('.down.sql'));
  if (!f) { console.error(`找不到编号 ${id} 的回滚脚本`); process.exit(1); }
  db.exec(readFileSync(join(dir, f), 'utf8'));
  console.log(`[migrate] 已回滚: ${f}（注意：回滚要搭配回滚旧代码，否则新代码会报错）`);
  process.exit(0);
}
