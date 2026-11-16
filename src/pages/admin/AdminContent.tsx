import { useState } from 'react';
import { Badge, Button, Card, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, inputCls } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { errMsg, supabase } from '../../lib/supabase';
import type { Lesson, Unit } from '../../types/db';

const slugOk = (s: string) => /^[a-z0-9-]+$/.test(s);

export default function AdminContent() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [u, l] = await Promise.all([supabase.from('units').select('*').order('position'), supabase.from('lessons').select('*').order('position')]);
    if (u.error) throw u.error; if (l.error) throw l.error; return { units: u.data as Unit[], lessons: l.data as Lesson[] };
  }, []);
  const [modal, setModal] = useState<{ kind: 'unit' | 'lesson' | 'sections'; row?: Partial<Unit & Lesson> } | null>(null);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const toggle = async (table: 'units' | 'lessons', id: string, v: boolean) => { const { error: e } = await supabase.from(table).update({ is_published: v }).eq('id', id); if (e) toast.error(errMsg(e)); else reload(); };
  return (
    <>
      <PageHeader title="الوحدات والدروس" subtitle="أضف دروساً وأقساماً جديدة بدون إعادة بناء الموقع." actions={<><Button variant="secondary" onClick={() => setModal({ kind: 'unit' })}>+ وحدة</Button><Button onClick={() => setModal({ kind: 'lesson' })}>+ درس</Button></>} />
      {data.units.length === 0 && <Empty title="لا وحدات" />}
      <div className="space-y-5">{data.units.map((u) => (
        <Card key={u.id}><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-extrabold">{u.title}</h2><p className="text-sm text-slate-600">{u.slug} • ترتيب {u.position}</p></div>
          <div className="flex gap-2"><Badge tone={u.is_published ? 'green' : 'gray'}>{u.is_published ? 'منشورة' : 'مخفية'}</Badge><Button size="sm" variant="secondary" onClick={() => toggle('units', u.id, !u.is_published)}>{u.is_published ? 'إخفاء' : 'نشر'}</Button><Button size="sm" variant="secondary" onClick={() => setModal({ kind: 'unit', row: u })}>تعديل</Button></div></div>
          <div className="mt-3 space-y-2">{data.lessons.filter((l) => l.unit_id === u.id).map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-soft-50 p-3"><span className="font-bold">{l.position}. {l.title} <span className="text-xs font-normal text-slate-500">({l.slug})</span></span>
              <div className="flex gap-2"><Badge tone={l.is_published ? 'green' : 'gray'}>{l.is_published ? 'منشور' : 'مخفي'}</Badge>
                <Button size="sm" variant="ghost" onClick={() => toggle('lessons', l.id, !l.is_published)}>{l.is_published ? 'إخفاء' : 'نشر'}</Button>
                <Button size="sm" variant="secondary" onClick={() => setModal({ kind: 'lesson', row: l })}>تعديل</Button><Button size="sm" variant="cyan" onClick={() => setModal({ kind: 'sections', row: l })}>الأقسام</Button></div></div>))}</div></Card>))}</div>
      {modal?.kind === 'unit' && <UnitForm row={modal.row as Unit | undefined} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
      {modal?.kind === 'lesson' && <LessonForm row={modal.row as Lesson | undefined} units={data.units} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
      {modal?.kind === 'sections' && <Sections lesson={modal.row as Lesson} onClose={() => setModal(null)} />}
    </>
  );
}

function UnitForm({ row, onClose, onDone }: { row?: Unit; onClose: () => void; onDone: () => void }) {
  const toast = useToast(); const [f, setF] = useState({ slug: row?.slug ?? '', title: row?.title ?? '', description: row?.description ?? '', position: row?.position ?? 1 });
  const save = async () => {
    if (!slugOk(f.slug)) return toast.error('المعرّف (slug) أحرف إنجليزية صغيرة وأرقام وشرطات فقط');
    const q = row ? supabase.from('units').update(f).eq('id', row.id) : supabase.from('units').insert(f); const { error: e } = await q; if (e) toast.error(errMsg(e)); else onDone();
  };
  return <Modal title={row ? 'تعديل وحدة' : 'وحدة جديدة'} onClose={onClose}><div className="space-y-3">
    <Field label="المعرّف (slug)"><input dir="ltr" className={inputCls} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
    <Field label="العنوان"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
    <Field label="الوصف"><textarea className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
    <Field label="الترتيب"><input type="number" className={inputCls} value={f.position} onChange={(e) => setF({ ...f, position: Number(e.target.value) })} /></Field><Button onClick={save}>حفظ</Button></div></Modal>;
}
function LessonForm({ row, units, onClose, onDone }: { row?: Lesson; units: Unit[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast(); const [f, setF] = useState({ unit_id: row?.unit_id ?? units[0]?.id ?? '', slug: row?.slug ?? '', title: row?.title ?? '', summary: row?.summary ?? '', position: row?.position ?? 1 });
  const save = async () => {
    if (!slugOk(f.slug)) return toast.error('المعرّف (slug) أحرف إنجليزية صغيرة وأرقام وشرطات فقط');
    const q = row ? supabase.from('lessons').update(f).eq('id', row.id) : supabase.from('lessons').insert(f); const { error: e } = await q; if (e) toast.error(errMsg(e)); else onDone();
  };
  return <Modal title={row ? 'تعديل درس' : 'درس جديد'} onClose={onClose}><div className="space-y-3">
    <Field label="الوحدة"><select className={inputCls} value={f.unit_id} onChange={(e) => setF({ ...f, unit_id: e.target.value })}>{units.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}</select></Field>
    <Field label="المعرّف (slug)"><input dir="ltr" className={inputCls} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
    <Field label="العنوان"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
    <Field label="ملخص"><textarea className={inputCls} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>
    <Field label="الترتيب"><input type="number" className={inputCls} value={f.position} onChange={(e) => setF({ ...f, position: Number(e.target.value) })} /></Field><Button onClick={save}>حفظ</Button></div></Modal>;
}

// محرّر الأقسام: يحرّر مصفوفة الكتل (blocks) بصيغة JSON — راجع src/types/content.ts للأنواع المتاحة
function Sections({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const toast = useToast();
  const { data, loading, reload } = useAsync(async () => { const { data: d, error: e } = await supabase.from('lesson_sections').select('*').eq('lesson_id', lesson.id).order('position'); if (e) throw e; return d as { id: string; slug: string; title: string; position: number; blocks: unknown[] }[]; }, [lesson.id]);
  const [sel, setSel] = useState<string | 'new' | null>(null); const [f, setF] = useState({ slug: '', title: '', position: 1, blocks: '[]' });
  const pick = (id: string | 'new') => { setSel(id); const s = data?.find((x) => x.id === id); setF(s ? { slug: s.slug, title: s.title, position: s.position, blocks: JSON.stringify(s.blocks, null, 2) } : { slug: '', title: '', position: (data?.length ?? 0) + 1, blocks: '[{"type":"p","text":"نص الفقرة"}]' }); };
  const save = async () => {
    try {
      if (!slugOk(f.slug)) throw new Error('slug غير صالح'); const blocks = JSON.parse(f.blocks); if (!Array.isArray(blocks)) throw new Error('الكتل يجب أن تكون مصفوفة');
      const row = { lesson_id: lesson.id, slug: f.slug, title: f.title, position: f.position, blocks };
      const { error: e } = sel === 'new' ? await supabase.from('lesson_sections').insert(row) : await supabase.from('lesson_sections').update(row).eq('id', sel!); if (e) throw e;
      toast.success('تم الحفظ'); setSel(null); reload();
    } catch (e) { toast.error(e instanceof SyntaxError ? 'JSON غير صحيح' : errMsg(e)); }
  };
  const del = async () => { if (!confirm('حذف القسم؟')) return; const { error: e } = await supabase.from('lesson_sections').delete().eq('id', sel!); if (e) toast.error(errMsg(e)); else { setSel(null); reload(); } };
  return (
    <Modal wide title={`أقسام: ${lesson.title}`} onClose={onClose}>
      {loading ? <Spinner /> : <div className="space-y-3">
        <div className="flex flex-wrap gap-2">{data?.map((s) => <Button key={s.id} size="sm" variant={sel === s.id ? 'primary' : 'secondary'} onClick={() => pick(s.id)}>{s.position}. {s.title}</Button>)}<Button size="sm" variant="cyan" onClick={() => pick('new')}>+ قسم</Button></div>
        {sel && <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-3"><Field label="العنوان"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="slug"><input dir="ltr" className={inputCls} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
          <Field label="الترتيب"><input type="number" className={inputCls} value={f.position} onChange={(e) => setF({ ...f, position: Number(e.target.value) })} /></Field></div>
          <Field label="الكتل (JSON)" hint='أنواع: p, h, list, definition, table, callout, equation, experiment, figure, conceptmap, sim, exercise, objectives'><textarea dir="ltr" rows={14} className={`${inputCls} font-mono text-xs`} value={f.blocks} onChange={(e) => setF({ ...f, blocks: e.target.value })} /></Field>
          <div className="flex gap-2"><Button onClick={save}>حفظ القسم</Button>{sel !== 'new' && <Button variant="danger" onClick={del}>حذف</Button>}</div></div>}
      </div>}
    </Modal>
  );
}
