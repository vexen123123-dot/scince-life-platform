// إدارة حسابات الطلاب (مسؤول فقط): create | update | reset_password
import { adminClient, audit, corsHeaders, getCaller, isEmail, isStrongPassword, json } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const svc = adminClient();
  const caller = await getCaller(req, svc);
  if (!caller?.isAdmin) return json({ error: 'forbidden' }, 403);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const action = String(b.action ?? 'create');

  if (action === 'create') {
    if (!isEmail(b.email)) return json({ error: 'invalid_email' }, 400);
    if (!isStrongPassword(b.password)) return json({ error: 'weak_password', message: 'كلمة المرور 10 أحرف على الأقل' }, 400);
    const name = String(b.full_name ?? '').trim().slice(0, 120);
    if (!name) return json({ error: 'full_name_required' }, 400);
    const { data, error } = await svc.auth.admin.createUser({
      email: b.email, password: b.password, email_confirm: true, user_metadata: { full_name: name },
    });
    if (error || !data.user) return json({ error: 'create_failed', message: error?.message ?? 'unknown' }, 400);
    const group = typeof b.group_name === 'string' && b.group_name.trim() ? b.group_name.trim().slice(0, 60) : null;
    // المشغّل ينشئ الملف بدور student دائماً؛ نضيف الاسم والمجموعة فقط
    await svc.from('profiles').update({ full_name: name, group_name: group }).eq('id', data.user.id);
    await audit(svc, caller.id, 'create_student', 'profiles', data.user.id, { group });
    return json({ ok: true, user_id: data.user.id });
  }

  const id = String(b.user_id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'invalid_user_id' }, 400);
  const { data: target } = await svc.from('profiles').select('role').eq('id', id).maybeSingle();
  if (!target) return json({ error: 'not_found' }, 404);
  if (target.role !== 'student') return json({ error: 'not_a_student' }, 400);

  if (action === 'update') {
    const patch: Record<string, unknown> = {};
    if (typeof b.full_name === 'string') patch.full_name = b.full_name.trim().slice(0, 120);
    if (b.group_name === null || typeof b.group_name === 'string') patch.group_name = (b.group_name as string | null)?.trim() || null;
    if (typeof b.is_active === 'boolean') patch.is_active = b.is_active;
    const { error } = await svc.from('profiles').update(patch).eq('id', id);
    if (error) return json({ error: 'update_failed' }, 500);
    await audit(svc, caller.id, 'update_student', 'profiles', id, patch);
    return json({ ok: true });
  }
  if (action === 'reset_password') {
    if (!isStrongPassword(b.password)) return json({ error: 'weak_password' }, 400);
    const { error } = await svc.auth.admin.updateUserById(id, { password: b.password });
    if (error) return json({ error: 'reset_failed' }, 500);
    await audit(svc, caller.id, 'reset_student_password', 'profiles', id);
    return json({ ok: true });
  }
  return json({ error: 'invalid_action' }, 400);
});
