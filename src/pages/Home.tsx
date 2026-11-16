import { Link } from 'react-router-dom';
import { Box, FlaskConical, Megaphone, Network, Play, Sparkles } from 'lucide-react';
import { Banner, Button, Card, Spinner } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { fmtDay, pct } from '../lib/format';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { loadCurriculum } from '../services/curriculum';
import { listMyAssignments } from '../services/homework';
import { myAttempts } from '../services/quiz';
import type { Announcement } from '../types/db';

export default function Home() {
  const { session, profile, isAdmin } = useAuth();
  const cur = useAsync(loadCurriculum, []);
  const ann = useAsync(async () => {
    if (!isSupabaseConfigured) return [] as Announcement[];
    const { data } = await supabase.from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(3);
    return (data ?? []) as Announcement[];
  }, []);
  const mine = useAsync(async () => (session && !isAdmin ? { hw: await listMyAssignments(session.user.id), att: await myAttempts(session.user.id, 3) } : null), [session?.user.id, isAdmin]);
  const quick = [
    { to: '/lab', t: 'المعمل ثلاثي الأبعاد', d: 'دوّر الجهاز الهضمي وانقر على أعضائه', i: <Box />, c: 'from-royal-600 to-cyan-500' },
    { to: '/simulations', t: 'المحاكاة العلمية', d: 'ثماني محاكاة خطوة بخطوة', i: <Play />, c: 'from-navy-800 to-royal-600' },
    { to: '/concept-maps', t: 'خرائط المفاهيم', d: 'اضغط على المفهوم لتعرف تفاصيله', i: <Network />, c: 'from-cyan-600 to-emerald-500' },
    { to: '/quizzes', t: 'الاختبارات', d: 'تُصحَّح فوراً وتُحفظ نتائجك', i: <FlaskConical />, c: 'from-violet-600 to-royal-600' },
  ];
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-navy-950 via-navy-800 to-royal-600 p-8 text-white shadow-card sm:p-14">
        <div className="absolute -start-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden />
        <p className="mb-2 flex items-center gap-2 font-bold text-cyan-300"><Sparkles size={18} />الصف التاسع — العلوم والحياة — الفصل الأول</p>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl">منصة العلوم والحياة</h1>
        <p className="mt-4 max-w-2xl text-xl leading-9 text-white/90">رحلتك التفاعلية لاكتشاف جسم الإنسان والعلوم</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/lessons"><Button variant="cyan" size="lg">ابدأ التعلّم</Button></Link>
          <Link to={session ? (isAdmin ? '/admin' : '/dashboard') : '/login'}><Button variant="secondary" size="lg">{session ? (isAdmin ? 'لوحة الإدارة' : 'لوحة الطالب') : 'تسجيل الدخول'}</Button></Link>
        </div>
        {profile && <p className="mt-6 text-white/80">أهلاً بك، {profile.full_name}</p>}
      </section>

      {!isSupabaseConfigured && <Banner>المنصة تعمل الآن بوضع القراءة (بدون حسابات أو حفظ نتائج) لأن Supabase غير مربوط. الدروس والمعمل والمحاكاة متاحة. لتفعيل الحسابات والواجبات اتبع README.</Banner>}

      <section aria-label="وصول سريع" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {quick.map((q) => <Link key={q.to} to={q.to} className={`group rounded-3xl bg-gradient-to-br ${q.c} p-6 text-white shadow-card transition hover:-translate-y-1`}>
          <div className="mb-3">{q.i}</div><h2 className="text-xl font-extrabold">{q.t}</h2><p className="mt-1 text-white/85">{q.d}</p></Link>)}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-extrabold text-navy-900">الوحدات والدروس</h2>
        {cur.loading ? <Spinner /> : cur.data?.units.map((u) => (
          <Card key={u.id} className="mb-4"><h3 className="text-xl font-extrabold text-navy-900">{u.title}</h3><p className="mb-4 text-slate-600">{u.description}</p>
            <div className="grid gap-3 sm:grid-cols-2">{cur.data!.lessons.filter((l) => l.unit_id === u.id).map((l) => (
              <Link key={l.id} to={`/lessons/${l.slug}`} className="rounded-2xl border border-soft-200 bg-soft-50 p-4 transition hover:border-cyan-400 hover:shadow-glow">
                <p className="font-extrabold text-royal-600">الدرس {l.position}</p><p className="text-lg font-bold">{l.title}</p><p className="mt-1 text-sm text-slate-600">{l.summary}</p></Link>))}</div></Card>))}
      </section>

      {mine.data && (
        <section className="grid gap-5 lg:grid-cols-2">
          <Card><h2 className="mb-3 text-xl font-extrabold">آخر الواجبات</h2>
            {mine.data.hw.assignments.length === 0 ? <p className="text-slate-500">لا توجد واجبات حالياً.</p> : mine.data.hw.assignments.slice(0, 4).map((a) => (
              <Link key={a.id} to={`/homework/${a.id}`} className="flex justify-between border-b border-soft-200 py-2 last:border-0"><span className="font-bold">{a.title}</span><span className="text-sm text-slate-500">{fmtDay(a.due_at)}</span></Link>))}</Card>
          <Card><h2 className="mb-3 text-xl font-extrabold">آخر نتائج الاختبارات</h2>
            {mine.data.att.length === 0 ? <p className="text-slate-500">لم تُجرِ اختباراً بعد.</p> : mine.data.att.map((a) => (
              <div key={a.id} className="flex justify-between border-b border-soft-200 py-2 last:border-0"><span className="font-bold">{a.quizzes?.title}</span><span className="font-extrabold text-royal-600">{pct(a.max_score ? (a.score / a.max_score) * 100 : 0)}</span></div>))}</Card>
        </section>)}

      {ann.data && ann.data.length > 0 && (
        <section><h2 className="mb-4 flex items-center gap-2 text-2xl font-extrabold text-navy-900"><Megaphone className="text-cyan-600" />الإعلانات</h2>
          <div className="grid gap-4 md:grid-cols-3">{ann.data.map((a) => <Card key={a.id}><h3 className="font-extrabold">{a.title}</h3><p className="mt-1 text-slate-700">{a.body}</p><p className="mt-2 text-xs text-slate-500">{fmtDay(a.created_at)}</p></Card>)}</div></section>)}
    </div>
  );
}
