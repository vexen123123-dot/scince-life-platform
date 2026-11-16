import { useState } from 'react';
import { Badge, Button, Card, DataTable, ErrorBox, Field, Modal, PageHeader, Spinner, inputCls, type Column } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { pct } from '../../lib/format';
import { errMsg, supabase } from '../../lib/supabase';
import { quizStats } from '../../services/admin';

interface Q { id: string; position: number; kind: string; prompt: string; options: unknown; answer_key: unknown; explanation: string; points: number }
const KINDS = ['mcq', 'true_false', 'fill_blank', 'matching', 'definition', 'explain_why', 'short_answer', 'classification', 'equation', 'compare'];

export default function AdminQuizzes() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(quizStats, []);
  const [open, setOpen] = useState<{ id: string; title: string } | null>(null);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const rows = data.quizzes.map((q) => { const a = data.attempts.filter((x) => x.quiz_id === q.id); const avg = a.length ? (a.reduce((s, x) => s + (Number(x.max_score) ? Number(x.score) / Number(x.max_score) : 0), 0) / a.length) * 100 : null; return { ...q, n: a.length, avg }; });
  const cols: Column<(typeof rows)[number]>[] = [
    { key: 'title', header: 'الاختبار' }, { key: 'n', header: 'المحاولات' }, { key: 'avg', header: 'المتوسط', sortValue: (r) => r.avg ?? -1, render: (r) => pct(r.avg) },
    { key: 'is_published', header: 'الحالة', render: (r) => <Badge tone={r.is_published ? 'green' : 'gray'}>{r.is_published ? 'منشور' : 'مخفي'}</Badge> },
    { key: 'act', header: '', searchValue: () => '', render: (r) => <div className="flex gap-1"><Button size="sm" variant="cyan" onClick={() => setOpen({ id: r.id, title: r.title })}>الأسئلة</Button>
      <Button size="sm" variant="secondary" onClick={async () => { const { error: e } = await supabase.from('quizzes').update({ is_published: !r.is_published }).eq('id', r.id); if (e) toast.error(errMsg(e)); else reload(); }}>{r.is_published ? 'إخفاء' : 'نشر'}</Button></div> },
  ];
  return <><PageHeader title="الاختبارات وبنك الأسئلة" /><DataTable rows={rows} columns={cols} empty="لا اختبارات." />{open && <Questions quiz={open} onClose={() => setOpen(null)} />}</>;
}

function Questions({ quiz, onClose }: { quiz: { id: string; title: string }; onClose: () => void }) {
  const toast = useToast();
  const { data, loading, reload } = useAsync(async () => { const { data: d, error: e } = await supabase.rpc('admin_quiz_questions', { p_quiz_id: quiz.id }); if (e) throw e; return d as Q[]; }, [quiz.id]);
  const [edit, setEdit] = useState<Partial<Q> | null>(null);
  const [txt, setTxt] = useState({ options: '', key: '' });
  const start = (q?: Q) => { setEdit(q ?? { kind: 'mcq', prompt: '', explanation: '', points: 1, position: (data?.length ?? 0) + 1 }); setTxt({ options: q?.options ? JSON.stringify(q.options) : '', key: q ? JSON.stringify(q.answer_key) : '{"value":0}' }); };
  const save = async () => {
    try {
      const row = { quiz_id: quiz.id, kind: edit!.kind, prompt: edit!.prompt, explanation: edit!.explanation ?? '', points: edit!.points ?? 1, position: edit!.position ?? 1, options: txt.options ? JSON.parse(txt.options) : null, answer_key: JSON.parse(txt.key) };
      if (!row.prompt?.trim()) throw new Error('نص السؤال مطلوب');
      const { error: e } = edit!.id ? await supabase.from('quiz_questions').update(row).eq('id', edit!.id) : await supabase.from('quiz_questions').insert(row); if (e) throw e;
      toast.success('تم الحفظ'); setEdit(null); reload();
    } catch (e) { toast.error(e instanceof SyntaxError ? 'JSON غير صحيح في الخيارات أو مفتاح الإجابة' : errMsg(e)); }
  };
  const del = async (id: string) => { if (!confirm('حذف السؤال؟')) return; const { error: e } = await supabase.from('quiz_questions').delete().eq('id', id); if (e) toast.error(errMsg(e)); else reload(); };
  return (
    <Modal wide title={`أسئلة: ${quiz.title}`} onClose={onClose}>
      {loading || !data ? <Spinner /> : edit ? (
        <div className="space-y-3">
          <Field label="النوع"><select className={inputCls} value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="نص السؤال (للفراغات استعمل ___)"><textarea className={inputCls} rows={2} value={edit.prompt ?? ''} onChange={(e) => setEdit({ ...edit, prompt: e.target.value })} /></Field>
          <Field label="الخيارات (JSON — اختياري)" hint='mcq: ["أ","ب"] • matching: {"left":[],"right":[]} • classification: {"items":[],"categories":[]}'><input dir="ltr" className={inputCls} value={txt.options} onChange={(e) => setTxt({ ...txt, options: e.target.value })} /></Field>
          <Field label="مفتاح الإجابة (JSON)" hint='mcq/tf: {"value":1} • fill: {"values":[["إجابة","بديل"]]} • matching: {"pairs":[[0,1]]} • مفتوح: {"keywords":[["كلمة","بديل"]],"min_matches":1,"model_answer":"…"}'><textarea dir="ltr" rows={3} className={`${inputCls} font-mono text-sm`} value={txt.key} onChange={(e) => setTxt({ ...txt, key: e.target.value })} /></Field>
          <Field label="الشرح (يظهر بعد الإجابة)"><textarea className={inputCls} rows={2} value={edit.explanation ?? ''} onChange={(e) => setEdit({ ...edit, explanation: e.target.value })} /></Field>
          <div className="flex gap-2"><Button onClick={save}>حفظ</Button><Button variant="secondary" onClick={() => setEdit(null)}>إلغاء</Button></div></div>
      ) : (
        <div className="space-y-2"><Button size="sm" onClick={() => start()}>+ سؤال</Button>
          {data.map((q) => <Card key={q.id} className="flex items-start justify-between gap-2 p-3"><div><Badge>{q.kind}</Badge><p className="mt-1">{q.prompt}</p></div><div className="flex gap-1"><Button size="sm" variant="secondary" onClick={() => start(q)}>تعديل</Button><Button size="sm" variant="danger" onClick={() => del(q.id)}>حذف</Button></div></Card>)}</div>)}
    </Modal>
  );
}
