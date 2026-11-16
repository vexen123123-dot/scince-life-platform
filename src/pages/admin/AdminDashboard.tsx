import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, ErrorBox, PageHeader, Spinner } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { fmtDate, pct } from '../../lib/format';
import * as admin from '../../services/admin';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [s, p, a] = await Promise.all([admin.stats(), admin.performance(), admin.listAudit(8)]);
    return { s, p, a };
  }, []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const { s, p, a } = data;
  const cards: [string, string | number][] = [
    ['إجمالي الطلاب', s.total_students ?? 0], ['الطلاب النشطون (14 يوماً)', s.active_students ?? 0], ['إجمالي الواجبات', s.total_assignments ?? 0],
    ['تسليمات', s.submitted ?? 0], ['بانتظار التصحيح', s.pending_grading ?? 0], ['واجبات غير مسلَّمة (بعد الموعد)', s.missing ?? 0],
    ['متوسط الدرجات', pct(s.avg_grade_percent)], ['متوسط الاختبارات', pct(s.avg_quiz_percent)],
  ];
  const perf = p.map((x) => ({ name: x.full_name || '—', اختبارات: x.avg_quiz ?? 0, واجبات: x.avg_grade ?? 0 }));
  const pie = [{ name: 'مسلَّمة', value: Number(s.submitted ?? 0) }, { name: 'غير مسلَّمة', value: Number(s.missing ?? 0) }];
  return (
    <>
      <PageHeader title="نظرة عامة" subtitle="إحصاءات المنصة" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([l, v]) => <Card key={l} className="text-center"><p className="text-3xl font-extrabold text-royal-600">{v}</p><p className="mt-1 text-sm font-bold text-navy-800">{l}</p></Card>)}</div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2"><h2 className="mb-3 font-extrabold">أداء الطلاب (٪)</h2>
          {perf.length === 0 ? <p className="py-10 text-center text-slate-500">لا يوجد طلاب بعد.</p> : <div className="h-72" dir="ltr"><ResponsiveContainer><BarChart data={perf}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Legend />
            <Bar dataKey="اختبارات" fill="#2563eb" radius={[6, 6, 0, 0]} /><Bar dataKey="واجبات" fill="#22d3ee" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>}</Card>
        <Card><h2 className="mb-3 font-extrabold">حالة التسليم</h2>
          {pie.every((x) => x.value === 0) ? <p className="py-10 text-center text-slate-500">لا بيانات.</p> : <div className="h-72" dir="ltr"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" nameKey="name" outerRadius={90} label>{pie.map((_, i) => <Cell key={i} fill={['#2563eb', '#ef4444'][i]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>}</Card>
      </div>
      <Card className="mt-6"><h2 className="mb-3 font-extrabold">آخر الأنشطة الإدارية</h2>
        {a.length === 0 ? <p className="text-slate-500">لا أنشطة.</p> : <ul className="space-y-2 text-sm">{a.map((l) => <li key={l.id} className="flex justify-between rounded-lg bg-soft-50 p-2"><span>{l.action} — {l.entity}</span><span className="text-slate-500">{fmtDate(l.created_at)}</span></li>)}</ul>}</Card>
    </>
  );
}
