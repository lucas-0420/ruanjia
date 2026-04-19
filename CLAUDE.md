# 暖家專案

<!-- 身份背景：台灣房仲，4月10號入伍當兵（4-12個月），假日可用手機。開發環境：GitHub Codespaces + Claude Code -->

## 專案一：租屋平台（主專案，類似591）

技術棧：React + Vite + Supabase + PostgreSQL

<!-- 已完成功能：房源列表/詳細頁、篩選列、地圖找房、收藏、發布房源+Geocoding、仲介後台、管理員後台、LINE Bot、屋主顯示上架下架 -->

### 待開發
- P1：手機版 UI/UX 優化、line_user_id SQL
- P2：瀏覽紀錄、詢問留言、預約看房
- P3：數據統計、LINE 詢問通知
- P4：SEO、部署穩定性

### 核心設計決策
- 價格顯示：租金+管理費總價，車位費獨立選配
- 同物件去重：多仲介刊登同一房源合併為一筆，詳細頁下方顯示多位仲介依評分排序
- 排序機制：總分 = 基礎分 + 行為分 + 付費加分（有上限，非純置頂）
- 打分機制：AI 負責照片品質/資訊完整度/行為數據，人工負責首次審核/申訴

<!-- 未來規劃（退伍後）：雙向評分、個人化推薦、房仲主動找租客、KYC、CRM、線上簽約、即時聊天、官方LINE、AI模組、商業模式 -->

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
