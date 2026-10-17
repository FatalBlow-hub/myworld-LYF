-- 回滚 0003 游戏状态权威化：两张表一起删（无其他依赖），回滚后代码也会退回"存档里的值就是真的"
DROP TABLE IF EXISTS game_state;
DROP TABLE IF EXISTS coin_log;
DELETE FROM schema_migrations WHERE name = '0003_gamestate.up.sql';
