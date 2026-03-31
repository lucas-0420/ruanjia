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
async function parsePropertyFromText(text: string) {
  if (!process.env.GEMINI_API_KEY) return null;
  
  try {
    const truncatedText = text.substring(0, 2000);
    const prompt = `
      Extract property information from the following text and return it as a JSON object.
      Fields to extract: title, price (number), type (apartment/house/studio/room), city, district, address, bedrooms (number), bathrooms (number), area (number), description.
      Text: "${truncatedText}"
      JSON Format:
      {
        "title": "...",
        "price": 0,
        "type": "...",
        "city": "...",
        "district": "...",
        "address": "...",
        "bedrooms": 0,
        "bathrooms": 0,
        "area": 0,
        "description": "..."
      }
    `;
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const jsonStr = response.text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini parsing error:", error);
    return null;
  }
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

const lineMiddleware = lineConfig.channelSecret
  ? line.middleware(lineConfig)
  : (_req: any, _res: any, next: any) => next();

app.post(webhookPaths, (req, res, next) => {
  // If it's a LINE verification request (often has a specific header or empty body)
  if (req.headers['x-line-signature'] === undefined) {
    addLog(`[WEBHOOK-POST-NO-SIG] ${req.url} - Returning 200 for potential verification`);
    return res.status(200).send('OK');
  }
  next();
}, lineMiddleware, async (req, res) => {
  const events = req.body.events || [];
  
  for (const event of events) {
    try {
      if (event.type === 'message') {
        const { message, source, timestamp } = event;
        const userId = source.userId;
        
        if (message.type === 'text') {
          addLog(`Received LINE text message from ${userId}`);
          const parsedData = await parsePropertyFromText(message.text);
          
          await supabase.from('line_messages').insert({
            line_message_id: message.id,
            text: message.text,
            user_id: userId,
            status: 'pending',
            source: source.type === 'group' ? 'group' : 'direct',
            parsed_data: parsedData || {},
          });
        } else if (message.type === 'image') {
          addLog(`Received LINE image from ${userId}`);
          let imageUrl = '';
          try {
            // 下載圖片內容
            const imageStream = await lineBlobClient.getMessageContent(message.id);
            const chunks: Buffer[] = [];
            for await (const chunk of imageStream) {
              chunks.push(Buffer.from(chunk));
            }
            const imageBuffer = Buffer.concat(chunks);

            // 存到 Supabase Storage
            const fileName = `line-images/${userId}_${message.id}.jpg`;
            const { error: storageErr } = await supabase.storage.from('property-images').upload(fileName, imageBuffer, { contentType: 'image/jpeg', upsert: true });
            if (!storageErr) {
              const { data: urlData } = supabase.storage.from('property-images').getPublicUrl(fileName);
              imageUrl = urlData.publicUrl;
            }
            addLog(`Image saved to Storage: ${imageUrl}`);
          } catch (imgErr: any) {
            addLog(`Image download error: ${imgErr.message}`);
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
        }
      }
    } catch (e: any) {
      addLog(`ERROR processing event: ${e.message}`);
    }
  }
  
  res.status(200).json({ status: 'ok' });
}, (err: any, req: any, res: any, next: any) => {
  if (err) {
    addLog(`ERROR in LINE middleware: ${err.message}`);
    return res.status(200).send('OK (Error Handled)'); // Still return 200 to satisfy LINE
  }
  next();
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
