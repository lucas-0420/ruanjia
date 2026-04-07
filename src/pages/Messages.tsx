import { useState, useEffect, useRef } from 'react';
import { useFirebase } from '../context/SupabaseContext';
import { supabase } from '../supabase';
import { Navigate, Link } from 'react-router-dom';
import { MessageSquare, Send, ChevronLeft, ExternalLink, Home } from 'lucide-react';
import { cn } from '../lib/utils';

interface DbMsg {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  property_id: string;
  property_title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  key: string;              // `${property_id}__${sortedId1}__${sortedId2}`
  propertyId: string;
  propertyTitle: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

/** 建立對話唯一 key（雙方共用同一 key） */
function convKey(msg: DbMsg): string {
  const ids = [msg.sender_id, msg.receiver_id].sort();
  return `${msg.property_id}__${ids[0]}__${ids[1]}`;
}

export default function Messages() {
  const { user, userRole, isAuthReady } = useFirebase();
  const isAdmin = userRole === 'admin';

  const [allMsgs, setAllMsgs] = useState<DbMsg[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const myName = user?.user_metadata?.full_name || user?.email || '我';

  // ── 登入確認 ──────────────────────────────────────────
  if (isAuthReady && !user) return <Navigate to="/" />;

  // ── 取得所有訊息（含 Realtime）──────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchMsgs = async () => {
      let q = supabase.from('messages').select('*').order('created_at', { ascending: true });
      // 非管理員只看自己相關的訊息
      if (!isAdmin) {
        q = q.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      }
      const { data } = await q;
      setAllMsgs(data || []);
    };

    fetchMsgs();

    // Realtime 訂閱
    const channel = supabase
      .channel('messages-chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchMsgs)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isAdmin]);

  // ── 自動捲到最新訊息 ───────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMsgs, activeKey]);

  // ── 整理對話列表 ───────────────────────────────────────
  const conversations: Conversation[] = (() => {
    const map = new Map<string, Conversation & { _msgs: DbMsg[] }>();

    for (const msg of allMsgs) {
      const key = convKey(msg);
      const existing = map.get(key);
      const isMine = msg.sender_id === user?.id;
      const otherUserId = isMine ? msg.receiver_id : msg.sender_id;
      const otherUserName = isMine ? '屋主' : msg.sender_name;

      if (!existing || msg.created_at > existing.lastAt) {
        map.set(key, {
          key,
          propertyId: msg.property_id,
          propertyTitle: msg.property_title,
          otherUserId,
          otherUserName,
          lastMessage: msg.content,
          lastAt: msg.created_at,
          unread: 0,
          _msgs: [],
        });
      }
      // 把 otherUserName 從對方發的訊息中補回（比較準確）
      if (!isMine) {
        const conv = map.get(key)!;
        conv.otherUserName = msg.sender_name;
        conv.otherUserId = msg.sender_id;
      }
      map.get(key)!._msgs.push(msg);
    }

    // 計算未讀數
    for (const conv of map.values()) {
      conv.unread = conv._msgs.filter(m => !m.is_read && m.receiver_id === user?.id).length;
    }

    return Array.from(map.values())
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  })();

  // ── 當前對話的訊息 ─────────────────────────────────────
  const activeMsgs = activeKey ? allMsgs.filter(m => convKey(m) === activeKey) : [];
  const activeConv = conversations.find(c => c.key === activeKey) ?? null;

  // ── 切換對話時標記已讀 ─────────────────────────────────
  useEffect(() => {
    if (!activeKey || !user) return;
    const ids = activeMsgs.filter(m => !m.is_read && m.receiver_id === user.id).map(m => m.id);
    if (ids.length > 0) {
      supabase.from('messages').update({ is_read: true }).in('id', ids).then(() => {});
    }
  }, [activeKey, allMsgs]);

  // ── 送出訊息 ───────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !activeConv) return;
    setSending(true);

    // 回覆給「對方」
    const receiverId = activeConv.otherUserId || 'admin';

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      sender_name: myName,
      receiver_id: receiverId,
      property_id: activeConv.propertyId,
      property_title: activeConv.propertyTitle,
      content: input.trim(),
      is_read: false,
    });

    if (!error) setInput('');
    setSending(false);
  };

  // ── 時間格式化 ─────────────────────────────────────────
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return fmtTime(iso);
    return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  // ══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#FBF7F3] pt-16">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* 頁面標題 */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-[#3D2B1F]">訊息中心</h1>
          {totalUnread > 0 && (
            <span className="w-6 h-6 rounded-full bg-[#F5A623] text-[#3D2B1F] text-xs flex items-center justify-center font-black">
              {totalUnread}
            </span>
          )}
        </div>

        {/* 聊天面板 */}
        <div className="bg-white rounded-3xl border border-[#E5D5C5] shadow-sm overflow-hidden flex"
             style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>

          {/* ── 左欄：對話列表 ─────────────────────────────── */}
          <div className={cn(
            'w-full md:w-72 shrink-0 border-r border-[#E5D5C5] flex flex-col',
            activeKey && 'hidden md:flex',
          )}>
            <div className="px-4 py-3.5 border-b border-[#E5D5C5]">
              <p className="text-xs font-bold text-[#9A7D6B] uppercase tracking-wider">所有對話</p>
            </div>

            {conversations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#9A7D6B] gap-3 px-6 text-center">
                <MessageSquare className="w-10 h-10 opacity-25" />
                <p className="text-sm">目前沒有訊息</p>
                <Link to="/listings" className="text-xs text-[#F5A623] hover:underline">瀏覽房源並聯繫屋主</Link>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {conversations.map(conv => (
                  <button
                    key={conv.key}
                    onClick={() => setActiveKey(conv.key)}
                    className={cn(
                      'w-full text-left px-4 py-3.5 border-b border-[#F2E9DF] hover:bg-[#FBF7F3] transition-colors',
                      activeKey === conv.key && 'bg-[#FFF8F0] border-l-2 border-l-[#F5A623]',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* 頭像 */}
                      <div className="w-10 h-10 rounded-2xl bg-[#FFE8CC] flex items-center justify-center shrink-0">
                        <span className="text-sm font-black text-[#F5A623]">
                          {conv.otherUserName?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className={cn('text-sm truncate', conv.unread > 0 ? 'font-black text-[#3D2B1F]' : 'font-bold text-[#3D2B1F]')}>
                            {conv.otherUserName}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0 ml-1">
                            {conv.unread > 0 && (
                              <span className="w-5 h-5 rounded-full bg-[#F5A623] text-white text-[9px] flex items-center justify-center font-black">
                                {conv.unread}
                              </span>
                            )}
                            <span className="text-[10px] text-[#B8A090]">{fmtDate(conv.lastAt)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-[#9A7D6B] truncate">{conv.propertyTitle}</p>
                        <p className={cn('text-xs truncate mt-0.5', conv.unread > 0 ? 'text-[#7A5C48] font-medium' : 'text-[#B8A090]')}>
                          {conv.lastMessage}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── 右欄：聊天視窗 ─────────────────────────────── */}
          <div className={cn(
            'flex-1 flex flex-col',
            !activeKey && 'hidden md:flex',
          )}>
            {!activeConv ? (
              /* 未選對話的空白狀態 */
              <div className="flex-1 flex flex-col items-center justify-center text-[#9A7D6B] gap-3">
                <div className="w-16 h-16 rounded-3xl bg-[#F2E9DF] flex items-center justify-center">
                  <MessageSquare className="w-7 h-7 text-[#B8A090]" />
                </div>
                <p className="text-sm font-medium">選擇一個對話開始聊天</p>
              </div>
            ) : (
              <>
                {/* 對話頂部：對方資訊 + 房源連結 */}
                <div className="px-4 py-3 border-b border-[#E5D5C5] flex items-center gap-3 bg-white">
                  <button
                    onClick={() => setActiveKey(null)}
                    className="md:hidden p-1.5 hover:bg-[#F2E9DF] rounded-xl transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#7A5C48]" />
                  </button>
                  <div className="w-9 h-9 rounded-2xl bg-[#FFE8CC] flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-[#F5A623]">
                      {activeConv.otherUserName?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#3D2B1F] text-sm leading-tight">{activeConv.otherUserName}</p>
                    <Link
                      to={`/property/${activeConv.propertyId}`}
                      className="text-xs text-[#9A7D6B] hover:text-[#F5A623] flex items-center gap-1 transition-colors leading-tight"
                    >
                      <Home className="w-3 h-3 shrink-0" />
                      <span className="truncate">{activeConv.propertyTitle}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </Link>
                  </div>
                </div>

                {/* 訊息區 */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                  {activeMsgs.map((msg, i) => {
                    const isMine = msg.sender_id === user?.id;
                    // 日期分隔線（如果跟上一條不同日）
                    const prev = activeMsgs[i - 1];
                    const showDate = !prev ||
                      new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex items-center gap-3 my-3">
                            <div className="flex-1 h-px bg-[#F2E9DF]" />
                            <span className="text-[10px] text-[#B8A090] font-medium shrink-0">
                              {new Date(msg.created_at).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
                            </span>
                            <div className="flex-1 h-px bg-[#F2E9DF]" />
                          </div>
                        )}
                        <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                          <div className={cn(
                            'max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                            isMine
                              ? 'bg-[#F5A623] text-[#3D2B1F] rounded-br-sm'
                              : 'bg-[#F2E9DF] text-[#3D2B1F] rounded-bl-sm',
                          )}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className={cn('text-[10px] mt-1 opacity-60', isMine ? 'text-right' : 'text-left')}>
                              {fmtTime(msg.created_at)}
                              {isMine && msg.is_read && <span className="ml-1">✓</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* 輸入框 */}
                <form
                  onSubmit={handleSend}
                  className="px-4 py-3 border-t border-[#E5D5C5] flex gap-2 items-end bg-white"
                >
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e as any);
                      }
                    }}
                    placeholder="輸入訊息⋯（Enter 送出，Shift+Enter 換行）"
                    rows={1}
                    style={{ resize: 'none' }}
                    className="flex-1 px-4 py-2.5 bg-[#F2E9DF] rounded-2xl text-sm text-[#3D2B1F] placeholder-[#B8A090] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/30 leading-relaxed"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || sending}
                    className="w-10 h-10 bg-[#F5A623] rounded-2xl flex items-center justify-center text-[#3D2B1F] hover:bg-[#FFB830] transition-colors disabled:opacity-40 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
