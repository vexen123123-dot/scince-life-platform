// أدوات مشتركة لدوال Edge — لا تطبع أي أسرار في السجلات
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bootstrap-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export function adminClient(): SupabaseClient {
  // SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY تُحقن تلقائياً في بيئة Edge Functions ولا تُكشف للمتصفح
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface Caller { id: string; isAdmin: boolean }

// يتحقق من هوية المستدعي ودوره من قاعدة البيانات (لا يثق بأي ادعاء من العميل)
export async function getCaller(req: Request, svc: SupabaseClient): Promise<Caller | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await svc.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await svc.from('profiles').select('role, is_active').eq('id', data.user.id).maybeSingle();
  return { id: data.user.id, isAdmin: profile?.role === 'admin' && profile?.is_active === true };
}

export function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

export async function audit(svc: SupabaseClient, actor: string | null, action: string, entity: string, entityId: string, details: Record<string, unknown> = {}) {
  await svc.from('audit_logs').insert({ actor_id: actor, action, entity, entity_id: entityId, details });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (v: unknown): v is string => typeof v === 'string' && EMAIL_RE.test(v) && v.length <= 254;
export const isStrongPassword = (v: unknown): v is string => typeof v === 'string' && v.length >= 10 && v.length <= 128;
