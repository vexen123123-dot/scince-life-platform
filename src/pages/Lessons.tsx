import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { Banner, Card, Empty, ErrorBox, PageHeader, Spinner } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { loadCurriculum, loadMyProgress } from '../services/curriculum';
import { lessons as bundled } from '../content/curriculum';

export default function Lessons() {
  const { session } = useAuth();
  const cur = useAsync(loadCurriculum, []);
  const prog = useAsync(async () => (session ? loadMyProgress(session.user.id) : []), [session?.user.id]);
  if (cur.loading) return <Spinner />;
  if (cur.error || !cur.data) return <ErrorBox message={cur.error ?? 'تعذّر التحميل'} onRetry={cur.reload} />;
  const { units, lessons, source } = cur.data;
  const total = (slug: string) => bundled.find((b) => b.slug === slug)?.sections.length ?? 0;
  return (
    <>
      <PageHeader title="الدروس" subtitle="الصف التاسع — العلوم والحياة — الفصل الأول" />
      {source === 'bundled' && <Banner>تُعرض الدروس من المحتوى المضمّن في التطبيق لأن قاعدة البيانات غير متصلة أو فارغة. تتبّع التقدّم والحسابات يحتاج ربط Supabase.</Banner>}
      {units.length === 0 && <Empty title="لا توجد وحدات منشورة بعد" />}
      <div className="space-y-10">
        {units.map((u) => (
          <section key={u.id}>
            <h2 className="mb-1 text-2xl font-extrabold text-navy-900">{u.title}</h2><p className="mb-4 text-slate-600">{u.description}</p>
            <div className="grid gap-5 md:grid-cols-2">
              {lessons.filter((l) => l.unit_id === u.id).map((l) => {
                const p = prog.data?.find((x) => x.lesson_id === l.id);
                const done = p?.completed_at;
                const pct = p && total(l.slug) ? Math.round((p.completed_sections.length / total(l.slug)) * 100) : 0;
                return (
                  <Link key={l.id} to={`/lessons/${l.slug}`} className="group">
                    <Card className="h-full transition group-hover:-translate-y-1 group-hover:shadow-glow">
                      <div className="flex items-start gap-3"><div className="rounded-xl bg-royal-600 p-3 text-white"><BookOpen /></div>
                        <div className="flex-1"><h3 className="text-xl font-extrabold text-navy-900">الدرس {l.position}: {l.title}</h3><p className="mt-1 text-slate-600">{l.summary}</p></div>
                        {done && <CheckCircle2 className="text-emerald-600" />}</div>
                      {session && <div className="mt-4"><div className="h-2 overflow-hidden rounded-full bg-soft-200"><div className="h-full bg-cyan-500" style={{ width: `${done ? 100 : pct}%` }} /></div>
                        <p className="mt-1 text-xs text-slate-500">{done ? 'مكتمل' : `${pct}% من الأقسام`}</p></div>}
                    </Card>
                  </Link>);
              })}
            </div>
          </section>))}
      </div>
    </>
  );
}
