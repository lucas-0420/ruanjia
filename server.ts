import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as line from '@line/bot-sdk';
import { GoogleGenAI } from "@google/genai";

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
const lineBlobClient = new line.messagingApi.MessagingApiBlobClient(lineConfig);

// Gemini Config
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const app = express();
const PORT = 3000;

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

// --- AI Chat API (安全：API Key 只在後端) ---
app.post('/api/ai/chat', async (req, res) => {
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
    console.error('AI chat error:', error);
    res.status(500).json({ error: '無法取得 AI 回應', detail: error.message });
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

          // 取得 LINE 用戶名稱
          let ownerName = 'LINE 房東';
          let ownerAvatar = '';
          try {
            const profile = await lineClient.getProfile(userId);
            ownerName = profile.displayName;
            ownerAvatar = profile.pictureUrl || '';
          } catch (e: any) {
            addLog(`Cannot get LINE profile: ${e.message}`);
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
              owner_name: ownerName,
              owner_phone: '',
              owner_avatar: ownerAvatar,
              is_zero_fee: true,
              status: 'active',
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

// Admin Auth Middleware
const requireAdmin = async (req: any, res: any, next: any) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未授權' });
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Token 無效' });
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') return res.status(403).json({ error: '權限不足' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token 無效' });
  }
};

// Admin Logs API
app.get('/api/admin/logs', requireAdmin, (req, res) => {
  res.json({ logs: serverLogs });
});

app.post('/api/admin/test-log', requireAdmin, (req, res) => {
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
    const result = JSON.parse(response.text.replace(/```json|```/g,'').trim());
    res.json(result);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/description', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'AI 未設定' });
  const { formData } = req.body;
  try {
    const prompt = `你是房地產文案專家，請根據以下資訊生成吸引人的繁體中文房源介紹，直接輸出介紹文字，不要其他說明。標題：${formData.title}，類型：${formData.type}，地點：${formData.city}${formData.district}，格局：${formData.bedrooms}房${formData.bathrooms}衛${formData.area}坪，設施：${(formData.amenities||[]).join('、')}`;
    const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.json({ text: response.text });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/tags', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'AI 未設定' });
  const { description } = req.body;
  try {
    const prompt = `根據以下房源描述生成 3-5 個簡短標籤（例如：近捷運、全新裝潢），只輸出標籤，用逗號分隔，不要其他文字。描述：${(description||'').substring(0,1000)}`;
    const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.json({ tags: response.text });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});
