import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, BackLink, Button, DataTable, ErrorBox, Field, Modal, PageHeader, Spinner, inputCls, statusTone, type Column } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { fmtDate, statusLabel, validateFile } from '../../lib/format';
import { errMsg } from '../../lib/supabase';
import * as admin from '../../services/admin';
import { signedUrl } from '../../services/homework';
import type { Assignment, AssignmentQuestion, Attachment } from '../../types/db';

const toLocalInput = (d: string | null) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

export default function AdminAssignments() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(admin.listAssignments, []);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [filter, setFilter] = useState('');
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); reload(); } catch (e) { toast.error(errMsg(e)); } };
  const cols: Column<Assignment>[] = [
    { key: 'title', header: 'العنوان' },
    { key: 'status', header: 'الحالة', render: (r) => <Badge tone={statusTone(r.status)}>{r.status === 'published' ? 'منشور' : 'مسودة'}</Badge> },
    { key: 'due_at', header: 'الموعد', render: (r) => fmtDate(r.due_at) }, { key: 'max_score', header: 'الدرجة' },
    { key: 'a', header: '', searchValue: () => '', render: (r) => (
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="secondary" onClick={() => setEditing(r.id)}>تعديل</Button>
        <Link to={`/admin/assignments/${r.id}/submissions`}><Button size="sm" variant="cyan">التسليمات</Button></Link>
        <Button size="sm" variant="ghost" onClick={() => act(() => admin.setAssignmentStatus(r.id, r.status === 'published' ? 'draft' : 'published'), r.status === 'published' ? 'أُلغي النشر' : 'تم النشر')}>{r.status === 'published' ? 'إلغاء النشر' : 'نشر'}</Button>
        <Button size="sm" variant="danger" onClick={() => { if (confirm('حذف الواجب وكل تسليماته نهائياً؟')) act(() => admin.deleteAssignment(r.id), 'تم الحذف'); }}>حذف</Button></div>) },
  ];
  return (
    <>
      <PageHeader title="الواجبات" actions={<Button onClick={() => setEditing('new')}>+ واجب جديد</Button>} />
      <DataTable rows={data.filter((a) => !filter || a.status === filter)} columns={cols} empty="لا توجد واجبات."
        filters={<select className={`${inputCls} w-40`} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="تصفية الحالة"><option value="">كل الحالات</option><option value="published">منشور</option><option value="draft">مسودة</option></select>} />
      {editing && <Editor id={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </>
  );
}

function Editor({ id, onClose, onSaved }: { id: string | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast(); const { session } = useAuth();
  const students = useAsync(admin.listStudents, []);
  const full = useAsync(async () => (id ? admin.loadAssignmentFull(id) : null), [id]);
  const [f, setF] = useState<admin.AssignmentDraft>({ title: '', instructions: '', due_at: null, allow_resubmit: false, max_score: 10, status: 'draft', lesson_id: null });
  const [qs, setQs] = useState<admin.QDraft[]>([]);
  const [targetStudents, setTS] = useState<string[]>([]); const [groups, setGroups] = useState('');
  const [atts, setAtts] = useState<Attachment[]>([]); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const d = full.data; if (!d) return;
    const { assignment: a } = d;
    setF({ title: a.title, instructions: a.instructions, due_at: a.due_at, allow_resubmit: a.allow_resubmit, max_score: Number(a.max_score), status: a.status, lesson_id: a.lesson_id });
    setQs(d.questions.map((q: AssignmentQuestion) => ({ kind: q.kind, prompt: q.prompt, options: q.options, points: Number(q.points) })));
    setTS(d.targets.filter((t) => t.student_id).map((t) => t.student_id!)); setGroups(d.targets.filter((t) => t.group_name).map((t) => t.group_name).join('، ')); setAtts(d.attachments);
  }, [full.data]);
  if (id && full.loading) return <Modal title="تعديل واجب" onClose={onClose}><Spinner /></Modal>;

  const save = async (status?: 'draft' | 'published') => {
    setBusy(true);
    try {
      if (!f.title.trim()) throw new Error('العنوان مطلوب');
      if (qs.some((q) => !q.prompt.trim())) throw new Error('نص كل سؤال مطلوب');
      const targets: admin.TargetDraft[] = [...targetStudents.map((s) => ({ student_id: s })), ...groups.split(/[،,]/).map((g) => g.trim()).filter(Boolean).map((g) => ({ group_name: g }))];
      await admin.saveAssignment(id, { ...f, status: status ?? f.status }, qs, targets, session!.user.id);
      toast.success('تم حفظ الواجب'); onSaved();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const upd = (i: number, p: Partial<admin.QDraft>) => setQs(qs.map((q, k) => (k === i ? { ...q, ...p } : q)));
  const addFile = async (file: File | undefined) => {
    if (!file || !id) return; const bad = validateFile(file); if (bad) { toast.error(bad); return; }
    try { await admin.addAttachment(id, file); toast.success('تم رفع المرفق'); const d = await admin.loadAssignmentFull(id); setAtts(d.attachments); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Modal wide title={id ? 'تعديل واجب' : 'واجب جديد'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="العنوان"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="التعليمات"><textarea rows={4} className={inputCls} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="الموعد النهائي"><input type="datetime-local" className={inputCls} value={toLocalInput(f.due_at)} onChange={(e) => setF({ ...f, due_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
          <Field label="الدرجة العظمى"><input type="number" min={1} step="0.5" className={inputCls} value={f.max_score} onChange={(e) => setF({ ...f, max_score: Number(e.target.value) })} /></Field>
          <label className="flex items-end gap-2 pb-3 font-bold"><input type="checkbox" checked={f.allow_resubmit} onChange={(e) => setF({ ...f, allow_resubmit: e.target.checked })} />السماح بإعادة التسليم</label></div>

        <fieldset className="rounded-xl border border-soft-200 p-3"><legend className="px-2 font-bold">الإسناد (اتركه فارغاً = لكل الطلاب)</legend>
          <div className="max-h-36 space-y-1 overflow-y-auto">{students.data?.map((s) => <label key={s.id} className="flex items-center gap-2"><input type="checkbox" checked={targetStudents.includes(s.id)} onChange={(e) => setTS(e.target.checked ? [...targetStudents, s.id] : targetStudents.filter((x) => x !== s.id))} />{s.full_name} {s.group_name && <span className="text-xs text-slate-500">({s.group_name})</span>}</label>)}</div>
          <Field label="مجموعات (مفصولة بفاصلة)"><input className={inputCls} value={groups} onChange={(e) => setGroups(e.target.value)} /></Field></fieldset>

        <fieldset className="rounded-xl border border-soft-200 p-3"><legend className="px-2 font-bold">الأسئلة ({qs.length})</legend>
          {qs.map((q, i) => (
            <div key={i} className="mb-3 space-y-2 rounded-xl bg-soft-50 p-3">
              <div className="flex gap-2"><select className={`${inputCls} w-40`} value={q.kind} onChange={(e) => upd(i, { kind: e.target.value as admin.QDraft['kind'], options: e.target.value === 'mcq' ? ['', ''] : null })}>
                <option value="short">إجابة قصيرة</option><option value="essay">مقالي</option><option value="mcq">اختيار من متعدد</option><option value="true_false">صواب/خطأ</option></select>
                <input type="number" min={0} step="0.5" className={`${inputCls} w-24`} value={q.points} onChange={(e) => upd(i, { points: Number(e.target.value) })} aria-label="الدرجة" />
                <Button size="sm" variant="danger" onClick={() => setQs(qs.filter((_, k) => k !== i))}>حذف</Button></div>
              <textarea rows={2} className={inputCls} placeholder="نص السؤال" value={q.prompt} onChange={(e) => upd(i, { prompt: e.target.value })} />
              {q.kind === 'mcq' && <div className="space-y-1">{(q.options ?? []).map((o, oi) => <input key={oi} className={inputCls} placeholder={`الخيار ${oi + 1}`} value={o} onChange={(e) => upd(i, { options: q.options!.map((x, k) => (k === oi ? e.target.value : x)) })} />)}
                <Button size="sm" variant="ghost" onClick={() => upd(i, { options: [...(q.options ?? []), ''] })}>+ خيار</Button></div>}
            </div>))}
          <Button size="sm" variant="secondary" onClick={() => setQs([...qs, { kind: 'short', prompt: '', options: null, points: 1 }])}>+ سؤال</Button></fieldset>

        {id && <fieldset className="rounded-xl border border-soft-200 p-3"><legend className="px-2 font-bold">مرفقات</legend>
          {atts.map((a) => <div key={a.id} className="flex items-center justify-between py-1"><button className="text-royal-600 hover:underline" onClick={async () => window.open(await signedUrl(a.storage_path), '_blank', 'noopener')}>{a.file_name}</button>
            <Button size="sm" variant="ghost" onClick={async () => { await admin.removeAttachment(a); setAtts(atts.filter((x) => x.id !== a.id)); }}>حذف</Button></div>)}
          <input type="file" accept="image/*,.pdf,.docx,.txt" onChange={(e) => { addFile(e.target.files?.[0]); e.target.value = ''; }} /></fieldset>}
        {!id && <p className="text-xs text-slate-500">احفظ الواجب أولاً ثم عدّله لإضافة مرفقات.</p>}

        <div className="flex flex-wrap gap-2"><Button variant="secondary" loading={busy} onClick={() => save('draft')}>حفظ كمسودة</Button><Button loading={busy} onClick={() => save('published')}>حفظ ونشر</Button></div>
      </div>
    </Modal>
  );
}

export function AdminSubmissions() {
  const { id = '' } = useParams(); const toast = useToast();
  const { data, loading, error, reload } = useAsync(async () => ({ ov: await admin.loadSubmissionsOverview(id), full: await admin.loadAssignmentFull(id) }), [id]);
  const [open, setOpen] = useState<string | null>(null);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const { ov, full } = data; const a = full.assignment;
  const rows = ov.students.map((s) => { const sub = ov.submissions.find((x) => x.student_id === s.id); const g = sub && ov.grades.find((x) => x.submission_id === sub.id);
    const late = !sub || sub.status === 'draft'; const missing = late && a.due_at && new Date(a.due_at) < new Date();
    return { id: s.id, name: s.full_name, group: s.group_name, sub, score: g?.score, state: sub && sub.status !== 'draft' ? sub.status : missing ? 'missing' : 'pending' }; });
  const cols: Column<(typeof rows)[number]>[] = [
    { key: 'name', header: 'الطالب' }, { key: 'group', header: 'المجموعة', render: (r) => r.group ?? '—' },
    { key: 'state', header: 'الحالة', render: (r) => <Badge tone={r.state === 'missing' ? 'red' : r.state === 'pending' ? 'gray' : statusTone(r.state)}>{r.state === 'missing' ? 'لم يسلّم (متأخر)' : r.state === 'pending' ? 'لم يسلّم' : statusLabel[r.state]}</Badge> },
    { key: 'submitted', header: 'وقت التسليم', sortValue: (r) => r.sub?.submitted_at ?? '', render: (r) => fmtDate(r.sub?.submitted_at) },
    { key: 'score', header: 'الدرجة', render: (r) => (r.score != null ? `${r.score} / ${a.max_score}` : '—') },
    { key: 'act', header: '', searchValue: () => '', render: (r) => r.sub && r.sub.status !== 'draft' ? <Button size="sm" variant="cyan" onClick={() => setOpen(r.sub!.id)}>مراجعة / تصحيح</Button> : null },
  ];
  return (
    <>
      <BackLink to="/admin/assignments">الواجبات</BackLink>
      <PageHeader title={`تسليمات: ${a.title}`} subtitle={`${rows.filter((r) => r.sub && r.sub.status !== 'draft').length} مسلَّم من ${rows.length}`} />
      <DataTable rows={rows} columns={cols} empty="لا طلاب مُسنَد إليهم هذا الواجب." />
      {open && <Grade submissionId={open} questions={full.questions} max={Number(a.max_score)} onClose={() => setOpen(null)} onDone={() => { toast.success('تم الحفظ'); setOpen(null); reload(); }} />}
    </>
  );
}

function Grade({ submissionId, questions, max, onClose, onDone }: { submissionId: string; questions: AssignmentQuestion[]; max: number; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { data, loading } = useAsync(() => admin.loadSubmissionDetail(submissionId), [submissionId]);
  const [score, setScore] = useState(''); const [fb, setFb] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (data?.grade) setScore(String((data.grade as { score: number }).score)); }, [data]);
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); onDone(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  return (
    <Modal wide title="مراجعة التسليم" onClose={onClose}>
      {loading || !data ? <Spinner /> : (
        <div className="space-y-4">
          {questions.map((q, i) => { const a = data.answers.find((x) => x.question_id === q.id)?.answer as { text?: string; value?: string | boolean } | undefined;
            const shown = q.kind === 'mcq' && a?.value !== undefined ? (q.options ?? [])[Number(a.value)] : typeof a?.value === 'boolean' ? (a.value ? 'صواب' : 'خطأ') : a?.text;
            return <div key={q.id} className="rounded-xl bg-soft-50 p-3"><p className="font-bold">{i + 1}. {q.prompt} <span className="text-xs font-normal text-slate-500">({q.points})</span></p><p className="mt-1 whitespace-pre-wrap">{shown || <em className="text-slate-400">لا إجابة</em>}</p></div>; })}
          {data.files.length > 0 && <div><p className="mb-1 font-bold">ملفات الطالب:</p>{data.files.map((f) => <button key={f.id} className="block text-royal-600 hover:underline" onClick={async () => { try { window.open(await signedUrl(f.storage_path), '_blank', 'noopener'); } catch (e) { toast.error(errMsg(e)); } }}>📎 {f.file_name}</button>)}</div>}
          {data.feedback.length > 0 && <div><p className="font-bold">ملاحظات سابقة:</p>{data.feedback.map((f: { id: string; body: string }) => <p key={f.id} className="rounded bg-amber-50 p-2 text-sm">{f.body}</p>)}</div>}
          <details><summary className="cursor-pointer font-bold">سجلّ التسليم</summary><ul className="mt-2 text-sm">{data.history.map((h: { id: string; event: string; status: string; created_at: string }) => <li key={h.id}>{fmtDate(h.created_at)} — {h.event} ({h.status})</li>)}</ul></details>
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <Field label={`الدرجة (من ${max})`}><input type="number" min={0} max={max} step="0.5" className={inputCls} value={score} onChange={(e) => setScore(e.target.value)} /></Field>
            <Field label="ملاحظات للطالب"><textarea rows={3} className={inputCls} value={fb} onChange={(e) => setFb(e.target.value)} /></Field></div>
          <div className="flex flex-wrap gap-2">
            <Button loading={busy} disabled={score === ''} onClick={() => run(() => admin.gradeSubmission(submissionId, Number(score), fb || undefined))}>حفظ الدرجة</Button>
            <Button variant="secondary" loading={busy} disabled={!fb.trim()} onClick={() => run(() => admin.returnSubmission(submissionId, fb))}>إعادة للتصحيح</Button></div>
        </div>)}
    </Modal>
  );
}
