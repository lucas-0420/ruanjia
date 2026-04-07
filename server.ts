import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as line from '@line/bot-sdk';
import { GoogleGenAI } from "@google/genai";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Admin (Service Role)
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// LINE Bot Config
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

const lineClient = new line.messagingApi.MessagingApiClient(lineConfig);

// Gemini Config
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const app = express();
const PORT = 3000;

// ── 資安：HTTP 安全標頭（防 XSS / clickjacking / MIME 嗅探等）──
app.use(helmet({
  // CSP 略過，由前端框架（Vite/React）自行管理
  contentSecurityPolicy: false,
}));

// ── 資安：速率限制 ──
// 一般 API：每 IP 每 15 分鐘 200 次
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '請求過於頻繁，請稍後再試' },
});
// 寫入操作（新增/更新/刪除）：每 IP 每 15 分鐘 30 次
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '操作過於頻繁，請稍後再試' },
});
// 管理後台：每 IP 每 15 分鐘 100 次
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '請求過於頻繁，請稍後再試' },
});

// --- LOGGING MIDDLEWARE (TOP) ---
const serverLogs: string[] = [];
const addLog = (msg: string) => {
  const log = `[${new Date().toLocaleTimeString()}] ${msg}`;
  console.log(log);
  serverLogs.push(log);
  if (serverLogs.length > 100) serverLogs.shift();
};

app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  
  if (req.url.includes('webhook') || req.url.includes('line')) {
    addLog(`[INCOMING] ${req.method} ${req.url} (Proto: ${proto}, UA: ${ua.substring(0, 30)}...)`);
  }
  
  res.on('finish', () => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.statusCode !== 304) {
      addLog(`[REDIRECT] ${req.method} ${req.url} -> ${res.statusCode} to ${res.getHeader('Location')}`);
    }
  });
  next();
});

// Disable strict routing
app.set('strict routing', false);
app.set('case sensitive routing', false);

// Helper to parse property info from text using Gemini
function parsePropertyFromText(text: string) {
  const result: any = {};

  // 區 → 城市對照表
  const districtToCity: Record<string, string> = {
    // 台北市
    '信義區':'台北市','大安區':'台北市','中山區':'台北市','中正區':'台北市','松山區':'台北市',
    '內湖區':'台北市','南港區':'台北市','士林區':'台北市','北投區':'台北市','文山區':'台北市',
    '大同區':'台北市','萬華區':'台北市',
    // 新北市
    '板橋區':'新北市','三重區':'新北市','中和區':'新北市','永和區':'新北市','新莊區':'新北市',
    '新店區':'新北市','樹林區':'新北市','鶯歌區':'新北市','三峽區':'新北市','淡水區':'新北市',
    '汐止區':'新北市','瑞芳區':'新北市','土城區':'新北市','蘆洲區':'新北市','五股區':'新北市',
    '泰山區':'新北市','林口區':'新北市','深坑區':'新北市','石碇區':'新北市','坪林區':'新北市',
    // 台中市
    '中區':'台中市','東區':'台中市','西區':'台中市','南區':'台中市','北區':'台中市',
    '北屯區':'台中市','西屯區':'台中市','南屯區':'台中市','太平區':'台中市','大里區':'台中市',
    '霧峰區':'台中市','烏日區':'台中市','豐原區':'台中市','后里區':'台中市','神岡區':'台中市',
    '潭子區':'台中市','大雅區':'台中市','新社區':'台中市','石岡區':'台中市','東勢區':'台中市',
    '和平區':'台中市','大甲區':'台中市','外埔區':'台中市','大安區_tc':'台中市','梧棲區':'台中市',
    '清水區':'台中市','沙鹿區':'台中市','龍井區':'台中市','大肚區':'台中市',
    // 高雄市
    '鹽埕區':'高雄市','鼓山區':'高雄市','左營區':'高雄市','楠梓區':'高雄市','三民區':'高雄市',
    '新興區':'高雄市','前金區':'高雄市','苓雅區':'高雄市','前鎮區':'高雄市','旗津區':'高雄市',
    '小港區':'高雄市','鳳山區':'高雄市','林園區':'高雄市','大寮區':'高雄市','大樹區':'高雄市',
    '大社區':'高雄市','仁武區':'高雄市','鳥松區':'高雄市','岡山區':'高雄市','橋頭區':'高雄市',
    // 台南市
    '中西區':'台南市','東區_tn':'台南市','南區_tn':'台南市','北區_tn':'台南市','安平區':'台南市',
    '安南區':'台南市','永康區':'台南市','歸仁區':'台南市','新化區':'台南市','左鎮區':'台南市',
    // 桃園市
    '桃園區':'桃園市','中壢區':'桃園市','平鎮區':'桃園市','八德區':'桃園市','楊梅區':'桃園市',
    '蘆竹區':'桃園市','大溪區':'桃園市','龜山區':'桃園市','大園區':'桃園市','觀音區':'桃園市',
  };

  // 價格：優先抓 "數字 / 租金" 或 "租金：數字"，避免抓到房號
  const rentLineMatch = text.match(/房號[\/\s]*租金[^]*?(\d{4,6})/);
  const simpleRentMatch = text.match(/租金[：:]\s*(\d{4,6})/u);
  const slashPriceMatch = text.match(/[房號\d]+\s*\/\s*(\d{4,6})/);
  const rawPriceMatch = text.match(/(\d{4,6})\s*[元\/月]/u);
  const priceStr = (rentLineMatch?.[1] || simpleRentMatch?.[1] || slashPriceMatch?.[1] || rawPriceMatch?.[1] || '').replace(/,/g, '');
  if (priceStr) result.price = parseInt(priceStr);

  // 地址解析
  const addrMatch = text.match(/(?:地址|地點|位置)[：:]\s*(.+)/);
  if (addrMatch) {
    const addr = addrMatch[1].trim();
    const cityMatch = addr.match(/^(台北市|新北市|桃園市|台中市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|台東縣)/);
    if (cityMatch) {
      result.city = cityMatch[1];
      const rest = addr.slice(result.city.length);
      const dm = rest.match(/^(\S{2,4}[區鄉鎮市])/);
      if (dm) { result.district = dm[1]; result.address = rest.slice(dm[1].length).trim(); }
      else result.address = rest.trim();
    } else {
      // 地址沒有城市 → 從區名推算
      const dm = addr.match(/^(\S{2,4}[區鄉鎮市])/);
      if (dm) {
        result.district = dm[1];
        result.city = districtToCity[dm[1]] || '';
        result.address = addr.slice(dm[1].length).trim();
      } else {
        result.address = addr;
      }
    }
  }

  // 坪數
  const areaMatch = text.match(/(\d+\.?\d*)\s*坪/);
  if (areaMatch) result.area = parseFloat(areaMatch[1]);

  // 格局/房型
  const roomMatch = text.match(/([一二三四五六１２３４５６1-6])\s*房/);
  const bathMatch = text.match(/([一二三四五六１２３４５６1-6])\s*衛/);
  const toNum: Record<string, number> = { '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'１':1,'２':2,'３':3,'４':4,'５':5,'６':6 };
  if (roomMatch) result.bedrooms = toNum[roomMatch[1]] ?? parseInt(roomMatch[1]) ?? 1;
  if (bathMatch) result.bathrooms = toNum[bathMatch[1]] ?? parseInt(bathMatch[1]) ?? 1;

  // 總樓層
  const totalFloorMatch = text.match(/總樓層[：:\s]*(\d+)/);
  if (totalFloorMatch) result.totalFloors = parseInt(totalFloorMatch[1]);

  // 樓層
  const floorMatch = text.match(/樓層[：:\s]*(\d+)\s*樓/);
  if (floorMatch) result.floor = parseInt(floorMatch[1]);

  // 押金
  const depositMatch = text.match(/簽約[：:]\s*(.+)/);
  if (depositMatch) result.deposit = depositMatch[1].trim();

  // 房型類型
  if (/套房|獨立套|電梯套/.test(text)) result.type = 'studio';
  else if (/雅房|分租/.test(text)) result.type = 'room';
  else if (/透天|別墅/.test(text)) result.type = 'house';
  else result.type = 'apartment';

  // 標題：社區名稱 > 第一行 > 區+類型
  const communityMatch = text.match(/社區名稱[：:]\s*(.+)/);
  const firstLine = text.split('\n')[0].replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}]/gu, '').trim().substring(0, 30);
  if (communityMatch && result.district) {
    result.title = `${result.district} ${communityMatch[1].trim()}`;
  } else if (firstLine && firstLine.length > 5) {
    result.title = firstLine;
  } else if (result.district) {
    const typeLabel = result.type === 'studio' ? '套房' : result.type === 'room' ? '雅房' : `${result.bedrooms || ''}房`;
    result.title = `${result.city || ''}${result.district} ${typeLabel}`;
  }

  // 描述
  result.description = text.substring(0, 500);

  // 資料不足則回傳 null
  if (!result.price || !result.city) return null;

  return result;
}

// ── Zod Schema：驗證 PUT /api/properties/:id 的 request body ──
const propertyUpdateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  price: z.number().int().min(0).max(999999).optional(),
  type: z.enum(['studio', 'room', 'apartment', 'house']).optional(),
  city: z.string().max(10).optional(),
  district: z.string().max(10).optional(),
  address: z.string().max(100).optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  area: z.number().min(0).max(9999).optional(),
  floor: z.number().int().min(0).max(200).optional(),
  total_floors: z.number().int().min(0).max(200).optional(),
  management_fee: z.number().int().min(0).optional(),
  deposit: z.string().max(100).optional(),
  amenities: z.array(z.string().max(30)).max(50).optional(),
  images: z.array(z.string().url()).max(30).optional(),
  description: z.string().max(5000).optional(),
  owner_name: z.string().max(50).optional(),
  owner_phone: z.string().max(20).optional(),
  owner_line_id: z.string().max(50).optional(),
  owner_avatar: z.string().max(500).optional(),
  is_zero_fee: z.boolean().optional(),
  tags: z.array(z.string().max(20)).max(20).optional(),
  status: z.enum(['active', 'archived']).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

// --- AI Chat API (安全：API Key 只在後端) ---
app.post('/api/ai/chat', apiLimiter, async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'AI 服務未設定' });
  }

  const { message, property } = req.body;
  if (!message) return res.status(400).json({ error: '缺少訊息內容' });

  try {
    const systemInstruction = `你是一位專業的租屋助手，服務於「租家 AI 地產」。
    ${property ? `你目前正在協助用戶查看這間房源：${property.title}。
    租金：${property.price} 元。地點：${property.city}${property.district}。
    格局：${property.bedrooms}房${property.bathrooms}衛，坪數：${property.area}坪。
    詳細描述：${property.description}` : ''}
    請用繁體中文回答，語氣專業且親切。專注於提供房源見解、周邊生活機能或租屋建議。`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: message,
      config: { systemInstruction },
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    addLog(`[AI-CHAT-ERROR] ${error.message}`);
    res.status(500).json({ error: '無法取得 AI 回應' });
  }
});

// --- LINE Webhook Handler (ABSOLUTE TOP) ---
// We use a regex to match webhook paths and ensure no redirects happen
const webhookPaths = /^\/(api\/line\/webhook|line|webhook)\/?$/;

app.all(webhookPaths, (req, res, next) => {
  if (req.method === 'GET') {
    addLog(`[WEBHOOK-GET-VERIFY] ${req.url}`);
    return res.status(200).send('Webhook is active');
  }
  next();
});

app.post(webhookPaths, express.raw({ type: '*/*' }), async (req, res) => {
  let body: any = {};
  try {
    const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : '{}';
    body = JSON.parse(rawBody || '{}');
  } catch {
    return res.status(200).send('OK');
  }
  const events = body.events || [];
  
  for (const event of events) {
    try {
      if (event.type === 'message') {
        const { message, source, timestamp } = event;
        const userId = source.userId;
        
        if (message.type === 'text') {
          addLog(`Received LINE text message from ${userId}`);
          const parsedData = await parsePropertyFromText(message.text);

          // 查詢是否有平台帳號綁定此 LINE userId
          const { data: linkedUser } = await supabase
            .from('users')
            .select('id, display_name, photo_url')
            .eq('line_user_id', userId)
            .single();

          // 取得顯示名稱與頭像：優先用平台帳號資料，否則用 LINE 個人資料
          let ownerName = 'LINE 房東';
          let ownerAvatar = '';
          let platformOwnerId: string | null = linkedUser?.id || null;

          if (linkedUser) {
            // 已綁定平台帳號 → 用平台資料
            ownerName = linkedUser.display_name || 'LINE 房東';
            ownerAvatar = linkedUser.photo_url || '';
            addLog(`[LINE] Linked to platform user: ${linkedUser.id}`);
          } else {
            // 未綁定 → 用 LINE 個人資料，房源標記為待審核
            try {
              const profile = await lineClient.getProfile(userId);
              ownerName = profile.displayName;
              ownerAvatar = profile.pictureUrl || '';
            } catch (e: any) {
              addLog(`Cannot get LINE profile: ${e.message}`);
            }
            addLog(`[LINE] No platform account linked for LINE user: ${userId}`);
          }

          // 判斷是否有足夠資料自動上架
          const canAutoList = parsedData && parsedData.title && parsedData.price && parsedData.city;
          let propertyId: string | null = null;

          if (canAutoList) {
            const { data: newProperty, error: propErr } = await supabase.from('properties').insert({
              title: parsedData.title,
              price: parsedData.price,
              type: parsedData.type || 'apartment',
              city: parsedData.city,
              district: parsedData.district || '',
              address: parsedData.address || '',
              bedrooms: parsedData.bedrooms || 1,
              bathrooms: parsedData.bathrooms || 1,
              area: parsedData.area || 0,
              description: parsedData.description || '',
              owner_id: platformOwnerId,            // 綁定平台帳號則掛在該帳號下
              owner_name: ownerName,
              owner_phone: '',
              owner_line_id: userId,                // LINE User ID，供聯絡按鈕使用
              owner_avatar: ownerAvatar,
              owner_role: platformOwnerId ? '仲介' : 'LINE', // 已綁定顯示仲介，否則標記 LINE 來源
              is_zero_fee: true,
              status: platformOwnerId ? 'active' : 'pending', // 未綁定先設為待審核
              images: [],
              tags: [],
            }).select('id').single();

            if (!propErr && newProperty) {
              propertyId = newProperty.id;
              addLog(`[AUTO-LIST] Property created: ${propertyId} (${parsedData.title})`);
            } else {
              addLog(`[AUTO-LIST] Failed to create property: ${propErr?.message}`);
            }
          }

          await supabase.from('line_messages').insert({
            line_message_id: message.id,
            text: message.text,
            user_id: userId,
            status: propertyId ? 'processed' : 'pending',
            source: source.type === 'group' ? 'group' : 'direct',
            parsed_data: { ...(parsedData || {}), property_id: propertyId },
          });

        } else if (message.type === 'image') {
          addLog(`Received LINE image from ${userId}`);
          let imageUrl = '';
          try {
            addLog(`[IMG] Fetching message ${message.id}`);
            const imgResponse = await fetch(`https://api-data.line.me/v2/bot/message/${message.id}/content`, {
              headers: { Authorization: `Bearer ${lineConfig.channelAccessToken}` },
            });
            addLog(`[IMG] LINE API status: ${imgResponse.status}`);
            if (!imgResponse.ok) {
              const errText = await imgResponse.text();
              throw new Error(`LINE API ${imgResponse.status}: ${errText}`);
            }
            const arrayBuffer = await imgResponse.arrayBuffer();
            addLog(`[IMG] Downloaded ${arrayBuffer.byteLength} bytes`);
            const imageBuffer = Buffer.from(arrayBuffer);

            const fileName = `line-images/${userId}_${message.id}.jpg`;
            const { error: storageErr } = await supabase.storage.from('property-images').upload(fileName, imageBuffer, { contentType: 'image/jpeg', upsert: true });
            if (storageErr) {
              addLog(`[STORAGE-ERROR] ${storageErr.message}`);
            } else {
              const { data: urlData } = supabase.storage.from('property-images').getPublicUrl(fileName);
              imageUrl = urlData.publicUrl;
              addLog(`[IMG] Saved to Storage: ${imageUrl}`);
            }
          } catch (imgErr: any) {
            addLog(`[IMG-ERROR] ${imgErr.message}`);
          }

          // 將圖片附加到此用戶最近 24 小時內的最新房源
          if (imageUrl) {
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: recentMsg } = await supabase
              .from('line_messages')
              .select('parsed_data')
              .eq('user_id', userId)
              .eq('status', 'processed')
              .gte('created_at', since)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const propertyId = recentMsg?.parsed_data?.property_id;
            if (propertyId) {
              const { data: prop } = await supabase.from('properties').select('images').eq('id', propertyId).single();
              if (prop) {
                await supabase.from('properties').update({
                  images: [...(prop.images || []), imageUrl],
                }).eq('id', propertyId);
                addLog(`[AUTO-LIST] Image appended to property ${propertyId}`);
              }
            }
          }

          await supabase.from('line_messages').insert({
            line_message_id: message.id,
            text: imageUrl ? '[圖片訊息]' : '[圖片訊息 - 無法下載]',
            user_id: userId,
            status: 'pending',
            source: source.type === 'group' ? 'group' : 'direct',
            type: 'image',
            images: imageUrl ? [imageUrl] : [],
          });

        } else if (message.type === 'video') {
          addLog(`Received LINE video from ${userId}`);
          let videoUrl = '';
          try {
            // 等待 LINE 影片轉碼完成（最多 30 秒）
            let ready = false;
            for (let i = 0; i < 6; i++) {
              const statusRes = await fetch(`https://api-data.line.me/v2/bot/message/${message.id}/content/transcoding`, {
                headers: { Authorization: `Bearer ${lineConfig.channelAccessToken}` },
              });
              const statusData = await statusRes.json() as any;
              addLog(`[VIDEO] Transcoding status: ${statusData.status}`);
              if (statusData.status === 'succeeded') { ready = true; break; }
              if (statusData.status === 'failed') break;
              await new Promise(r => setTimeout(r, 5000));
            }
            if (!ready) throw new Error('Transcoding not ready');

            const vidResponse = await fetch(`https://api-data.line.me/v2/bot/message/${message.id}/content`, {
              headers: { Authorization: `Bearer ${lineConfig.channelAccessToken}` },
            });
            if (!vidResponse.ok) throw new Error(`LINE API ${vidResponse.status}`);
            const arrayBuffer = await vidResponse.arrayBuffer();
            const videoBuffer = Buffer.from(arrayBuffer);

            const fileName = `line-videos/${userId}_${message.id}.mp4`;
            const { error: storageErr } = await supabase.storage.from('property-images').upload(fileName, videoBuffer, { contentType: 'video/mp4', upsert: true });
            if (storageErr) {
              addLog(`[VIDEO-STORAGE-ERROR] ${storageErr.message}`);
            } else {
              const { data: urlData } = supabase.storage.from('property-images').getPublicUrl(fileName);
              videoUrl = urlData.publicUrl;
              addLog(`[VIDEO] Saved: ${videoUrl}`);
            }
          } catch (vidErr: any) {
            addLog(`[VIDEO-ERROR] ${vidErr.message}`);
          }

          await supabase.from('line_messages').insert({
            line_message_id: message.id,
            text: videoUrl ? '[影片訊息]' : '[影片訊息 - 無法下載]',
            user_id: userId,
            status: 'pending',
            source: source.type === 'group' ? 'group' : 'direct',
            type: 'video',
            images: videoUrl ? [videoUrl] : [],
          });
        }
      }
    } catch (e: any) {
      addLog(`ERROR processing event: ${e.message}`);
    }
  }
  
  res.status(200).json({ status: 'ok' });
});

// --- Standard Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 驗證 JWT 並回傳用戶資料（透過 Supabase 驗簽，防偽造）
async function verifyToken(token: string): Promise<{ id: string; email: string } | null> {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { id: user.id, email: user.email || '' };
}

// 查詢資料庫確認是否為 admin（唯一判斷依據，不依賴 email）
async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.from('users').select('role').eq('id', userId).single();
  return data?.role === 'admin';
}

// Admin Auth Middleware
const requireAdmin = async (req: any, res: any, next: any) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未授權' });

  const user = await verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Token 無效' });

  if (!(await checkIsAdmin(user.id))) return res.status(403).json({ error: '權限不足' });

  req.user = user;
  next();
};

// Admin Logs API
app.get('/api/admin/logs', adminLimiter, requireAdmin, (req, res) => {
  res.json({ logs: serverLogs });
});

// Admin Users API (service role bypasses RLS)
app.get('/api/admin/users', adminLimiter, requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: '無法取得用戶列表' });
  res.json({ users: data });
});

// Admin Properties API — 查詢平台全部房源（含下架、含 LINE 上架的 owner_id=null）
// 用 service role key 繞過 RLS，anon key 看不到下架的 LINE 房源
app.get('/api/admin/properties', adminLimiter, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: '無法取得房源列表' });
  res.json({ properties: data });
});

// Image upload API (service role bypasses storage RLS)
app.post('/api/upload/image', writeLimiter, express.raw({ type: () => true, limit: '55mb' }), async (req: any, res: any) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未授權' });
  const uploadUser = await verifyToken(token);
  if (!uploadUser) return res.status(401).json({ error: 'Token 無效' });

  const mimeType = ((req.headers['content-type'] as string) || 'image/jpeg').split(';')[0].trim();
  // 白名單：只允許圖片格式，防止上傳惡意檔案
  const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!ALLOWED_MIMES.includes(mimeType)) {
    return res.status(400).json({ error: '不支援的檔案格式，請上傳 JPG/PNG/WEBP/GIF' });
  }
  const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
  const fileName = `properties/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('property-images').upload(fileName, req.body, { contentType: mimeType });
  if (error) return res.status(500).json({ error: '圖片上傳失敗，請稍後再試' });
  const { data } = supabase.storage.from('property-images').getPublicUrl(fileName);
  res.json({ url: data.publicUrl });
});

// Public user profile (no auth needed, only exposes safe fields)
app.get('/api/users/:id', apiLimiter, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, photo_url, role')
    .eq('id', id)
    .single();
  if (error) return res.status(404).json({ error: '找不到用戶' });
  res.json(data);
});

// 通用屬性更新：owner 或 admin 皆可，用 service key 繞過 RLS
app.put('/api/properties/:id', writeLimiter, async (req: any, res: any) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未授權' });

  const authUser = await verifyToken(token);
  if (!authUser) return res.status(401).json({ error: 'Token 無效' });

  const userId = authUser.id;
  const { id } = req.params;

  // Zod 驗證 request body（防止惡意資料注入）
  const parsed = propertyUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: '資料格式錯誤', details: parsed.error.flatten().fieldErrors });
  }

  // 檢查是否為 owner 或 admin
  const { data: prop } = await supabase.from('properties').select('owner_id').eq('id', id).single();
  if (!prop) return res.status(404).json({ error: '找不到物件' });

  const isAdmin = await checkIsAdmin(userId);
  const isOwner = prop.owner_id === userId;

  if (!isAdmin && !isOwner) return res.status(403).json({ error: '無權限修改此物件' });

  // 使用 Zod 解析後的乾淨資料（已移除未知欄位，防止多傳欄位）
  const updates = parsed.data as Record<string, unknown>;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: '沒有可更新的欄位' });

  const { error } = await supabase.from('properties').update(updates).eq('id', id);
  if (error) return res.status(500).json({ error: '更新失敗，請稍後再試' });
  res.json({ ok: true });
});

// 刪除房源：只有 owner 或 admin 才能刪
app.delete('/api/properties/:id', writeLimiter, async (req: any, res: any) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未授權' });

  const authUser = await verifyToken(token);
  if (!authUser) return res.status(401).json({ error: 'Token 無效' });

  const { id } = req.params;
  const { data: prop } = await supabase.from('properties').select('owner_id').eq('id', id).single();
  if (!prop) return res.status(404).json({ error: '找不到物件' });

  const isAdmin = await checkIsAdmin(authUser.id);
  const isOwner = prop.owner_id === authUser.id;
  if (!isAdmin && !isOwner) return res.status(403).json({ error: '無權限刪除此物件' });

  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) return res.status(500).json({ error: '刪除失敗，請稍後再試' });
  res.json({ ok: true });
});

app.patch('/api/admin/users/:id/role', adminLimiter, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['user', 'agent', 'admin'].includes(role)) return res.status(400).json({ error: '無效角色' });
  const { error } = await supabase.from('users').update({ role }).eq('id', id);
  if (error) return res.status(500).json({ error: '更新角色失敗，請稍後再試' });
  res.json({ ok: true });
});

app.post('/api/admin/test-log', adminLimiter, requireAdmin, (req, res) => {
  addLog('TEST: 這是手動發送的測試日誌');
  res.json({ status: 'ok' });
});

// API routes
app.get(['/api/health', '/api/health/'], (req, res) => {
  res.json({ status: 'ok' });
});

app.get(['/api/config-status', '/api/config-status/'], (req, res) => {
  res.json({
    supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    lineConfigured: !!(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET)
  });
});

/* ── Google Places API (New) Nearby Search 代理 ── */
app.get('/api/nearby', async (req, res) => {
  const { lat, lng, type, radius = '2000' } = req.query as Record<string, string>;
  const key = process.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!lat || !lng || !type || !key) {
    return res.status(400).json({ error: 'missing params' });
  }

  try {
    // Places API (New) 使用 POST + JSON body
    const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.displayName,places.location',
      },
      body: JSON.stringify({
        includedTypes: [type],
        maxResultCount: 20,
        languageCode: 'zh-TW',
        locationRestriction: {
          circle: {
            center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
            radius: parseFloat(radius),
          },
        },
      }),
    });

    const data = await r.json() as any;

    if (!r.ok) {
      addLog(`[NEARBY-ERROR] Places API: ${data.error?.message}`);
      return res.status(502).json({ error: data.error?.status, message: data.error?.message });
    }

    const results = (data.places || []).map((p: any) => ({
      name: p.displayName?.text || '',
      lat: p.location?.latitude,
      lng: p.location?.longitude,
    })).filter((p: any) => p.name && p.lat && p.lng);

    res.json({ results });
  } catch (e: any) {
    addLog(`[NEARBY-ERROR] ${e.message}`);
    res.status(500).json({ error: 'internal' });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// --- AI 輔助路由 ---
app.post('/api/ai/autofill', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'AI 未設定' });
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '缺少文字' });
  try {
    const prompt = `你是一位專業的房地產助手。請從以下房源描述中提取資訊，只回傳 JSON，不要其他文字。\n描述：${text.substring(0,2000)}\nJSON格式：{"title":"","price":0,"type":"apartment","city":"","district":"","address":"","bedrooms":0,"bathrooms":0,"area":0,"floor":0,"totalFloors":0,"managementFee":0,"deposit":"兩個月","amenities":[],"description":""}`;
    const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt, config: { responseMimeType: "application/json" } });
    const result = JSON.parse((response.text ?? '').replace(/```json|```/g,'').trim());
    res.json(result);
  } catch(e: any) {
    addLog(`[AI-AUTOFILL-ERROR] ${e.message}`);
    res.status(500).json({ error: 'AI 自動填寫失敗' });
  }
});

app.post('/api/ai/description', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'AI 未設定' });
  const { formData } = req.body;
  try {
    const prompt = `你是房地產文案專家，請根據以下資訊生成吸引人的繁體中文房源介紹，直接輸出介紹文字，不要其他說明。標題：${formData.title}，類型：${formData.type}，地點：${formData.city}${formData.district}，格局：${formData.bedrooms}房${formData.bathrooms}衛${formData.area}坪，設施：${(formData.amenities||[]).join('、')}`;
    const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.json({ text: response.text });
  } catch(e: any) {
    addLog(`[AI-DESCRIPTION-ERROR] ${e.message}`);
    res.status(500).json({ error: 'AI 描述生成失敗' });
  }
});

app.post('/api/ai/tags', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'AI 未設定' });
  const { description } = req.body;
  try {
    const prompt = `根據以下房源描述生成 3-5 個簡短標籤（例如：近捷運、全新裝潢），只輸出標籤，用逗號分隔，不要其他文字。描述：${(description||'').substring(0,1000)}`;
    const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.json({ tags: response.text });
  } catch(e: any) {
    addLog(`[AI-TAGS-ERROR] ${e.message}`);
    res.status(500).json({ error: 'AI 標籤生成失敗' });
  }
});
