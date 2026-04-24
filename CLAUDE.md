# 暖家專案

<!-- 身份背景：台灣房仲，2026-04-10 入伍，役期一年至 2027-04-10。假日 + 收假前可用手機開發。開發環境：GitHub Codespaces + Claude Code -->

## 開發路線圖

### ✅ 已完成（入伍前）
租屋平台 MVP：房源列表/詳細頁、篩選列（橫向城市選擇器）、地圖三層縮放、收藏、發布房源+Geocoding、仲介後台、管理員後台、LINE Bot、ErrorBoundary、Toast、卡片圖片輪播

### 🪖 服役期假日衝刺（2026-04 → 2027-04）

**專案一：租屋平台 P2/P3**
- 詢問留言（租客留言 → LINE 通知仲介）
- 預約看房（選時段 + 雙方 LINE 提醒）
- 瀏覽紀錄
- 數據統計後台（曝光/點擊/詢問）
- line_user_id SQL migration
- SEO + 部署穩定性

**專案二：房仲內部系統（同步進行，急）**
- 物件新增／編輯／刪除
- 照片影片上傳（Supabase Storage）
- 一鍵推送到租屋平台
- LINE Bot 快速上架（截圖即建檔）
- 基本搜尋篩選

### 🚀 退伍後全速（2027-04+）
- IoT 雲端門鎖 + 無人帶看
- 智慧電錶 + 自動帳單
- 財務代墊 + AI 收據辨識
- 聯賣配件系統、拆傭機制
- 專案三：AI 一人公司自動維運

<!-- 長期願景：「JGB骨架、香蕉皮、AI腦」— 競品對標 JGB智慧租賃(租約/財務)、香蕉同居(Mobile First視覺) -->

---

## 專案一：租屋平台

技術棧：React + Vite + Supabase + PostgreSQL

### 核心設計決策
- 價格顯示：租金+管理費總價，車位費獨立選配
- 同物件去重：多仲介刊登同一房源合併為一筆，詳細頁下方顯示多位仲介依評分排序
- 排序機制：總分 = 基礎分 + 行為分 + 付費加分（有上限，非純置頂）
- 打分機制：AI 負責照片品質/資訊完整度/行為數據，人工負責首次審核/申訴

---

## 專案二 & 三

@.claude/projects/project2.md
@.claude/projects/project3.md

---

## 技術規範

- 前端：React + Vite + TypeScript
- 資料庫：Supabase（PostgreSQL）
- 儲存：Supabase Storage（照片/影片）
- 部署：Vercel（前端）/ Railway（後端）
- 版控：GitHub
- AI：Claude API
- 通訊：LINE Bot / Telegram Bot
