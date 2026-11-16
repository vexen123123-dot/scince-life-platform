import { useState, type FormEvent } from 'react';
import { Button, Card, ErrorBox, Field, PageHeader, Spinner, inputCls } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { fmtDay } from '../../lib/format';
import { errMsg, supabase } from '../../lib/supabase';
import type { Announcement } from '../../types/db';

export default function AdminSettings() {
  const toast = useToast(); const { session } = useAuth();
  const { data, loading, error, reload } = useAsync(async () => {
    const [s, a] = await Promise.all([supabase.from('platform_settings').select('*').order('key'), supabase.from('announcements').select('*').order('created_at', { ascending: false })]);
    if (s.error) throw s.error; if (a.error) throw a.error;
    return { settings: s.data as { key: string; value: unknown; is_public: boolean }[], ann: a.data as Announcement[] };
  }, []);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [t, setT] = useState(''); const [b, setB] = useState('');
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const save = async (key: string, is_public: boolean) => {
    try {
      const value = JSON.parse(drafts[key] ?? JSON.stringify(data.settings.find((x) => x.key === key)!.value));
      const { error: e } = await supabase.from('platform_settings').upsert({ key, value, is_public, updated_by: session!.user.id }); if (e) throw e;
      toast.success('تم حفظ الإعداد'); reload();
    } catch (e) { toast.error(e instanceof SyntaxError ? 'صيغة JSON غير صحيحة' : errMsg(e)); }
  };
  const addAnn = async (e: FormEvent) => {
    e.preventDefault();
    const { error: er } = await supabase.from('announcements').insert({ title: t, body: b, created_by: session!.user.id });
    if (er) toast.error(errMsg(er)); else { toast.success('تم نشر الإعلان'); setT(''); setB(''); reload(); }
  };
  const delAnn = async (id: string) => { const { error: er } = await supabase.from('announcements').delete().eq('id', id); if (er) toast.error(errMsg(er)); else reload(); };
  return (
    <>
      <PageHeader title="الإعدادات والإعلانات" />
      <div className="space-y-6">
        <Card><h2 className="mb-3 text-xl font-extrabold">إعدادات المنصة</h2>
          {data.settings.length === 0 ? <p className="text-slate-500">لا إعدادات. طبّق ترحيل البذر.</p> : data.settings.map((s) => (
            <div key={s.key} className="mb-4"><p className="mb-1 font-bold">{s.key} {s.is_public && <span className="text-xs text-slate-500">(عام)</span>}</p>
              <textarea dir="ltr" rows={4} className={`${inputCls} font-mono text-sm`} defaultValue={JSON.stringify(s.value, null, 2)} onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })} />
              <Button size="sm" className="mt-2" onClick={() => save(s.key, s.is_public)}>حفظ</Button></div>))}</Card>
        <Card><h2 className="mb-3 text-xl font-extrabold">الإعلانات</h2>
          <form onSubmit={addAnn} className="mb-4 space-y-3"><Field label="العنوان"><input required className={inputCls} value={t} onChange={(e) => setT(e.target.value)} /></Field>
            <Field label="النص"><textarea className={inputCls} rows={3} value={b} onChange={(e) => setB(e.target.value)} /></Field><Button type="submit">نشر</Button></form>
          {data.ann.map((a) => <div key={a.id} className="flex items-start justify-between gap-2 border-t border-soft-200 py-3"><div><p className="font-bold">{a.title}</p><p className="text-sm text-slate-600">{a.body}</p><p className="text-xs text-slate-400">{fmtDay(a.created_at)}</p></div>
            <Button size="sm" variant="danger" onClick={() => delAnn(a.id)}>حذف</Button></div>)}</Card>
      </div>
    </>
  );
}
