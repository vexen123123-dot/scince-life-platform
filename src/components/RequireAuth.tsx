import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { Banner, Spinner } from './ui';

export function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { session, profile, loading, isAdmin } = useAuth();
  const loc = useLocation();
  if (!isSupabaseConfigured) return <div className="mx-auto max-w-2xl p-8"><Banner>هذه الصفحة تتطلب حساباً، ولم يتم ربط Supabase بعد. اتبع خطوات README لإضافة <code>VITE_SUPABASE_URL</code> و<code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.</Banner></div>;
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!profile) return <Spinner label="جارٍ تحميل الملف الشخصي…" />;
  if (!profile.is_active) return <div className="p-8 text-center text-red-700">هذا الحساب موقوف. تواصل مع المعلمة.</div>;
  if (admin && !isAdmin) return <Navigate to="/dashboard" replace />; // الحماية الحقيقية في RLS؛ هذا للتجربة فقط
  return <>{children}</>;
}
