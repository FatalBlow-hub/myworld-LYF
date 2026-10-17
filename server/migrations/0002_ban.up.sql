-- 0002 账号封停（2026-10-18）：users 加 banned 标记 —— 家长在控制台停用某个账号
-- 封停 = 不能登录（登录接口拒绝）+ 已发的通行证全作废 + 在线的踢下线；解封即恢复
-- 风险等级：低（只加一列，带默认值 0，不碰既有数据）
ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0;
