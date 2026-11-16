
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import { BackLink, Badge, Button, Card, Empty, ErrorBox, PageHeader, Spinner, statusTone } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { cx, fmtDate, statusLabel, validateFile } from '../lib/format';
import { errMsg } from '../lib/supabase';
import * as hw from '../services/homework';
import type { Assignment, Grade, Submission } from '../types/db';

export type StudentState = 'pending' | 'draft' | 'submitted' | 'returned' | 'graded' | 'missing';

export const studentState = (a: Assignment, s?: Submission): StudentState => {
  if (s && s.status !== 'draft') return s.status;
  if (a.due_at && new Date(a.due_at) < new Date()) return 'missing';
  return s ? 'draft' : 'pending';
};

export const stateLabel = (s: StudentState) => (s === 'pending' ? 'لم يبدأ' : s === 'missing' ? 'متأخر / لم يُسلَّم' : statusLabel[s]);
export const stateTone = (s: StudentState) => (s === 'missing' ? 'red' : s === 'pending' ? 'gray' : statusTone(s));

export function HomeworkList() {
  const { session } = useAuth();
  const [tab, setTab] = useState<'all' | StudentState>('all');
  const { data, loading, error, reload } = useAsync(() => hw.listMyAssignments(session!.user.id), [session?.user.id]);

  const rows = useMemo(() => (data?.assignments ?? []).map((a) => {
    const s = data!.submissions.find((x) => x.assignment_id === a.id);
    const g = s ? data!.grades.find((x) => x.submission_id === s.id) : undefined;
    return { a, s, g, st: studentState(a, s ?? undefined) };
  }), [data]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const shown = rows.filter((r) => tab === 'all' || r.st === tab || (tab === 'pending' && r.st === 'draft'));
  const tabs: [typeof tab, string][] = [['all', 'الكل'], ['pending', 'المطلوبة'], ['submitted', 'المسلَّمة'], ['returned', 'للتصحيح'], ['graded', 'المصحَّحة'], ['missing', 'المتأخرة']];

  return (
    <>
      <PageHeader title="واجباتي" subtitle="اقرأ التعليمات، أجب إلكترونياً أو ارفع صور حلّك المكتوب بخط اليد." />
      <div className="mb-5 flex flex-wrap gap-2">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx('rounded-full border px-4 py-1.5 text-sm font-bold', tab === k ? 'border-royal-600 bg-royal-600 text-white' : 'border-soft-200 bg-white hover:bg-soft-100')}>{l}</button>)}</div>
      {shown.length === 0 ? <Empty title="لا توجد واجبات هنا" hint="عندما تنشر المعلمة واجباً مُسنداً إليك سيظهر في هذه الصفحة." /> : (
        <div className="grid gap-4 md:grid-cols-2">{shown.map(({ a, g, st }) => (
          <Link key={a.id} to={`/homework/${a.id}`}><Card className="h-full transition hover:-translate-y-1 hover:shadow-glow">
            <div className="flex items-start justify-between gap-2"><h2 className="text-lg font-extrabold text-navy-900">{a.title}</h2><Badge tone={stateTone(st)}>{stateLabel(st)}</Badge></div>
            <p className="mt-2 text-sm text-slate-600">الموعد النهائي: {fmtDate(a.due_at)}</p>
            {g && <p className="mt-2 font-extrabold text-emerald-700">الدرجة: {g.score} / {a.max_score}</p>}</Card></Link>))}</div>)}
    </>
  );
}

type A = Record<string, { text?: string; value?: string | boolean }>;

export function HomeworkDetail() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const toast = useToast();
  const uid = session!.user.id;
  const { data, loading, error, reload } = useAsync(() => hw.loadAssignmentForStudent(id, uid), [id, uid]);
  const [answers, setAnswers] = useState<A | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data?.assignment) return <ErrorBox message="الواجب غير موجود أو غير مُسند إليك." />;

  const { assignment: a, questions, attachments, submission, files, grade, feedback } = data;
  const cur: A = answers ?? Object.fromEntries(data.answers.map((x) => [x.question_id, x.answer]));
  const editable = !submission || submission.status === 'draft' || submission.status === 'returned';
  const state = studentState(a, submission ?? undefined);
  const late = a.due_at && new Date(a.due_at) < new Date();

  const persist = async () => {
    const sub = await hw.ensureSubmission(a.id, uid);
    await hw.saveAnswers(sub.id, cur);
    return sub;
  };

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await reload();
      setAnswers(null);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const open = async (path: string) => {
    try {
      window.open(await hw.signedUrl(path), '_blank', 'noopener');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const bad = Array.from(list).map(validateFile).find(Boolean);
    if (bad) {
      toast.error(bad);
      return;
    }
    setUploading(true);
    try {
      const sub = await persist();
      for (const f of Array.from(list)) await hw.uploadSubmissionFile(uid, a.id, sub.id, f);
      toast.success('تم رفع الملفات');
      await reload();
      setAnswers(cur);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  const submit = () => run(async () => {
    const hasAnswer = Object.values(cur).some((v) => (v.text ?? '').toString().trim() || typeof v.value === 'boolean' || v.value);
    if (!hasAnswer && files.length === 0) throw new Error('أجب عن سؤال واحد على الأقل أو ارفع ملفاً قبل التسليم.');
    const sub = await persist();
    await hw.submitSubmission(sub.id);
  }, 'تم تسليم الواجب ✅');

  const reopen = () => run(async () => {
    const { error: e } = await (await import('../lib/supabase')).supabase.from('submissions').update({ status: 'draft' }).eq('id', submission!.id);
    if (e) throw e;
  }, 'يمكنك الآن تعديل إجابتك ثم إعادة التسليم');

  return (
    <>
      <BackLink to="/homework">كل الواجبات</BackLink>
      <PageHeader title={a.title} subtitle={`الموعد النهائي: ${fmtDate(a.due_at)} • الدرجة العظمى: ${a.max_score}`} actions={<Badge tone={stateTone(state)}>{stateLabel(state)}</Badge>} />
      {late && editable && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-amber-900">انتهى الموعد النهائي. يمكنك التسليم لكن سيظهر الواجب متأخراً للمعلمة.</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card><h2 className="mb-2 font-extrabold text-navy-900">التعليمات</h2><p className="whitespace-pre-wrap leading-8">{a.instructions || 'لا توجد تعليمات إضافية.'}</p>
            {attachments.length > 0 && <div className="mt-4 space-y-2"><p className="font-bold">مرفقات المعلمة:</p>{attachments.map((f) => (
              <button key={f.id} onClick={() => open(f.storage_path)} className="flex items-center gap-2 text-royal-600 hover:underline"><Download size={16} />{f.file_name}</button>))}</div>}</Card>
          {questions.map((q, i) => (
            <Card key={q.id}><p className="mb-3 font-extrabold text-navy-900">{i + 1}. {q.prompt} <span className="text-sm font-normal text-slate-500">({q.points} درجة)</span></p>
              {q.kind === 'mcq' && <div className="space-y-2">{(q.options ?? []).map((o, oi) => (
                <label key={oi} className="flex items-center gap-2"><input type="radio" disabled={!editable} checked={cur[q.id]?.value === String(oi)} onChange={() => setAnswers({ ...cur, [q.id]: { value: String(oi) } })} />{o}</label>))}</div>}
              {q.kind === 'true_false' && <div className="flex gap-2">{[true, false].map((v) => <button key={String(v)} disabled={!editable} onClick={() => setAnswers({ ...cur, [q.id]: { value: v } })}
                className={cx('rounded-lg border px-5 py-2 font-bold', cur[q.id]?.value === v ? 'border-royal-600 bg-royal-600 text-white' : 'border-soft-200')}>{v ? 'صواب' : 'خطأ'}</button>)}</div>}
              {(q.kind === 'short' || q.kind === 'essay') && <textarea disabled={!editable} rows={q.kind === 'essay' ? 7 : 3} value={cur[q.id]?.text ?? ''} onChange={(e) => setAnswers({ ...cur, [q.id]: { text: e.target.value } })}
                className="w-full rounded-xl border border-soft-200 p-3 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-400/25" placeholder="اكتب إجابتك…" />}</Card>))}
          <Card><h2 className="mb-2 flex items-center gap-2 font-extrabold text-navy-900"><Paperclip size={18} />صور أو ملفات حلّك</h2>
            <p className="mb-3 text-sm text-slate-600">صور (JPG/PNG/WEBP/HEIC) أو PDF أو DOCX أو TXT — حتى 10 ميغابايت للملف.</p>
            <div className="space-y-2">{files.map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-xl bg-soft-50 p-2"><FileText size={18} /><button className="flex-1 truncate text-start text-royal-600 hover:underline" onClick={() => open(f.storage_path)}>{f.file_name}</button>
                {editable && <Button size="sm" variant="ghost" aria-label="حذف" onClick={() => run(() => hw.deleteSubmissionFile(f), 'تم حذف الملف')}><Trash2 size={16} /></Button>}</div>))}</div>
            {editable && <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-royal-500 px-4 py-3 font-bold text-royal-600 hover:bg-royal-50">
              <Upload size={18} />{uploading ? 'جارٍ الرفع…' : 'اختر ملفات'}<input type="file" multiple hidden disabled={uploading} accept="image/*,.pdf,.docx,.txt" onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} /></label>}</Card>
          {editable && <div className="flex flex-wrap gap-3">
            <Button variant="secondary" loading={busy} onClick={() => run(async () => { await persist(); }, 'تم حفظ المسودة')}>حفظ كمسودة</Button>
            <Button loading={busy} onClick={submit}>تسليم الواجب</Button></div>}
          {submission?.status === 'submitted' && <Button variant="secondary" loading={busy} onClick={reopen}>سحب التسليم للتعديل</Button>}
          {submission?.status === 'graded' && a.allow_resubmit && <Button variant="cyan" loading={busy} onClick={reopen}>إعادة التسليم (محاولة جديدة)</Button>}
        </div>
        <aside className="space-y-4">
          <Card><h2 className="mb-2 font-extrabold">حالة التسليم</h2><Badge tone={stateTone(state)}>{stateLabel(state)}</Badge>
            {submission && <p className="mt-2 text-sm text-slate-600">المحاولة {submission.attempt} • آخر تحديث {fmtDate(submission.updated_at)}</p>}</Card>
          {(grade as Grade | null) && <Card className="border-emerald-300 bg-emerald-50"><p className="text-sm font-bold text-emerald-800">الدرجة</p><p className="text-4xl font-extrabold text-emerald-700">{grade!.score} <span className="text-lg">/ {a.max_score}</span></p></Card>}
          {feedback.length > 0 && <Card><h2 className="mb-2 font-extrabold">ملاحظات المعلمة</h2><div className="space-y-3">{feedback.map((f) => <div key={f.id} className="rounded-xl bg-amber-50 p-3"><p className="leading-7">{f.body}</p><p className="mt-1 text-xs text-slate-500">{fmtDate(f.created_at)}</p></div>)}</div></Card>}
        </aside>
      </div>
    </>
  );
}
