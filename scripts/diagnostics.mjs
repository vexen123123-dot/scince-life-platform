// تشخيص الاتصال — لا يطبع أي سر.
// الاستعمال:  npm run diagnostics
// اختياري (لاختبار الدخول): TEST_EMAIL و TEST_PASSWORD كمتغيرات بيئة للجلسة فقط.
//   TEST_STUDENT_EMAIL/TEST_STUDENT_PASSWORD لاختبار الطالب، TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD للمسؤول.
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';

if (existsSync('.env')) for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }

const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const results = []; const rec = (name, status, note = '') => { results.push({ name, status, note }); console.log(`${status === 'PASS' ? '✅' : status === 'SKIP' ? '⏭️ ' : '❌'} ${name}${note ? ' — ' + note : ''}`); };
const guard = async (name, fn) => { try { const r = await fn(); rec(name, r === 'SKIP' ? 'SKIP' : 'PASS', r === 'SKIP' ? 'لم تُوفَّر بيانات الاعتماد' : ''); } catch (e) { rec(name, 'FAIL', String(e?.message ?? e).slice(0, 200)); } };
const assert = (c, m) => { if (!c) throw new Error(m); };

console.log('— فحص متغيرات البيئة —');
rec('VITE_SUPABASE_URL موجود', url ? 'PASS' : 'FAIL'); rec('VITE_SUPABASE_PUBLISHABLE_KEY موجود', key ? 'PASS' : 'FAIL');
for (const bad of ['SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY']) if (process.env[bad]) rec(`تحذير: ${bad} معرّف في البيئة — لا يجب استعماله في الواجهة`, 'FAIL');
if (!url || !key) { console.log('\nأوقف: أضف المتغيرات في .env ثم أعد التشغيل.'); process.exit(1); }

const mk = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = mk();

console.log('\n— الاتصال وRLS كزائر —');
await guard('الاتصال بقاعدة البيانات (قراءة الدروس المنشورة)', async () => { const { data, error } = await anon.from('lessons').select('id,slug').limit(5); assert(!error, error?.message); assert(data.length > 0, 'لا دروس — هل طُبّقت migrations (db push)؟'); });
await guard('الزائر لا يقرأ ملفات profiles', async () => { const { data, error } = await anon.from('profiles').select('id').limit(1); assert(error || data.length === 0, 'الزائر قرأ ملفات شخصية!'); });
await guard('الزائر لا يقرأ الواجبات', async () => { const { data } = await anon.from('assignments').select('id').limit(1); assert((data ?? []).length === 0, 'الزائر قرأ واجبات!'); });
await guard('مفاتيح إجابات الاختبار مخفية عن الزائر', async () => { const { data, error } = await anon.from('quiz_questions').select('answer_key').limit(1); assert(error || !data?.length, 'الزائر قرأ answer_key!'); });
await guard('الزائر لا يستطيع التسجيل العام', async () => { const { error } = await anon.auth.signUp({ email: `diag-${Date.now()}@example.invalid`, password: 'Diag-Test-123456' }); assert(error, 'التسجيل العام مفتوح! عطّله في Authentication → Providers → Email'); });

async function login(prefix) {
  const email = process.env[`${prefix}_EMAIL`], password = process.env[`${prefix}_PASSWORD`]; if (!email || !password) return null;
  const c = mk(); const { data, error } = await c.auth.signInWithPassword({ email, password }); if (error) throw new Error('فشل الدخول: ' + error.message);
  const { data: p, error: pe } = await c.from('profiles').select('role,is_active').eq('id', data.user.id).single(); if (pe) throw new Error('تعذّر جلب الملف: ' + pe.message);
  return { c, uid: data.user.id, role: p.role };
}

console.log('\n— الطالب —');
let st = null;
await guard('دخول الطالب وجلب الدور', async () => { st = await login('TEST_STUDENT'); if (!st) return 'SKIP'; assert(st.role === 'student', `الدور ${st.role} وليس student`); });
await guard('الطالب لا يرقّي نفسه إلى admin', async () => { if (!st) return 'SKIP'; await st.c.from('profiles').update({ role: 'admin' }).eq('id', st.uid); const { data } = await st.c.from('profiles').select('role').eq('id', st.uid).single(); assert(data.role === 'student', 'تمت الترقية!'); });
await guard('الطالب لا ينشئ واجباً', async () => { if (!st) return 'SKIP'; const { error } = await st.c.from('assignments').insert({ title: 'x', created_by: st.uid }); assert(error, 'الطالب أنشأ واجباً!'); });
await guard('الطالب لا يقرأ audit_logs', async () => { if (!st) return 'SKIP'; const { data } = await st.c.from('audit_logs').select('id').limit(1); assert((data ?? []).length === 0, 'قرأ سجل التدقيق!'); });
await guard('الطالب لا يكتب درجة', async () => { if (!st) return 'SKIP'; const { error } = await st.c.from('grades').insert({ submission_id: '00000000-0000-0000-0000-000000000000', score: 10 }); assert(error, 'كتب درجة!'); });
await guard('الطالب لا يستدعي دالة التصحيح', async () => { if (!st) return 'SKIP'; const { data, error } = await st.c.functions.invoke('grade-submission', { body: { action: 'grade', submission_id: '00000000-0000-0000-0000-000000000000', score: 1 } }); assert(error || data?.error, 'الدالة قبلت طالباً!'); });

console.log('\n— المسؤول —');
let ad = null;
await guard('دخول المسؤول وجلب الدور', async () => { ad = await login('TEST_ADMIN'); if (!ad) return 'SKIP'; assert(ad.role === 'admin', `الدور ${ad.role}`); });
await guard('المسؤول ينشئ واجباً مسودة ثم يحذفه', async () => { if (!ad) return 'SKIP'; const { data, error } = await ad.c.from('assignments').insert({ title: 'اختبار تشخيص', created_by: ad.uid, status: 'draft' }).select('id').single(); assert(!error, error?.message); const d = await ad.c.from('assignments').delete().eq('id', data.id); assert(!d.error, d.error?.message); });
await guard('المسؤول يقرأ audit_logs', async () => { if (!ad) return 'SKIP'; const { error } = await ad.c.from('audit_logs').select('id').limit(1); assert(!error, error?.message); });
await guard('رفع ملف خاص + رابط موقّع (مسؤول)', async () => { if (!ad) return 'SKIP'; const path = `assignments/${crypto.randomUUID()}/diag-${Date.now()}.txt`; const up = await ad.c.storage.from('homework-files').upload(path, new Blob(['diag'], { type: 'text/plain' })); assert(!up.error, up.error?.message); const s = await ad.c.storage.from('homework-files').createSignedUrl(path, 60); assert(!s.error && s.data?.signedUrl, 'تعذّر إنشاء رابط موقّع'); await ad.c.storage.from('homework-files').remove([path]); });

const f = results.filter((r) => r.status === 'FAIL').length, p = results.filter((r) => r.status === 'PASS').length, s = results.filter((r) => r.status === 'SKIP').length;
console.log(`\nالنتيجة: ${p} نجح، ${f} فشل، ${s} تخطّي`); process.exit(f ? 1 : 0);
