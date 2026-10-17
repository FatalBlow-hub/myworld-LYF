-- 回滚 0001 幼儿防沉迷：删两张新表 + 放回迁移记录（允许重新 up）
-- users.is_admin 保守保留不删：SQLite 老版本不支持 DROP COLUMN，删列属高风险；
-- 代码不读该列即等同回滚，确需删除时安排"重建 users 表"的专项迁移
DROP TABLE IF EXISTS playtime_daily;
DROP TABLE IF EXISTS addict_config;
DELETE FROM schema_migrations WHERE name = '0001_addict.up.sql';
