import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, signInWithGoogle, signOut, onAuthStateChange, handleSupabaseError } from '../supabase';
import { Property, LineMessage } from '../types';
import { MOCK_PROPERTIES } from '../constants';

interface User {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; avatar_url?: string; name?: string };
}

interface SupabaseContextType {
  user: User | null;
  userRole: string;
  loading: boolean;
  isAuthReady: boolean;
  properties: Property[];
  lineMessages: LineMessage[];
  favorites: string[];
  toggleFavorite: (propertyId: string) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [lineMessages, setLineMessages] = useState<LineMessage[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // ── Auth ──────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (authUser: User | null) => {
      setUser(authUser);
      setIsAuthReady(true);
      setLoading(false);

      if (authUser) {
        // Upsert user profile
        const displayName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || '';
        await supabase.from('users').upsert({
          id: authUser.id,
          email: authUser.email,
          display_name: displayName,
          photo_url: authUser.user_metadata?.avatar_url || '',
        }, { onConflict: 'id', ignoreDuplicates: false });

        // Fetch role + favorites
        const { data } = await supabase
          .from('users')
          .select('favorites, role')
          .eq('id', authUser.id)
          .single();
        setFavorites(data?.favorites || []);
        setUserRole(data?.role || 'user');
      } else {
        setFavorites([]);
        setUserRole('user');
      }
    });
    return unsubscribe;
  }, []);

  // ── Properties (Realtime) ─────────────────────────
  useEffect(() => {
    const fetchProperties = async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .neq('status', 'archived')
        .order('created_at', { ascending: false });

      if (error) {
        handleSupabaseError(error, 'fetch', 'properties');
        return;
      }

      const mapped = (data || []).map(mapPropertyFromDB);
      setProperties(mapped);

      // 若資料庫是空的，塞入測試資料
      if (mapped.length === 0 && user) {
        await migrateMockData();
      }
    };

    fetchProperties();

    // Realtime 訂閱
    const channel = supabase
      .channel('properties-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, async () => {
        await fetchProperties();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []); // 不依賴 user，頁面一開就立刻載入房源

  // ── LINE Messages (Realtime) ──────────────────────
  useEffect(() => {
    if (!user) { setLineMessages([]); return; }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('line_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setLineMessages((data || []).map(mapLineMessageFromDB));
    };

    fetchMessages();

    const channel = supabase
      .channel('line-messages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'line_messages' }, fetchMessages)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Mock Data Migration ───────────────────────────
  const migrateMockData = async () => {
    if (!user) return;
    for (const prop of MOCK_PROPERTIES) {
      await supabase.from('properties').insert(mapPropertyToDB(prop, user.id));
    }
  };

  // ── Toggle Favorite ───────────────────────────────
  const toggleFavorite = async (propertyId: string) => {
    if (!user) { alert('請先登入以收藏房源'); return; }

    const prevFavorites = favorites; // 保留原始狀態以便還原
    const newFavorites = favorites.includes(propertyId)
      ? favorites.filter(id => id !== propertyId)
      : [...favorites, propertyId];

    setFavorites(newFavorites); // 樂觀更新 UI

    const { error } = await supabase
      .from('users')
      .update({ favorites: newFavorites })
      .eq('id', user.id);

    if (error) {
      setFavorites(prevFavorites); // 失敗時還原
      handleSupabaseError(error, 'update', 'users');
    }
  };

  const login = async () => { try { await signInWithGoogle(); } catch (e) { console.error('Login error:', e); } };
  const logout = async () => { try { await signOut(); } catch (e) { console.error('Logout error:', e); } };

  return (
    <SupabaseContext.Provider value={{ user, userRole, loading, isAuthReady, properties, lineMessages, favorites, toggleFavorite, login, logout }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useFirebase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error('useFirebase must be used within SupabaseProvider');
  return ctx;
}

// ── DB Mappers ────────────────────────────────────────
export function mapPropertyFromDB(row: any): Property {
  return {
    id: row.id,
    title: row.title,
    price: row.price,
    type: row.type,
    location: { city: row.city, district: row.district, address: row.address, lat: row.lat, lng: row.lng },
    features: { bedrooms: row.bedrooms, bathrooms: row.bathrooms, area: row.area, floor: row.floor, totalFloors: row.total_floors, managementFee: row.management_fee, deposit: row.deposit },
    amenities: row.amenities || [],
    images: row.images || [],
    description: row.description || '',
    owner: { name: row.owner_name, phone: row.owner_phone, avatar: row.owner_avatar, role: row.owner_role, lineId: row.owner_line_id || '' },
    isZeroFee: row.is_zero_fee,
    createdAt: row.created_at,
    tags: row.tags || [],
    status: row.status ?? 'active',
  };
}

export function mapPropertyToDB(prop: Partial<Property> & any, ownerId: string) {
  return {
    title: prop.title,
    price: prop.price,
    type: prop.type,
    city: prop.location?.city || prop.city,
    district: prop.location?.district || prop.district,
    address: prop.location?.address || prop.address,
    lat: prop.location?.lat || 25.0330,
    lng: prop.location?.lng || 121.5654,
    bedrooms: prop.features?.bedrooms || prop.bedrooms || 1,
    bathrooms: prop.features?.bathrooms || prop.bathrooms || 1,
    area: prop.features?.area || prop.area || 0,
    floor: prop.features?.floor || prop.floor || 1,
    total_floors: prop.features?.totalFloors || prop.totalFloors,
    management_fee: prop.features?.managementFee || prop.managementFee || 0,
    deposit: prop.features?.deposit || prop.deposit || '兩個月',
    amenities: prop.amenities || [],
    images: prop.images || [],
    description: prop.description || '',
    owner_id: ownerId,
    owner_name: prop.owner?.name || '',
    owner_phone: prop.owner?.phone || '',
    ...(prop.owner?.lineId ? { owner_line_id: prop.owner.lineId } : {}),
    owner_avatar: prop.owner?.avatar || '',
    owner_role: prop.owner?.role || '屋主',
    is_zero_fee: prop.isZeroFee ?? true,
    tags: prop.tags || [],
    status: prop.status || 'active',
  };
}

export function mapLineMessageFromDB(row: any): LineMessage {
  return {
    id: row.id,
    text: row.text,
    userId: row.user_id,
    timestamp: row.created_at,
    status: row.status,
    source: row.source,
    images: row.images || [],
    parsedData: row.parsed_data || {},
  };
}
