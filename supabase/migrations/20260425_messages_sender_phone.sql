-- 詢問留言系統：messages 表補 sender_phone 欄位（訪客詢問時使用）
-- 執行方式：Supabase Dashboard → SQL Editor → 貼上執行

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS sender_phone TEXT DEFAULT '';

-- 確認欄位存在
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'messages';
