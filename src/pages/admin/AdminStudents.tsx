import { useState, type FormEvent } from 'react';
import { Badge, Button, DataTable, ErrorBox, Field, Modal, PageHeader, Spinner, inputCls, type Column } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { fmtDay, pct } from '../../lib/format';
import { errMsg } from '../../lib/supabase';
import * as admin from '../../services/admin';

export default function AdminStudents() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(async () => ({ perf: await admin.performance(), students: await admin.listStudents() }), []);
  const [creating, setCreating] = useState(false);
  const [edit, setEdit] = useState<admin.Perf | null>(null);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', group_name: '' });
  const [busy, setBusy] = useState(false);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const created = (id: string) => data.students.find((s) => s.id === id)?.created_at;

  const create = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await admin.createStudent({ ...form, group_name: form.group_name || undefined }); toast.success('تم إنشاء حساب الطالب'); setCreating(false); setForm({ email: '', password: '', full_name: '', group_name: '' }); reload(); }
    catch (er) { toast.error(errMsg(er)); } finally { setBusy(false); }
  };
  const columns: Column<admin.Perf & { id: string }>[] = [
    { key: 'full_name', header: 'الاسم' }, { key: 'group_name', header: 'المجموعة', render: (r) => r.group_name ?? '—' },
    { key: 'is_active', header: 'الحالة', sortValue: (r) => Number(r.is_active), render: (r) => <Badge tone={r.is_active ? 'green' : 'red'}>{r.is_active ? 'نشط' : 'موقوف'}</Badge> },
    { key: 'lessons_done', header: 'دروس مكتملة' }, { key: 'quiz_attempts', header: 'اختبارات' },
    { key: 'avg_quiz', header: 'متوسط الاختبارات', sortValue: (r) => r.avg_quiz ?? -1, render: (r) => pct(r.avg_quiz) },
    { key: 'submitted', header: 'واجبات مسلَّمة' }, { key: 'avg_grade', header: 'متوسط الدرجات', sortValue: (r) => r.avg_grade ?? -1, render: (r) => pct(r.avg_grade) },
    { key: 'created', header: 'انضم', sortValue: (r) => created(r.id) ?? '', searchValue: () => '', render: (r) => fmtDay(created(r.id)) },
    { key: 'act', header: '', searchValue: () => '', render: (r) => <Button size="sm" variant="secondary" onClick={() => setEdit(r)}>إدارة</Button> },
  ];
  const rows = data.perf.map((p) => ({ ...p, id: p.student_id }));
  return (
    <>
      <PageHeader title="الطلاب" actions={<Button onClick={() => setCreating(true)}>+ إضافة طالب</Button>} />
      <DataTable rows={rows} columns={columns} empty="لا يوجد طلاب بعد. أضف أول طالب." />
      {creating && (
        <Modal title="إضافة طالب" onClose={() => setCreating(false)}>
          <form onSubmit={create} className="space-y-3">
            <Field label="الاسم الكامل"><input required className={inputCls} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="البريد الإلكتروني"><input required type="email" dir="ltr" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="كلمة مرور مؤقتة" hint="10 أحرف على الأقل. سلّمها للطالب مباشرة."><input required minLength={10} type="text" dir="ltr" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <Field label="المجموعة / الشعبة (اختياري)"><input className={inputCls} value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} /></Field>
            <Button type="submit" loading={busy}>إنشاء الحساب</Button></form></Modal>)}
      {edit && <EditStudent s={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); reload(); }} />}
    </>
  );
}

function EditStudent({ s, onClose, onDone }: { s: admin.Perf; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(s.full_name); const [group, setGroup] = useState(s.group_name ?? ''); const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); toast.success(ok); onDone(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  return (
    <Modal title={`إدارة: ${s.full_name}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="الاسم"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="المجموعة"><input className={inputCls} value={group} onChange={(e) => setGroup(e.target.value)} /></Field>
        <div className="flex flex-wrap gap-2">
          <Button loading={busy} onClick={() => run(() => admin.updateStudent(s.student_id, { full_name: name, group_name: group || null }), 'تم الحفظ')}>حفظ</Button>
          <Button variant={s.is_active ? 'danger' : 'cyan'} loading={busy} onClick={() => run(() => admin.updateStudent(s.student_id, { is_active: !s.is_active }), s.is_active ? 'تم إيقاف الحساب' : 'تم تفعيل الحساب')}>{s.is_active ? 'إيقاف الحساب' : 'تفعيل الحساب'}</Button></div>
        <hr />
        <Field label="كلمة مرور جديدة" hint="10 أحرف على الأقل"><input className={inputCls} dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Button variant="secondary" disabled={pw.length < 10} loading={busy} onClick={() => run(() => admin.resetStudentPassword(s.student_id, pw), 'تم تغيير كلمة المرور')}>تغيير كلمة المرور</Button>
      </div>
    </Modal>
  );
}
