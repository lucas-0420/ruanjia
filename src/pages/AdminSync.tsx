import React, { useState, useEffect, useCallback } from 'react';

function ExpandableText({ text }: { text: string }) {
  const limit = 150;
  const isLong = text.length > limit;
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-gray-50 p-4 rounded-2xl mb-4">
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {isLong && !expanded ? text.substring(0, limit) + '...' : text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-xs font-medium text-orange-500 hover:text-orange-700"
        >
          {expanded ? '收起' : '顯示更多'}
        </button>
      )}
    </div>
  );
}
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '../context/SupabaseContext';
import { MessageSquare, Image as ImageIcon, CheckCircle, Clock, Trash2, ExternalLink, RefreshCw, ChevronRight, ChevronLeft, Terminal, AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function AdminSync() {
  const { lineMessages, user } = useFirebase();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  const openLightbox = (urls: string[], index: number) => setLightbox({ urls, index });
  const closeLightbox = () => setLightbox(null);
  const prevImage = useCallback(() => setLightbox(l => l && l.index > 0 ? { ...l, index: l.index - 1 } : l), []);
  const nextImage = useCallback(() => setLightbox(l => l && l.index < l.urls.length - 1 ? { ...l, index: l.index + 1 } : l), []);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, prevImage, nextImage]);

  const fetchLogs = async () => {
    setIsLogsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch('/api/admin/logs', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setIsLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Auto refresh logs every 5s
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (id: string, status: 'processed' | 'ignored') => {
    try {
      await supabase.from('line_messages').update({ status }).eq('id', id);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要刪除此訊息嗎？')) return;
    try {
      await supabase.from('line_messages').delete().eq('id', id);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === groupedMessages.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(groupedMessages.map(g => g.msg.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`確定要刪除選取的 ${selected.size} 筆訊息嗎？`)) return;
    for (const id of selected) {
      await supabase.from('line_messages').delete().eq('id', id);
    }
    setSelected(new Set());
  };

  const handleQuickPost = (msg: any) => {
    navigate('/post', { state: { prefill: msg.parsedData } });
  };

  // 把文字訊息和同用戶 30 分鐘內的圖片合成一組
  const groupedMessages = (() => {
    const sorted = [...lineMessages].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const groups: Array<{ msg: any; images: string[] }> = [];
    // 每個 userId 對應目前最新的 group index
    const userLatestGroup: Record<string, number> = {};

    for (const msg of sorted) {
      const isMedia = msg.images && msg.images.length > 0 &&
        (msg.text === '[圖片訊息]' || msg.text === '[圖片訊息 - 無法下載]' ||
         msg.text === '[影片訊息]' || msg.text === '[影片訊息 - 無法下載]');

      if (!isMedia) {
        // 文字訊息 → 建立新 group
        const idx = groups.length;
        groups.push({ msg, images: [] });
        userLatestGroup[msg.userId] = idx;
      } else {
        // 圖片／影片 → 加入該用戶最新的 group（若 30 分鐘內）
        const latestIdx = userLatestGroup[msg.userId];
        if (latestIdx !== undefined) {
          const groupTime = new Date(groups[latestIdx].msg.timestamp).getTime();
          const mediaTime = new Date(msg.timestamp).getTime();
          if (mediaTime - groupTime <= 30 * 60 * 1000) {
            groups[latestIdx].images.push(...(msg.images || []).filter(Boolean));
            continue;
          }
        }
        // 沒有對應的文字訊息 → 獨立顯示
        groups.push({ msg, images: (msg.images || []).filter(Boolean) });
      }
    }

    return groups.reverse();
  })();

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">LINE 訊息同步</h1>
            <p className="text-gray-500">從 LINE 群組自動抓取的房源資訊，幫助您快速上架。</p>
          </div>
          
          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-all shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                刪除 {selected.size} 筆
              </button>
            )}
            <button
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-orange-600 hover:text-orange-600 transition-all shadow-sm"
            >
              {selected.size === groupedMessages.length && groupedMessages.length > 0 ? '取消全選' : '全選'}
            </button>
            <button
              onClick={() => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 1000); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-orange-600 hover:text-orange-600 transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              重新整理
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats & Logs */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">同步統計</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-900">待處理</span>
                  </div>
                  <span className="text-2xl font-bold text-orange-600">
                    {lineMessages.filter(m => m.status === 'pending').length}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-900">已處理</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {lineMessages.filter(m => m.status === 'processed').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Webhook Logs Viewer */}
            <div className="bg-gray-900 p-6 rounded-3xl shadow-xl text-white overflow-hidden flex flex-col h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-green-400" />
                  <h3 className="font-bold">Webhook 即時日誌</h3>
                </div>
                <button 
                  onClick={fetchLogs}
                  className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isLogsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar">
                {logs.length === 0 ? (
                  <p className="text-gray-500 italic">尚無日誌記錄...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`py-1 border-b border-gray-800 last:border-0 ${
                      log.includes('ERROR') ? 'text-red-400' : 
                      log.includes('REDIRECT') ? 'text-yellow-400' : 
                      log.includes('INCOMING') ? 'text-blue-400' : 'text-gray-300'
                    }`}>
                      {log}
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-start gap-2 text-[10px] text-gray-400">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <p>如果 LINE 回傳 302 錯誤，請在此處查看 [REDIRECT] 記錄以找出原因。</p>
                </div>
              </div>
            </div>
          </div>

          {/* Messages List */}
          <div className="lg:col-span-2 space-y-4">
            {groupedMessages.length === 0 ? (
              <div className="bg-white py-20 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">尚無 LINE 訊息</h3>
                <p className="text-gray-500 max-w-xs">
                  當您的 LINE Bot 收到群組訊息時，資訊會自動顯示在此處。
                </p>
              </div>
            ) : (
              groupedMessages.map(({ msg, images }, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-white rounded-3xl shadow-sm border transition-all flex flex-col ${
                    selected.has(msg.id) ? 'border-orange-400 bg-orange-50/30' :
                    msg.status === 'processed' ? 'border-gray-100 opacity-60' : 'border-gray-200 hover:border-orange-200'
                  }`}
                >
                  {/* 捲軸內容區 */}
                  <div className="p-6 overflow-y-auto max-h-[360px]">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(msg.id)}
                        onChange={() => toggleSelect(msg.id)}
                        className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                      />
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-50 text-orange-600">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{msg.source === 'group' ? '群組訊息' : '直接訊息'}</span>
                          {images.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                              <ImageIcon className="w-3 h-3" />{images.length} 張照片
                            </span>
                          )}
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-400">{formatDate(msg.timestamp)}</span>
                        </div>
                        <span className="text-xs text-gray-500 font-mono">UID: {msg.userId.substring(0, 8)}...</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {msg.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(msg.id, 'processed')}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="標記為已處理"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="刪除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* 文字內容 */}
                  {msg.text && msg.text !== '[圖片訊息]' && msg.text !== '[圖片訊息 - 無法下載]' && (
                    <ExpandableText text={msg.text} />
                  )}

                  {/* 圖片／影片 */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {images.map((url, i) => (
                        url.includes('/line-videos/') ? (
                          <button key={i} onClick={() => openLightbox(images, i)} className="col-span-2 relative focus:outline-none group">
                            <video src={url} className="w-full h-20 object-cover rounded-xl border border-gray-100" muted />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl group-hover:bg-black/40 transition">
                              <div className="w-8 h-8 bg-white/80 rounded-full flex items-center justify-center">▶</div>
                            </div>
                          </button>
                        ) : (
                          <button key={i} onClick={() => openLightbox(images, i)} className="focus:outline-none">
                            <img src={url} alt="" className="w-full h-20 object-cover rounded-xl border border-gray-100 hover:opacity-80 transition-opacity" />
                          </button>
                        )
                      ))}
                    </div>
                  )}

                  </div>{/* 捲軸結束 */}

                  {/* 快速上架 — 固定在卡片底部 */}
                  {msg.parsedData && Object.keys(msg.parsedData).filter(k => k !== 'property_id').length > 0 && (
                    <div className="px-6 pb-5 border-t border-gray-100 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">提取資訊</span>
                        <button
                          onClick={() => handleQuickPost(msg)}
                          className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700"
                        >
                          快速上架 <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {msg.parsedData.title && (
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span className="block text-[10px] text-gray-400 uppercase mb-1">標題</span>
                            <span className="text-sm font-bold text-gray-900 line-clamp-1">{msg.parsedData.title}</span>
                          </div>
                        )}
                        {msg.parsedData.price && (
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span className="block text-[10px] text-gray-400 uppercase mb-1">價格</span>
                            <span className="text-sm font-bold text-orange-600">${(msg.parsedData.price as number).toLocaleString()}</span>
                          </div>
                        )}
                        {msg.parsedData.city && (
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span className="block text-[10px] text-gray-400 uppercase mb-1">地點</span>
                            <span className="text-sm font-bold text-gray-900">{msg.parsedData.city}{msg.parsedData.district}</span>
                          </div>
                        )}
                        {msg.parsedData.type && (
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span className="block text-[10px] text-gray-400 uppercase mb-1">房型</span>
                            <span className="text-sm font-bold text-gray-900 uppercase">{msg.parsedData.type}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={closeLightbox}>
          <button onClick={closeLightbox} className="absolute top-4 right-4 text-white hover:text-gray-300">
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={e => { e.stopPropagation(); prevImage(); }}
            className={`absolute left-4 text-white hover:text-gray-300 ${lightbox.index === 0 ? 'opacity-30 pointer-events-none' : ''}`}
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          {lightbox.urls[lightbox.index].includes('/line-videos/') ? (
            <video
              key={lightbox.index}
              src={lightbox.urls[lightbox.index]}
              controls
              autoPlay
              className="max-h-[90vh] max-w-[90vw] rounded-xl"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img
              src={lightbox.urls[lightbox.index]}
              alt=""
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl"
              onClick={e => e.stopPropagation()}
            />
          )}

          <button
            onClick={e => { e.stopPropagation(); nextImage(); }}
            className={`absolute right-4 text-white hover:text-gray-300 ${lightbox.index === lightbox.urls.length - 1 ? 'opacity-30 pointer-events-none' : ''}`}
          >
            <ChevronRight className="w-10 h-10" />
          </button>

          <div className="absolute bottom-4 text-white text-sm">
            {lightbox.index + 1} / {lightbox.urls.length}
          </div>
        </div>
      )}
    </div>
  );
}
