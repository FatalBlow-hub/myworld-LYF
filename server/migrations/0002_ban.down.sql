-- 回滚 0002 账号封停：banned 列保守保留不删（SQLite 老版本不支持 DROP COLUMN，删列属高风险）
-- 代码不读该列即等同回滚；确需删除时安排"重建 users 表"的专项迁移
DELETE FROM schema_migrations WHERE name = '0002_ban.up.sql';
