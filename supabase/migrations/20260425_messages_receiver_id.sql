-- messages 表補 receiver_id（仲介 user id，用於 Navbar 未讀數查詢與 AgentDashboard 收件匣）
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS receiver_id TEXT DEFAULT 'admin';
