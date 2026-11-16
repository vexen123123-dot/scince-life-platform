// تصحيح التسليمات أو إعادتها للتصحيح (مسؤول فقط) — مع التحقق من الدرجة وتسجيل التدقيق
import { adminClient, audit, corsHeaders, getCaller, json } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const svc = adminClient();
  const caller = await getCaller(req, svc);
  if (!caller?.isAdmin) return json({ error: 'forbidden' }, 403);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const submissionId = String(b.submission_id ?? '');
  const action = String(b.action ?? 'grade');
  const feedback = typeof b.feedback === 'string' ? b.feedback.trim().slice(0, 4000) : '';
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return json({ error: 'invalid_submission_id' }, 400);
  if (!['grade', 'return'].includes(action)) return json({ error: 'invalid_action' }, 400);

  const { data: sub } = await svc.from('submissions')
    .select('id, status, assignment_id, assignments(max_score)').eq('id', submissionId).maybeSingle();
  if (!sub) return json({ error: 'not_found' }, 404);
  if (sub.status === 'draft') return json({ error: 'not_submitted', message: 'لم يسلّم الطالب هذا الواجب بعد' }, 400);
  const max = Number((sub as unknown as { assignments: { max_score: number } }).assignments.max_score);

  if (action === 'grade') {
    const score = Number(b.score);
    if (!Number.isFinite(score) || score < 0 || score > max) {
      return json({ error: 'invalid_score', message: `الدرجة يجب أن تكون بين 0 و ${max}` }, 400);
    }
    const { error: gErr } = await svc.from('grades').upsert(
      { submission_id: submissionId, score, graded_by: caller.id, graded_at: new Date().toISOString() },
      { onConflict: 'submission_id' });
    if (gErr) return json({ error: 'grade_failed' }, 500);
    await svc.from('submissions').update({ status: 'graded' }).eq('id', submissionId);
    await svc.from('submission_history').insert({ submission_id: submissionId, event: 'graded', status: 'graded', actor_id: caller.id });
    if (feedback) await svc.from('feedback').insert({ submission_id: submissionId, author_id: caller.id, body: feedback });
    await audit(svc, caller.id, 'grade', 'submissions', submissionId, { score, max });
    return json({ ok: true, status: 'graded', score });
  }

  // return: إعادة للتصحيح (يلزم ملاحظة توضّح المطلوب)
  if (!feedback) return json({ error: 'feedback_required', message: 'اكتب ملاحظة توضح المطلوب تعديله' }, 400);
  await svc.from('submissions').update({ status: 'returned' }).eq('id', submissionId);
  await svc.from('feedback').insert({ submission_id: submissionId, author_id: caller.id, body: feedback });
  await audit(svc, caller.id, 'return_for_correction', 'submissions', submissionId);
  return json({ ok: true, status: 'returned' });
});
