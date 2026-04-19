/**
 * 統一環境變數出口，避免各處散落 (import.meta as any).env
 * 如果缺少關鍵變數會在 console 提示
 */
const env = import.meta.env;

export const SUPABASE_URL = env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY as string;
export const GOOGLE_MAPS_API_KEY = env.VITE_GOOGLE_MAPS_API_KEY as string;
export const API_URL = (env.VITE_API_URL as string) || 'http://localhost:3000';
export const FRONTEND_URL = (env.VITE_FRONTEND_URL as string) || 'http://localhost:3000';
