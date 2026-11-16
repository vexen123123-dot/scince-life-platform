// إنشاء/ترقية حسابات المسؤولين — الطريقة الوحيدة لإنشاء مسؤول.
// يُسمح بالاستدعاء في حالتين فقط:
//   1) مسؤول مسجّل الدخول (JWT صالح بدور admin).
//   2) ترويسة x-bootstrap-secret تطابق السر ADMIN_BOOTSTRAP_SECRET (لإنشاء أول حسابين؛ احذف السر بعدها).
import { adminClient, audit, corsHeaders, getCaller, isEmail, isStrongPassword, json, timingSafeEqual } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const svc = adminClient();
  const caller = await getCaller(req, svc);
  const secret = Deno.env.get('ADMIN_BOOTSTRAP_SECRET') ?? '';
  const supplied = req.headers.get('x-bootstrap-secret') ?? '';
  const viaBootstrap = secret.length >= 24 && supplied.length > 0 && timingSafeEqual(secret, supplied);
  if (!caller?.isAdmin && !viaBootstrap) return json({ error: 'forbidden' }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const { mode = 'create', email, password, full_name } = body as { mode?: string; email?: unknown; password?: unknown; full_name?: unknown };
  if (!isEmail(email)) return json({ error: 'invalid_email' }, 400);
  const name = typeof full_name === 'string' ? full_name.trim().slice(0, 120) : '';
  const actor = caller?.id ?? null;

  let userId: string;
  if (mode === 'create') {
    if (!isStrongPassword(password)) return json({ error: 'weak_password', message: 'كلمة المرور 10 أحرف على الأقل' }, 400);
    if (!name) return json({ error: 'full_name_required' }, 400);
    const { data, error } = await svc.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: name },
    });
    if (error || !data.user) return json({ error: 'create_failed', message: error?.message ?? 'unknown' }, 400);
    userId = data.user.id;
  } else if (mode === 'promote') {
    // ترقية حساب موجود (بحثاً بالبريد) — تُستعمل بحذر
    const { data, error } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return json({ error: 'lookup_failed' }, 500);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) return json({ error: 'user_not_found' }, 404);
    userId = found.id;
  } else {
    return json({ error: 'invalid_mode' }, 400);
  }

  const patch: Record<string, unknown> = { role: 'admin', is_active: true };
  if (name) patch.full_name = name;
  const { error: upErr } = await svc.from('profiles').update(patch).eq('id', userId);
  if (upErr) return json({ error: 'role_assign_failed', message: upErr.message }, 500);

  await audit(svc, actor, 'provision_admin', 'profiles', userId, { via: viaBootstrap ? 'bootstrap' : 'admin', mode });
  return json({ ok: true, user_id: userId, role: 'admin' });
});
