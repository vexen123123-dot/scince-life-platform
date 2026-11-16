import { Link, useNavigate, useParams } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { BackLink, Button, Card, Empty, ErrorBox, PageHeader, Spinner } from '../components/ui';
import { QuizRunner } from '../features/quiz/QuizRunner';
import { useAsync } from '../hooks/useAsync';
import { fmtDate, pct } from '../lib/format';
import { useAuth } from '../contexts/AuthContext';
import { getQuiz, listQuizzes, myAttempts } from '../services/quiz';

export function QuizzesList() {
  const { session } = useAuth();
  const q = useAsync(listQuizzes, [session?.user.id]);
  const att = useAsync(async () => (session ? myAttempts(session.user.id, 20) : []), [session?.user.id]);
  if (q.loading) return <Spinner />;
  if (q.error) return <ErrorBox message={q.error} onRetry={q.reload} />;
  return (
    <>
      <PageHeader title="الاختبارات" subtitle="تُصحَّح الإجابات على الخادم وتظهر الإجابة الصحيحة بعد أن تجيب فقط." />
      {!session && <Card className="mb-6 border-amber-300 bg-amber-50">سجّل الدخول لأداء الاختبارات وحفظ نتائجك. <Link className="font-bold text-royal-600 underline" to="/login">تسجيل الدخول</Link></Card>}
      {q.data?.length === 0 ? <Empty title="لا توجد اختبارات منشورة" hint="لم تُضف المعلمة اختبارات بعد، أو لم تُطبَّق ترحيلات البذر." /> : (
        <div className="grid gap-5 md:grid-cols-2">
          {q.data?.map((z) => (
            <Card key={z.id}><div className="flex items-start gap-3"><ListChecks className="mt-1 text-royal-600" />
              <div className="flex-1"><h2 className="text-xl font-extrabold text-navy-900">{z.title}</h2><p className="mt-1 text-slate-600">{z.description}</p>
                <Link to={session ? `/quizzes/${z.slug}` : '/login'}><Button className="mt-4">ابدأ الاختبار</Button></Link></div></div></Card>))}
        </div>)}
      {att.data && att.data.length > 0 && (
        <section className="mt-10"><h2 className="mb-3 text-xl font-extrabold text-navy-900">محاولاتي السابقة</h2>
          <div className="space-y-2">{att.data.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3"><span className="font-bold">{a.quizzes?.title}{a.is_retry && ' (إعادة)'}</span>
              <span className="text-sm text-slate-600">{fmtDate(a.completed_at)}</span><span className="font-extrabold text-royal-600">{pct(a.max_score ? (a.score / a.max_score) * 100 : 0)}</span></Card>))}</div></section>)}
    </>
  );
}

export function QuizPage() {
  const { slug = '' } = useParams(); const nav = useNavigate();
  const q = useAsync(() => getQuiz(slug), [slug]);
  if (q.loading) return <Spinner />;
  if (q.error) return <ErrorBox message={q.error} />;
  if (!q.data) return <ErrorBox message="الاختبار غير موجود" />;
  return <><BackLink to="/quizzes">كل الاختبارات</BackLink><h1 className="mb-6 text-3xl font-extrabold text-navy-900">{q.data.title}</h1>
    <QuizRunner quiz={q.data} onExit={() => nav('/quizzes')} /></>;
}
