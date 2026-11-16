import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile } from '../types/db';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (alive) setLoading(false);
    }).catch(() => alive && setLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // لا نستدعي Supabase داخل المستمع مباشرة لتفادي التعليق
      setTimeout(() => { loadProfile(s?.user.id); }, 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return 'لم يتم ربط Supabase بعد. راجع ملف README (إعداد المتغيرات).';
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message === 'Invalid login credentials' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : error.message;
    await loadProfile(data.user?.id);
    return null;
  }, [loadProfile]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); setProfile(null); setSession(null); }, []);
  const refreshProfile = useCallback(() => loadProfile(session?.user.id), [loadProfile, session]);

  const value = useMemo<AuthState>(() => ({
    session, profile, loading,
    isAdmin: profile?.role === 'admin' && profile.is_active,
    signIn, signOut, refreshProfile,
  }), [session, profile, loading, signIn, signOut, refreshProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
