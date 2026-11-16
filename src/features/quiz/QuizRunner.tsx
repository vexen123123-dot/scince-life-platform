import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { Badge, Button, Card, ErrorBox, Spinner } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { cx, shuffle } from '../../lib/format';
import { errMsg } from '../../lib/supabase';
import { answerQuestion, finishAttempt, getQuestions, startAttempt, type AnswerResult, type FinishResult } from '../../services/quiz';
import type { Quiz, QuizQuestion } from '../../types/db';

const kindLabel: Record<string, string> = {
  mcq: 'اختيار من متعدد', true_false: 'صواب أم خطأ', fill_blank: 'أكمل الفراغ', matching: 'مطابقة', definition: 'عرّف',
  explain_why: 'علّل', short_answer: 'إجابة قصيرة', classification: 'تصنيف', equation: 'معادلة علمية', compare: 'قارن',
};
type Ans = Record<string, unknown>;
interface Opt { left?: string[]; right?: string[]; items?: string[]; categories?: string[] }

function QuestionInput({ q, value, onChange, disabled }: { q: QuizQuestion; value: Ans; onChange: (a: Ans) => void; disabled: boolean }) {
  const o = (q.options ?? {}) as Opt;
  const rightOrder = useMemo(() => shuffle((o.right ?? []).map((_, i) => i)), [q.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (q.kind === 'mcq') {
    const opts = q.options as string[];
    return <div className="space-y-2">{opts.map((t, i) => (
      <label key={i} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-lg', value.value === i ? 'border-royal-600 bg-royal-50' : 'border-soft-200 hover:bg-soft-50')}>
        <input type="radio" disabled={disabled} checked={value.value === i} onChange={() => onChange({ value: i })} className="h-5 w-5" />{t}</label>))}</div>;
  }
  if (q.kind === 'true_false') {
    return <div className="flex gap-3">{[true, false].map((v) => (
      <button key={String(v)} disabled={disabled} onClick={() => onChange({ value: v })}
        className={cx('flex-1 rounded-xl border p-4 text-xl font-extrabold', value.value === v ? 'border-royal-600 bg-royal-600 text-white' : 'border-soft-200 hover:bg-soft-100')}>{v ? 'صواب' : 'خطأ'}</button>))}</div>;
  }
  if (q.kind === 'fill_blank' || q.kind === 'equation') {
    const parts = q.prompt.split('___'); const vals = (value.values as string[]) ?? [];
    return (
      <div className="flex flex-wrap items-center gap-2 text-lg leading-[3rem]" dir="rtl">
        {parts.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <span>{p}</span>
            {i < parts.length - 1 && <input disabled={disabled} value={vals[i] ?? ''} aria-label={`الفراغ ${i + 1}`}
              onChange={(e) => { const nv = [...vals]; for (let k = 0; k < parts.length - 1; k++) nv[k] = nv[k] ?? ''; nv[i] = e.target.value; onChange({ values: nv }); }}
              className="w-36 rounded-lg border border-royal-500 bg-white px-2 py-1 text-center" />}
          </span>))}
      </div>);
  }
  if (q.kind === 'matching') {
    const pairs = ((value.pairs as [number, number][]) ?? []);
    const cur = (l: number) => pairs.find((p) => p[0] === l)?.[1];
    return <div className="space-y-2">{(o.left ?? []).map((l, i) => (
      <div key={i} className="flex flex-wrap items-center gap-3 rounded-xl bg-soft-50 p-2">
        <span className="min-w-36 font-bold">{l}</span><span>←</span>
        <select disabled={disabled} value={cur(i) ?? ''} className="min-w-52 flex-1 rounded-lg border border-soft-200 bg-white p-2"
          onChange={(e) => { const r = Number(e.target.value); onChange({ pairs: [...pairs.filter((p) => p[0] !== i), [i, r]] }); }}>
          <option value="">اختر…</option>{rightOrder.map((ri) => <option key={ri} value={ri}>{o.right![ri]}</option>)}
        </select></div>))}</div>;
  }
  if (q.kind === 'classification') {
    const map = (value.map as Record<string, number>) ?? {};
    return <div className="space-y-2">{(o.items ?? []).map((it, i) => (
      <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-soft-50 p-2">
        <span className="min-w-40 font-bold">{it}</span>
        {(o.categories ?? []).map((c, ci) => (
          <button key={c} disabled={disabled} onClick={() => onChange({ map: { ...map, [String(i)]: ci } })}
            className={cx('rounded-lg border px-3 py-1.5 text-sm font-bold', map[String(i)] === ci ? 'border-royal-600 bg-royal-600 text-white' : 'border-soft-200 bg-white hover:bg-soft-100')}>{c}</button>))}
      </div>))}</div>;
  }
  return <textarea disabled={disabled} rows={4} value={(value.text as string) ?? ''} onChange={(e) => onChange({ text: e.target.value })}
    placeholder="اكتب إجابتك هنا…" className="w-full rounded-xl border border-soft-200 p-3 text-lg focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-400/25" />;
}

function isReady(q: QuizQuestion, a: Ans): boolean {
  const o = (q.options ?? {}) as Opt;
  switch (q.kind) {
    case 'mcq': case 'true_false': return a.value !== undefined;
    case 'fill_blank': case 'equation': { const n = q.prompt.split('___').length - 1; const v = (a.values as string[]) ?? []; return v.length >= n && v.slice(0, n).every((x) => x?.trim()); }
    case 'matching': return ((a.pairs as unknown[]) ?? []).length === (o.left ?? []).length;
    case 'classification': return Object.keys((a.map as object) ?? {}).length === (o.items ?? []).length;
    default: return Boolean((a.text as string)?.trim());
  }
}

function showCorrect(q: QuizQuestion, key: Record<string, unknown>): string {
  const o = (q.options ?? {}) as Opt;
  if (q.kind === 'mcq') return (q.options as string[])[key.value as number];
  if (q.kind === 'true_false') return key.value ? 'صواب' : 'خطأ';
  if (q.kind === 'fill_blank' || q.kind === 'equation') return (key.values as string[][]).map((v) => v[0]).join(' ، ');
  if (q.kind === 'matching') return (key.pairs as [number, number][]).map(([l, r]) => `${o.left![l]} ← ${o.right![r]}`).join(' | ');
  if (q.kind === 'classification') return Object.entries(key.map as Record<string, number>).map(([i, c]) => `${o.items![Number(i)]}: ${o.categories![c]}`).join(' | ');
  return String(key.model_answer ?? '');
}

export function QuizRunner({ quiz, onExit }: { quiz: Quiz; onExit: () => void }) {
  const toast = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<string | null>(null);
  const [order, setOrder] = useState<QuizQuestion[]>([]);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<Ans>({});
  const [res, setRes] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);
  const [score, setScore] = useState<FinishResult | null>(null);
  const [isRetry, setIsRetry] = useState(false);

  const begin = async (ids?: string[]) => {
    setBusy(true); setError(null);
    try {
      const all = questions ?? await getQuestions(quiz.id); setQuestions(all);
      const subset = ids ? all.filter((q) => ids.includes(q.id)) : all;
      const id = await startAttempt(quiz.id, ids);
      setAttempt(id); setOrder(shuffle(subset)); setI(0); setAns({}); setRes(null); setWrong([]); setScore(null); setIsRetry(Boolean(ids));
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  useEffect(() => { begin(); /* eslint-disable-next-line */ }, [quiz.id]);

  const q = order[i];
  const submit = async () => {
    if (!attempt || !q) return; setBusy(true);
    try {
      const r = await answerQuestion(attempt, q.id, ans); setRes(r);
      if (!r.is_correct) setWrong((w) => [...w, q.id]);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const next = async () => {
    if (i < order.length - 1) { setI(i + 1); setAns({}); setRes(null); return; }
    setBusy(true);
    try { setScore(await finishAttempt(attempt!)); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  if (error) return <ErrorBox message={error} onRetry={() => begin()} />;
  if (!attempt || (!q && !score)) return <Spinner label="جارٍ تجهيز الاختبار…" />;

  if (score) {
    const good = score.percent >= 60;
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <p className="text-6xl">{good ? '🎉' : '💪'}</p>
        <h2 className="mt-2 text-3xl font-extrabold text-navy-900">{good ? 'أحسنت!' : 'استمر في المحاولة'}</h2>
        <p className="mt-3 text-5xl font-extrabold text-royal-600">{score.percent}%</p>
        <p className="mt-1 text-slate-600">{score.score} من {score.max_score} نقطة{isRetry && ' (محاولة إعادة الأسئلة الخاطئة)'}</p>
        <p className="mt-2 text-sm text-slate-500">حُفظت نتيجتك في حسابك.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {wrong.length > 0 && <Button variant="cyan" onClick={() => begin(wrong)}>إعادة الأسئلة الخاطئة ({wrong.length})</Button>}
          <Button variant="secondary" onClick={() => begin()}>اختبار جديد كامل</Button>
          <Button onClick={onExit}>العودة</Button>
        </div>
      </Card>
    );
  }

  const ready = isReady(q, ans);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between text-sm font-bold text-navy-800">
        <span>السؤال {i + 1} من {order.length}</span><Badge>{kindLabel[q.kind] ?? q.kind}</Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-soft-200"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${((i + (res ? 1 : 0)) / order.length) * 100}%` }} /></div>
      <Card>
        {q.kind !== 'fill_blank' && q.kind !== 'equation' && <h2 className="mb-4 text-xl font-extrabold leading-9 text-navy-900">{q.prompt}</h2>}
        {(q.kind === 'fill_blank' || q.kind === 'equation') && <p className="mb-3 text-sm font-bold text-slate-500">املأ الفراغات:</p>}
        <QuestionInput q={q} value={ans} onChange={setAns} disabled={Boolean(res)} />
        {!res && <div className="mt-5"><Button disabled={!ready} loading={busy} onClick={submit}>تحقّق من الإجابة</Button>
          {!ready && <span className="ms-3 text-sm text-slate-500">أجب أولاً لتظهر الإجابة الصحيحة والشرح.</span>}</div>}
        {res && (
          <div className={cx('mt-5 rounded-2xl p-4', res.is_correct ? 'bg-emerald-50' : res.fraction > 0 ? 'bg-amber-50' : 'bg-red-50')} aria-live="polite">
            <p className="flex items-center gap-2 text-lg font-extrabold">
              {res.is_correct ? <><CheckCircle2 className="text-emerald-600" />إجابة صحيحة</> : res.fraction > 0 ? <><MinusCircle className="text-amber-600" />إجابة جزئية</> : <><XCircle className="text-red-600" />إجابة غير صحيحة</>}
              <span className="ms-auto text-sm font-bold text-slate-600">{res.awarded} / {res.points}</span>
            </p>
            {!res.is_correct && <p className="mt-2"><strong>الإجابة الصحيحة: </strong>{showCorrect(q, res.correct_answer)}</p>}
            {res.explanation && <p className="mt-2 leading-8"><strong>الشرح: </strong>{res.explanation}</p>}
            {!['mcq', 'true_false', 'fill_blank', 'equation', 'matching', 'classification'].includes(q.kind) && <p className="mt-2 text-xs text-slate-500">تُصحَّح الأسئلة المفتوحة آلياً بالكلمات المفتاحية؛ قارن إجابتك بالنموذج.</p>}
            <div className="mt-4"><Button onClick={next} loading={busy}>{i < order.length - 1 ? 'السؤال التالي' : 'إنهاء وعرض النتيجة'}</Button></div>
          </div>)}
      </Card>
    </div>
  );
}
