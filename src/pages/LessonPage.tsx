import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';
import { BackLink, Banner, Button, Card, ErrorBox, Spinner } from '../components/ui';
import { BlockRenderer } from '../features/lessons/BlockRenderer';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { cx } from '../lib/format';
import { errMsg } from '../lib/supabase';
import { loadLesson, loadMyProgress, saveProgress } from '../services/curriculum';
import { listQuizzes } from '../services/quiz';

export default function LessonPage() {
  const { slug = '' } = useParams();
  const { session } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => loadLesson(slug), [slug]);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const lessonId = data?.lesson.id ?? null;
  const uid = session?.user.id;

  useEffect(() => { setIdx(0); }, [slug]);
  useEffect(() => {
    if (!uid || !lessonId) { setDone([]); return; }
    loadMyProgress(uid).then((p) => setDone(p.find((x) => x.lesson_id === lessonId)?.completed_sections ?? [])).catch(() => undefined);
  }, [uid, lessonId]);
  const quiz = useAsync(async () => (session && lessonId ? (await listQuizzes()).find((q) => q.lesson_id === lessonId) ?? null : null), [lessonId, uid]);

  const sections = data?.sections ?? [];
  const sec = sections[idx];
  const content = useMemo(() => sec && <BlockRenderer key={sec.slug} blocks={sec.blocks} />, [sec]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <ErrorBox message="الدرس غير موجود" />;
  if (!sec) return <ErrorBox message="لا توجد أقسام في هذا الدرس بعد." />;

  const complete = async () => {
    const next = done.includes(sec.slug) ? done : [...done, sec.slug];
    setDone(next);
    if (uid && lessonId) {
      try { await saveProgress(uid, lessonId, next, sections.length); if (next.length >= sections.length) toast.success('🎉 أكملت الدرس بالكامل!'); }
      catch (e) { toast.error(errMsg(e)); }
    }
    if (idx < sections.length - 1) { setIdx(idx + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };
  const pct = Math.round((done.length / sections.length) * 100);
  const isLast = idx === sections.length - 1;

  return (
    <>
      <BackLink to="/lessons">كل الدروس</BackLink>
      {data.source === 'bundled' && <Banner tone="blue">وضع القراءة: المحتوى مضمّن في التطبيق. {session ? '' : 'سجّل الدخول لحفظ تقدّمك.'}</Banner>}
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-4">
            <h2 className="mb-1 text-lg font-extrabold text-navy-900">{data.lesson.title}</h2>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-soft-200"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${pct}%` }} /></div>
            <p className="mb-3 text-xs text-slate-500">{done.length} من {sections.length} أقسام{!uid && ' (التقدّم غير محفوظ بدون حساب)'}</p>
            <nav aria-label="أقسام الدرس"><ol className="space-y-1">
              {sections.map((s, i) => (
                <li key={s.slug}><button onClick={() => { setIdx(i); window.scrollTo({ top: 0 }); }} aria-current={i === idx}
                  className={cx('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-sm font-bold transition', i === idx ? 'bg-royal-600 text-white' : 'hover:bg-soft-100')}>
                  {done.includes(s.slug) ? <CheckCircle2 size={18} className={i === idx ? 'text-white' : 'text-emerald-600'} /> : <Circle size={18} />}<span>{s.title}</span></button></li>))}
            </ol></nav>
          </Card>
        </aside>
        <article className="min-w-0 space-y-6">
          <h1 className="text-3xl font-extrabold text-navy-900">{sec.title}</h1>
          {content}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-soft-200 pt-6">
            <Button variant="secondary" disabled={idx === 0} onClick={() => { setIdx(idx - 1); window.scrollTo({ top: 0 }); }}><ChevronRight size={18} />السابق</Button>
            <Button variant="cyan" onClick={complete}>{isLast ? 'إنهاء الدرس' : 'تم، القسم التالي'}{!isLast && <ChevronLeft size={18} />}</Button>
          </div>
          {isLast && (
            <Card className="border-royal-500/40 bg-royal-500/5 text-center">
              <ListChecks className="mx-auto text-royal-600" size={36} /><h2 className="mt-2 text-xl font-extrabold">اختبر نفسك</h2>
              {quiz.data ? <><p className="my-2 text-slate-700">{quiz.data.title} — تُحفظ نتيجتك في حسابك.</p><Link to={`/quizzes/${quiz.data.slug}`}><Button>ابدأ الاختبار</Button></Link></>
                : <><p className="my-2 text-slate-700">{session ? 'لا يوجد اختبار مرتبط بهذا الدرس.' : 'سجّل الدخول لأداء اختبار الدرس وحفظ نتيجته.'}</p>
                  <Link to={session ? '/quizzes' : '/login'}><Button variant="secondary">{session ? 'كل الاختبارات' : 'تسجيل الدخول'}</Button></Link></>}
            </Card>)}
        </article>
      </div>
    </>
  );
}
