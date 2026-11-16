import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** true فقط عند ضبط متغيرات البيئة؛ وإلا تعمل المنصة بوضع القراءة من المحتوى المضمّن دون حسابات. */
export const isSupabaseConfigured = Boolean(url && key);

export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'not-configured', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export function errMsg(e: unknown): string {
  if (!e) return 'حدث خطأ غير معروف';
  if (typeof e === 'string') return e;
  const m = (e as { message?: string }).message ?? 'حدث خطأ غير معروف';
  if (/Failed to fetch|NetworkError|fetch failed/i.test(m)) return 'تعذّر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مجدداً.';
  if (/row-level security|permission denied/i.test(m)) return 'ليست لديك صلاحية لتنفيذ هذا الإجراء.';
  return m;
}
