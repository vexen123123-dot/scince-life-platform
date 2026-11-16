import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, Empty, ErrorBox, PageHeader, Spinner } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { fmtDate, pct } from '../lib/format';
import { loadCurriculum, loadMyProgress } from '../services/curriculum';
import { listMyAssignments } from '../services/homework';
import { myAttempts } from '../services/quiz';
import { lessons as bundled } from '../content/curriculum';
import { stateLabel, stateTone, studentState } from './Homework';

export default function StudentDashboard() {
  const { session, profile } = useAuth(); const uid = session!.user.id;
  const { data, loading, error, reload } = useAsync(async () => {
    const [cur, prog, hw, att] = await Promise.all([loadCurriculum(), loadMyProgress(uid), listMyAssignments(uid), myAttempts(uid, 30)]);
    return { cur, prog, hw, att };
  }, [uid]);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const { cur, prog, hw, att } = data;
  const rows = hw.assignments.map((a) => { const s = hw.submissions.find((x) => x.assignment_id === a.id); return { a, s, g: s && hw.grades.find((g) => g.submission_id === s.id), st: studentState(a, s) }; });
  const pending = rows.filter((r) => ['pending', 'draft', 'returned'].includes(r.st));
  const missing = rows.filter((r) => r.st === 'missing');
  const submitted = rows.filter((r) => ['submitted', 'graded'].includes(r.st));
  const chart = [...att].reverse().map((x, i) => ({ n: i + 1, نتيجة: x.max_score ? Math.round((x.score / x.max_score) * 100) : 0 }));
  const feedbackRows = rows.filter((r) => r.g);
  return (
    <>
      <PageHeader title={`أهلاً ${profile?.full_name || 'بك'} 👋`} subtitle={profile?.group_name ? `المجموعة: ${profile.group_name}` : 'لوحة الطالب'} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[['واجبات مطلوبة', pending.length], ['واجبات متأخرة', missing.length], ['مسلَّمة', submitted.length], ['اختبارات أنجزتها', att.length]].map(([l, v]) => (
          <Card key={l as string} className="text-center"><p className="text-4xl font-extrabold text-royal-600">{v}</p><p className="mt-1 font-bold text-navy-800">{l}</p></Card>))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-3 text-xl font-extrabold">تقدّمي في الدروس</h2>
          {cur.lessons.length === 0 ? <Empty title="لا دروس" /> : <div className="space-y-3">{cur.lessons.map((l) => {
            const p = prog.find((x) => x.lesson_id === l.id); const t = bundled.find((b) => b.slug === l.slug)?.sections.length ?? 1;
            const v = p?.completed_at ? 100 : Math.round(((p?.completed_sections.length ?? 0) / t) * 100);
            return <Link key={l.id} to={`/lessons/${l.slug}`} className="block"><div className="flex justify-between text-sm font-bold"><span>{l.title}</span><span>{v}%</span></div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-soft-200"><div className="h-full bg-cyan-500" style={{ width: `${v}%` }} /></div></Link>; })}</div>}</Card>
        <Card><h2 className="mb-3 text-xl font-extrabold">نتائج الاختبارات</h2>
          {chart.length === 0 ? <Empty title="لم تُجرِ اختباراً بعد" hint="ابدأ من صفحة الاختبارات." /> : (
            <div className="h-56" dir="ltr"><ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="n" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="نتيجة" fill="#2563eb" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>)}</Card>
        <Card><h2 className="mb-3 text-xl font-extrabold">الواجبات والمواعيد القريبة</h2>
          {[...pending, ...missing].length === 0 ? <Empty title="لا واجبات مطلوبة 🎉" /> : <div className="space-y-2">{[...pending, ...missing].slice(0, 8).map((r) => (
            <Link key={r.a.id} to={`/homework/${r.a.id}`} className="flex items-center justify-between gap-2 rounded-xl bg-soft-50 p-3 hover:bg-soft-100"><span className="font-bold">{r.a.title}</span>
              <span className="text-xs text-slate-600">{fmtDate(r.a.due_at)}</span><Badge tone={stateTone(r.st)}>{stateLabel(r.st)}</Badge></Link>))}</div>}</Card>
        <Card><h2 className="mb-3 text-xl font-extrabold">الدرجات</h2>
          {feedbackRows.length === 0 ? <Empty title="لا درجات بعد" /> : <div className="space-y-2">{feedbackRows.map((r) => (
            <Link key={r.a.id} to={`/homework/${r.a.id}`} className="flex items-center justify-between rounded-xl bg-emerald-50 p-3"><span className="font-bold">{r.a.title}</span><span className="font-extrabold text-emerald-700">{r.g!.score} / {r.a.max_score} ({pct((r.g!.score / r.a.max_score) * 100)})</span></Link>))}</div>}</Card>
        <Card className="lg:col-span-2"><h2 className="mb-3 text-xl font-extrabold">آخر الأنشطة</h2>
          {att.length === 0 && prog.length === 0 ? <Empty title="لا أنشطة بعد" /> : <ul className="space-y-2 text-sm">
            {att.slice(0, 5).map((a) => <li key={a.id} className="flex justify-between rounded-lg bg-soft-50 p-2"><span>أنجزت اختبار «{a.quizzes?.title}»</span><span className="text-slate-500">{fmtDate(a.completed_at)}</span></li>)}
            {prog.slice(0, 5).map((p) => <li key={p.lesson_id} className="rounded-lg bg-soft-50 p-2">تقدّم في درس: {cur.lessons.find((l) => l.id === p.lesson_id)?.title ?? '—'} ({p.completed_sections.length} أقسام)</li>)}</ul>}</Card>
      </div>
    </>
  );
}
