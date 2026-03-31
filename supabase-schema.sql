-- ============================================
-- 租家 AI 地產 - Supabase Schema
-- 在 Supabase Dashboard > SQL Editor 執行此檔案
-- ============================================

-- 啟用 UUID 擴充
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. 用戶資料表
-- ============================================
create table if not exists users (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  photo_url text,
  role text default 'user',
  favorites text[] default '{}',
  created_at timestamptz default now()
);
alter table users enable row level security;
create policy "用戶只能讀寫自己的資料" on users
  using (auth.uid() = id);
create policy "用戶可以新增自己的資料" on users for insert
  with check (auth.uid() = id);

-- ============================================
-- 2. 房源資料表
-- ============================================
create table if not exists properties (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  price integer not null,
  type text check (type in ('apartment','house','studio','room')) default 'apartment',
  city text not null,
  district text not null,
  address text not null,
  lat double precision default 25.0330,
  lng double precision default 121.5654,
  bedrooms integer default 1,
  bathrooms integer default 1,
  area numeric default 0,
  floor integer default 1,
  total_floors integer,
  management_fee integer default 0,
  deposit text default '兩個月',
  amenities text[] default '{}',
  images text[] default '{}',
  description text,
  owner_id uuid references users(id),
  owner_name text,
  owner_phone text,
  owner_avatar text,
  owner_role text default '屋主',
  is_zero_fee boolean default true,
  tags text[] default '{}',
  status text default 'active' check (status in ('active','archived')),
  created_at timestamptz default now()
);
alter table properties enable row level security;
create policy "所有人可以讀取上架房源" on properties for select
  using (status = 'active' or auth.uid() = owner_id);
create policy "登入用戶可以新增房源" on properties for insert
  with check (auth.uid() = owner_id);
create policy "房源擁有者可以修改" on properties for update
  using (auth.uid() = owner_id);
create policy "房源擁有者可以刪除" on properties for delete
  using (auth.uid() = owner_id);

-- ============================================
-- 3. LINE 訊息資料表
-- ============================================
create table if not exists line_messages (
  id uuid default uuid_generate_v4() primary key,
  line_message_id text,
  text text,
  user_id text,
  status text default 'pending' check (status in ('pending','processed','ignored')),
  source text default 'direct',
  type text default 'text',
  images text[] default '{}',
  parsed_data jsonb default '{}',
  created_at timestamptz default now()
);
alter table line_messages enable row level security;
create policy "只有管理員可以讀取 LINE 訊息" on line_messages for select
  using (exists (select 1 from users where id = auth.uid() and role = 'admin'));
create policy "服務帳戶可以新增 LINE 訊息" on line_messages for insert
  with check (true);
create policy "管理員可以更新 LINE 訊息" on line_messages for update
  using (exists (select 1 from users where id = auth.uid() and role = 'admin'));
create policy "管理員可以刪除 LINE 訊息" on line_messages for delete
  using (exists (select 1 from users where id = auth.uid() and role = 'admin'));

-- ============================================
-- 4. 預約資料表
-- ============================================
create table if not exists bookings (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references properties(id) on delete cascade,
  property_title text,
  user_id uuid references users(id) on delete cascade,
  user_name text,
  user_phone text,
  date text,
  time text,
  status text default 'pending' check (status in ('pending','confirmed','cancelled')),
  created_at timestamptz default now()
);
alter table bookings enable row level security;
create policy "用戶可以讀取自己的預約" on bookings for select
  using (auth.uid() = user_id or exists (select 1 from users where id = auth.uid() and role = 'admin'));
create policy "登入用戶可以新增預約" on bookings for insert
  with check (auth.uid() = user_id);
create policy "管理員可以更新預約狀態" on bookings for update
  using (exists (select 1 from users where id = auth.uid() and role = 'admin'));

-- ============================================
-- 5. 訊息資料表
-- ============================================
create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references properties(id) on delete cascade,
  property_title text,
  sender_id uuid references users(id) on delete cascade,
  sender_name text,
  content text,
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table messages enable row level security;
create policy "用戶可以讀取自己的訊息" on messages for select
  using (auth.uid() = sender_id or exists (select 1 from users where id = auth.uid() and role = 'admin'));
create policy "登入用戶可以發送訊息" on messages for insert
  with check (auth.uid() = sender_id);
create policy "管理員可以更新訊息" on messages for update
  using (exists (select 1 from users where id = auth.uid() and role = 'admin'));

-- ============================================
-- 6. Realtime 啟用
-- ============================================
alter publication supabase_realtime add table properties;
alter publication supabase_realtime add table line_messages;
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table messages;

-- ============================================
-- 7. Storage Bucket（在 Dashboard > Storage 手動建立）
-- Bucket 名稱: property-images
-- Public: true
-- ============================================
