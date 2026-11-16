import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { cx, shuffle } from '../../lib/format';
import type { ExerciseBlock } from '../../types/content';

// تمارين تكوينية داخل الدرس (للتدريب الفوري). الاختبارات المسجّلة تُصحَّح على الخادم.
export function Exercise({ block }: { block: ExerciseBlock }) {
  return (
    <Card className="border-cyan-200 bg-cyan-50/40">
      <p className="mb-3 text-lg font-extrabold text-navy-900">🎯 تمرين تفاعلي: {block.prompt}</p>
      {block.kind === 'classify' && <Classify b={block} />}
      {block.kind === 'match' && <Match b={block} />}
      {block.kind === 'truefalse' && <TrueFalse b={block} />}
      {block.kind === 'order' && <Order b={block} />}
    </Card>
  );
}

function Classify({ b }: { b: Extract<ExerciseBlock, { kind: 'classify' }> }) {
  const [ans, setAns] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const items = useMemo(() => shuffle(b.items.map((it, i) => ({ ...it, i }))), [b]);
  const score = items.filter((it) => ans[it.i] === it.category).length;
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.i} className="flex flex-wrap items-center gap-2">
          <span className="min-w-40 font-bold">{it.text}</span>
          {b.categories.map((c, ci) => (
            <button key={c} disabled={checked} onClick={() => setAns({ ...ans, [it.i]: ci })}
              className={cx('rounded-lg border px-3 py-1.5 text-sm font-bold', ans[it.i] === ci ? 'border-royal-600 bg-royal-600 text-white' : 'border-soft-200 bg-white hover:bg-soft-100')}>{c}</button>
          ))}
          {checked && (ans[it.i] === it.category ? <CheckCircle2 className="text-emerald-600" size={20} /> : <span className="flex items-center gap-1 text-sm text-red-700"><XCircle size={18} />الصحيح: {b.categories[it.category]}</span>)}
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={Object.keys(ans).length < items.length || checked} onClick={() => setChecked(true)}>تحقق</Button>
        {checked && <><strong>النتيجة: {score} / {items.length}</strong><Button size="sm" variant="secondary" onClick={() => { setAns({}); setChecked(false); }}>إعادة</Button></>}
      </div>
    </div>
  );
}

function Match({ b }: { b: Extract<ExerciseBlock, { kind: 'match' }> }) {
  const right = useMemo(() => shuffle(b.pairs.map((p, i) => ({ t: p[1], i }))), [b]);
  const [sel, setSel] = useState<number | null>(null);
  const [pairs, setPairs] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const usedRight = new Set(Object.values(pairs));
  const score = b.pairs.filter((_, i) => pairs[i] === i).length;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">{b.pairs.map((p, i) => (
        <button key={i} disabled={checked} onClick={() => setSel(i)}
          className={cx('w-full rounded-xl border px-3 py-2 text-start font-bold', sel === i ? 'border-royal-600 bg-royal-50' : 'border-soft-200 bg-white', pairs[i] !== undefined && 'opacity-70')}>
          {p[0]} {pairs[i] !== undefined && <span className="text-sm font-normal text-royal-700">← {b.pairs[pairs[i]][1]}</span>}
          {checked && (pairs[i] === i ? ' ✅' : ' ❌')}
        </button>))}
      </div>
      <div className="space-y-2">{right.map((r) => (
        <button key={r.i} disabled={checked || usedRight.has(r.i) || sel === null}
          onClick={() => { if (sel !== null) { setPairs({ ...pairs, [sel]: r.i }); setSel(null); } }}
          className="w-full rounded-xl border border-soft-200 bg-white px-3 py-2 text-start hover:bg-soft-100 disabled:opacity-40">{r.t}</button>))}
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button size="sm" disabled={Object.keys(pairs).length < b.pairs.length || checked} onClick={() => setChecked(true)}>تحقق</Button>
        <Button size="sm" variant="secondary" onClick={() => { setPairs({}); setChecked(false); setSel(null); }}>إعادة</Button>
        {checked && <strong>النتيجة: {score} / {b.pairs.length}</strong>}
      </div>
    </div>
  );
}

function TrueFalse({ b }: { b: Extract<ExerciseBlock, { kind: 'truefalse' }> }) {
  const [ans, setAns] = useState<Record<number, boolean>>({});
  return (
    <div className="space-y-3">
      {b.statements.map((s, i) => (
        <div key={i} className="rounded-xl bg-white p-3">
          <p className="mb-2 font-bold">{s.text}</p>
          <div className="flex gap-2">
            {[true, false].map((v) => (
              <button key={String(v)} disabled={ans[i] !== undefined} onClick={() => setAns({ ...ans, [i]: v })}
                className={cx('rounded-lg border px-4 py-1.5 font-bold', ans[i] === v ? (v === s.answer ? 'border-emerald-600 bg-emerald-100' : 'border-red-600 bg-red-100') : 'border-soft-200 hover:bg-soft-100')}>
                {v ? 'صواب' : 'خطأ'}</button>))}
          </div>
          {ans[i] !== undefined && <p className={cx('mt-2 text-sm', ans[i] === s.answer ? 'text-emerald-700' : 'text-red-700')}>{ans[i] === s.answer ? '✔ أحسنت. ' : '✘ الصحيح: ' + (s.answer ? 'صواب. ' : 'خطأ. ')}{s.why}</p>}
        </div>))}
    </div>
  );
}

function Order({ b }: { b: Extract<ExerciseBlock, { kind: 'order' }> }) {
  const pool = useMemo(() => shuffle(b.steps), [b]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const correct = chosen.every((c, i) => c === b.steps[i]) && chosen.length === b.steps.length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">{pool.filter((s) => !chosen.includes(s)).map((s) => (
        <button key={s} disabled={checked} onClick={() => setChosen([...chosen, s])} className="rounded-lg border border-soft-200 bg-white px-3 py-1.5 font-bold hover:bg-soft-100">{s}</button>))}</div>
      <ol className="list-decimal space-y-1 ps-6">{chosen.map((c, i) => <li key={c} className={cx(checked && (c === b.steps[i] ? 'text-emerald-700' : 'text-red-700'))}>{c}</li>)}</ol>
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={chosen.length < b.steps.length || checked} onClick={() => setChecked(true)}>تحقق</Button>
        <Button size="sm" variant="secondary" onClick={() => { setChosen([]); setChecked(false); }}>إعادة</Button>
        {checked && <strong className={correct ? 'text-emerald-700' : 'text-red-700'}>{correct ? 'ترتيب صحيح! 🎉' : 'الترتيب الصحيح: ' + b.steps.join(' ← ')}</strong>}
      </div>
    </div>
  );
}
