import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useFirebase } from '../context/SupabaseContext';
import { MessageSquare, Image as ImageIcon, CheckCircle, Clock, Trash2, RefreshCw, ChevronRight, ChevronLeft, Terminal, AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

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
        <button onClick={() => setExpanded(e => !e)} className="mt-2 text-xs font-medium text-orange-500 hover:text-orange-700">
          {expanded ? '收起' : '顯示更多'}
        </button>
      )}
    </div>
  );
}

export function LineSyncPanel() {
  const { lineMessages } = useFirebase();
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
      const response = await fetch('/api/admin/logs', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (_) {}
    finally { setIsLogsLoading(false); }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (id: string, status: 'processed' | 'ignored') => {
    await supabase.from('line_messages').update({ status }).eq('id', id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要刪除此訊息嗎？')) return;
    await supabase.from('line_messages').delete().eq('id', id);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleSelectAll = () => {
    setSelected(selected.size === groupedMessages.length ? new Set() : new Set(groupedMessages.map(g => g.msg.id)));
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`確定要刪除選取的 ${selected.size} 筆訊息嗎？`)) return;
    for (const id of selected) await supabase.from('line_messages').delete().eq('id', id);
    setSelected(new Set());
  };

  const handleQuickPost = (msg: any) => navigate('/post', { state: { prefill: msg.parsedData } });

  const groupedMessages = (() => {
    const sorted = [...lineMessages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const groups: Array<{ msg: any; images: string[] }> = [];
    const userLatestGroup: Record<string, number> = {};
    for (const msg of sorted) {
      const isMedia = msg.images && msg.images.length > 0 && ['[圖片訊息]', '[圖片訊息 - 無法下載]', '[影片訊息]', '[影片訊息 - 無法下載]'].includes(msg.text);
      if (!isMedia) {
        userLatestGroup[msg.userId] = groups.length;
        groups.push({ msg, images: [] });
      } else {
        const latestIdx = userLatestGroup[msg.userId];
        if (latestIdx !== undefined && new Date(msg.timestamp).getTime() - new Date(groups[latestIdx].msg.timestamp).getTime() <= 30 * 60 * 1000) {
          groups[latestIdx].images.push(...(msg.images || []).filter(Boolean));
          continue;
        }
        groups.push({ msg, images: (msg.images || []).filter(Boolean) });
      }
    }
    return groups.reverse();
  })();

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">共 {groupedMessages.length} 筆訊息</span>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={handleDeleteSelected} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-all">
              <Trash2 className="w-4 h-4" />刪除 {selected.size} 筆
            </button>
          )}
          <button onClick={toggleSelectAll} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-orange-600 hover:text-orange-600 transition-all">
            {selected.size === groupedMessages.length && groupedMessages.length > 0 ? '取消全選' : '全選'}
          </button>
          <button onClick={() => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 1000); }} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-orange-600 hover:text-orange-600 transition-all">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />重新整理
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats & Logs */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">同步統計</h3>
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600"><Clock className="w-4 h-4" /></div>
                <span className="font-medium text-gray-900 text-sm">待處理</span>
              </div>
              <span className="text-2xl font-bold text-orange-600">{lineMessages.filter(m => m.status === 'pending').length}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center text-green-600"><CheckCircle className="w-4 h-4" /></div>
                <span className="font-medium text-gray-900 text-sm">已處理</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{lineMessages.filter(m => m.status === 'processed').length}</span>
            </div>
          </div>

          {/* Webhook Logs */}
          <div className="bg-gray-900 p-5 rounded-3xl text-white flex flex-col h-80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Terminal className="w-4 h-4 text-green-400" /><span className="font-bold text-sm">Webhook 日誌</span></div>
              <button onClick={fetchLogs} className="p-1 hover:bg-gray-800 rounded-lg transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${isLogsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-0.5">
              {logs.length === 0 ? <p className="text-gray-500 italic">尚無日誌...</p> : logs.map((log, i) => (
                <div key={i} className={`py-0.5 border-b border-gray-800 last:border-0 ${log.includes('ERROR') ? 'text-red-400' : log.includes('REDIRECT') ? 'text-yellow-400' : log.includes('INCOMING') ? 'text-blue-400' : 'text-gray-300'}`}>{log}</div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-800 flex items-start gap-2 text-[9px] text-gray-500">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /><span>302 錯誤請查看 [REDIRECT] 記錄</span>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="lg:col-span-2 space-y-4">
          {groupedMessages.length === 0 ? (
            <div className="bg-white py-16 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4"><MessageSquare className="w-7 h-7" /></div>
              <h3 className="text-base font-bold text-gray-900 mb-1">尚無 LINE 訊息</h3>
              <p className="text-sm text-gray-400 max-w-xs">當 LINE Bot 收到群組訊息時，資訊會自動顯示在此處。</p>
            </div>
          ) : groupedMessages.map(({ msg, images }, idx) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
              className={`bg-white rounded-3xl shadow-sm border transition-all flex flex-col ${selected.has(msg.id) ? 'border-orange-400 bg-orange-50/30' : msg.status === 'processed' ? 'border-gray-100 opacity-60' : 'border-gray-200 hover:border-orange-200'}`}>
              <div className="p-5 overflow-y-auto max-h-80">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selected.has(msg.id)} onChange={() => toggleSelect(msg.id)} className="w-4 h-4 rounded accent-orange-500 cursor-pointer" />
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-50 text-orange-600"><MessageSquare className="w-4 h-4" /></div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">{msg.source === 'group' ? '群組訊息' : '直接訊息'}</span>
                        {images.length > 0 && <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full"><ImageIcon className="w-3 h-3" />{images.length} 張</span>}
                        <span className="text-[10px] text-gray-400">{formatDate(msg.timestamp)}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">UID: {msg.userId.substring(0, 8)}...</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {msg.status === 'pending' && (
                      <button onClick={() => handleStatusChange(msg.id, 'processed')} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="已處理">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(msg.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {msg.text && !['[圖片訊息]', '[圖片訊息 - 無法下載]'].includes(msg.text) && <ExpandableText text={msg.text} />}
                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {images.map((url, i) => url.includes('/line-videos/') ? (
                      <button key={i} onClick={() => openLightbox(images, i)} className="col-span-2 relative focus:outline-none group">
                        <video src={url} className="w-full h-20 object-cover rounded-xl border border-gray-100" muted />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl"><div className="w-7 h-7 bg-white/80 rounded-full flex items-center justify-center text-xs">▶</div></div>
                      </button>
                    ) : (
                      <button key={i} onClick={() => openLightbox(images, i)} className="focus:outline-none">
                        <img src={url} alt="" className="w-full h-20 object-cover rounded-xl border border-gray-100 hover:opacity-80 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {msg.parsedData && Object.keys(msg.parsedData).filter(k => k !== 'property_id').length > 0 && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">提取資訊</span>
                    <button onClick={() => handleQuickPost(msg)} className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700">
                      快速上架 <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {msg.parsedData.title && <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100"><span className="block text-[9px] text-gray-400 uppercase mb-1">標題</span><span className="text-xs font-bold text-gray-900 line-clamp-1">{msg.parsedData.title}</span></div>}
                    {msg.parsedData.price && <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100"><span className="block text-[9px] text-gray-400 uppercase mb-1">價格</span><span className="text-xs font-bold text-orange-600">${(msg.parsedData.price as number).toLocaleString()}</span></div>}
                    {msg.parsedData.city && <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100"><span className="block text-[9px] text-gray-400 uppercase mb-1">地點</span><span className="text-xs font-bold text-gray-900">{msg.parsedData.city}{msg.parsedData.district}</span></div>}
                    {msg.parsedData.type && <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100"><span className="block text-[9px] text-gray-400 uppercase mb-1">房型</span><span className="text-xs font-bold text-gray-900 uppercase">{msg.parsedData.type}</span></div>}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center" onClick={closeLightbox}>
          <button onClick={closeLightbox} className="absolute top-4 right-4 text-white hover:text-gray-300"><X className="w-8 h-8" /></button>
          <button onClick={e => { e.stopPropagation(); prevImage(); }} className={`absolute left-4 text-white hover:text-gray-300 ${lightbox.index === 0 ? 'opacity-30 pointer-events-none' : ''}`}><ChevronLeft className="w-10 h-10" /></button>
          {lightbox.urls[lightbox.index].includes('/line-videos/') ? (
            <video key={lightbox.index} src={lightbox.urls[lightbox.index]} controls autoPlay className="max-h-[90vh] max-w-[90vw] rounded-xl" onClick={e => e.stopPropagation()} />
          ) : (
            <img src={lightbox.urls[lightbox.index]} alt="" className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          )}
          <button onClick={e => { e.stopPropagation(); nextImage(); }} className={`absolute right-4 text-white hover:text-gray-300 ${lightbox.index === lightbox.urls.length - 1 ? 'opacity-30 pointer-events-none' : ''}`}><ChevronRight className="w-10 h-10" /></button>
          <div className="absolute bottom-4 text-white text-sm">{lightbox.index + 1} / {lightbox.urls.length}</div>
        </div>
      )}
    </div>
  );
}

export default function AdminSync() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">LINE 訊息同步</h1>
        <LineSyncPanel />
      </div>
    </div>
  );
}
