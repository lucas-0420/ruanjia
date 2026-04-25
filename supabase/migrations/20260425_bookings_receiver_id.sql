-- bookings 表補 receiver_id（仲介 user id，用於查詢自己收到的預約）
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS receiver_id TEXT DEFAULT 'admin';
