-- 回滚 0004：删掉留言板与信箱两张表
DROP INDEX IF EXISTS idx_mails_to;
DROP TABLE IF EXISTS mails;
DROP INDEX IF EXISTS idx_board_posts_created;
DROP TABLE IF EXISTS board_posts;
