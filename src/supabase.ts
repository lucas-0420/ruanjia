import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[暖家] 缺少 Supabase 環境變數：VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY 未設定，請確認 .env 檔案');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// Auth helpers
// ============================================
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback: (user: any) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

// ============================================
// Error helper
// ============================================
export function handleSupabaseError(error: any, operation: string, table: string) {
  console.error(`Supabase Error [${operation}] on [${table}]:`, error?.message || error);
  throw new Error(error?.message || '資料庫操作失敗');
}
