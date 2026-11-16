import { Link } from 'react-router-dom';
import { AlertCircle, BookOpen, FlaskConical, Info, Lightbulb, Play, Sparkles, Target } from 'lucide-react';
import type { Block } from '../../types/content';
import { Card } from '../../components/ui';
import { cx } from '../../lib/format';
import { Exercise } from './Exercise';
import { Figure } from './figures';
import { ConceptMap } from '../conceptmaps/ConceptMap';
import { simulations } from '../simulations/data';

export function Equation({ left, enzyme, right, note, big }: { left: string; enzyme?: string; right: string; note?: string; big?: boolean }) {
  // dir=rtl: الطرف الأول (المتفاعلات) يمين، والسهم يشير لليسار نحو النواتج
  return (
    <div className={cx('my-2 rounded-2xl border border-cyan-200 bg-gradient-to-l from-cyan-50 to-blue-50 p-4', big && 'p-8')}>
      <div className={cx('flex flex-wrap items-center justify-center gap-3 font-extrabold text-navy-900', big ? 'text-3xl' : 'text-lg')} dir="rtl">
        <span>{left}</span>
        <span className="flex flex-col items-center text-royal-600">
          {enzyme && <span className={cx('rounded-full bg-royal-600 px-3 py-0.5 font-bold text-white', big ? 'text-xl' : 'text-sm')}>{enzyme}</span>}
          <span aria-hidden className="leading-none">⟵</span>
        </span>
        <span>{right}</span>
      </div>
      {note && <p className="mt-2 text-center text-sm text-slate-600">{note}</p>}
    </div>
  );
}

const tones = {
  info: { c: 'border-blue-200 bg-blue-50', i: <Info className="text-blue-600" />, t: 'للمعلومة' },
  tip: { c: 'border-emerald-200 bg-emerald-50', i: <Lightbulb className="text-emerald-600" />, t: 'تذكّر' },
  warn: { c: 'border-amber-300 bg-amber-50', i: <AlertCircle className="text-amber-600" />, t: 'انتبه' },
  extra: { c: 'border-violet-200 bg-violet-50', i: <Sparkles className="text-violet-600" />, t: 'إضافة' },
} as const;

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return <div className="space-y-5">{blocks.map((b, i) => <One key={i} b={b} />)}</div>;
}

function One({ b }: { b: Block }) {
  switch (b.type) {
    case 'p': return <p className="text-lg leading-9 text-slate-800">{b.text}</p>;
    case 'h': return <h3 className="border-r-4 border-cyan-500 pr-3 text-xl font-extrabold text-navy-800">{b.text}</h3>;
    case 'list': {
      const L = b.ordered ? 'ol' : 'ul';
      return <L className={cx('space-y-2 ps-6 text-lg leading-8 text-slate-800', b.ordered ? 'list-decimal' : 'list-disc')}>{b.items.map((x) => <li key={x}>{x}</li>)}</L>;
    }
    case 'objectives':
      return (
        <Card className="border-royal-500/30 bg-royal-500/5">
          <h3 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-navy-900"><Target className="text-royal-600" />أهداف التعلّم</h3>
          <ul className="space-y-2 text-lg">{b.items.map((x) => <li key={x} className="flex gap-2"><span className="text-cyan-600">◆</span>{x}</li>)}</ul>
        </Card>
      );
    case 'definition':
      return (
        <div className="rounded-2xl border-s-4 border-royal-600 bg-white p-4 shadow-card">
          <p className="mb-1 flex items-center gap-2 text-sm font-bold text-royal-600"><BookOpen size={16} />مصطلح علمي</p>
          <p className="text-lg leading-8"><strong className="text-navy-900">{b.term}: </strong>{b.text}</p>
        </div>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-2xl border border-soft-200 bg-white">
          {b.caption && <p className="bg-soft-100 px-4 py-2 text-sm font-bold text-navy-800">{b.caption}</p>}
          <table className="w-full min-w-[28rem] text-start">
            <thead className="bg-navy-800 text-white"><tr>{b.headers.map((h) => <th key={h} className="px-4 py-3 text-start font-bold">{h}</th>)}</tr></thead>
            <tbody>{b.rows.map((r, i) => <tr key={i} className="border-t border-soft-200 even:bg-soft-50">{r.map((c, j) => <td key={j} className={cx('px-4 py-3', j === 0 && 'font-bold text-navy-800')}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case 'callout': {
      const t = tones[b.tone];
      return (
        <div className={cx('flex gap-3 rounded-2xl border p-4', t.c)}>
          <div className="mt-1 shrink-0">{t.i}</div>
          <div><p className="font-extrabold text-navy-900">{b.title ?? t.t}</p><p className="leading-8 text-slate-800">{b.text}</p></div>
        </div>
      );
    }
    case 'equation': return <Equation {...b} />;
    case 'experiment':
      return (
        <Card className="border-amber-200 bg-amber-50/50">
          <h3 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-navy-900"><FlaskConical className="text-amber-600" />{b.title}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div><p className="mb-1 font-bold text-navy-800">ماذا يلزمك؟</p><ul className="list-disc space-y-1 ps-6">{b.materials.map((m) => <li key={m}>{m}</li>)}</ul></div>
            <div><p className="mb-1 font-bold text-navy-800">خطوات العمل</p><ol className="list-decimal space-y-1 ps-6">{b.steps.map((s) => <li key={s}>{s}</li>)}</ol></div>
          </div>
          <details className="mt-4 rounded-xl bg-white p-3"><summary className="cursor-pointer font-bold text-royal-600">ماذا نلاحظ؟ وماذا نستنتج؟ (اضغط بعد أن تجرّب أو تتوقع)</summary>
            <p className="mt-2"><strong>الملاحظة: </strong>{b.observe}</p><p className="mt-2"><strong>الاستنتاج: </strong>{b.conclude}</p></details>
        </Card>
      );
    case 'figure': return <figure className="rounded-2xl bg-white p-4 shadow-card"><Figure id={b.id} /><figcaption className="mt-3 text-center text-sm text-slate-600">{b.caption}</figcaption></figure>;
    case 'conceptmap': return <ConceptMap mapId={b.id} />;
    case 'sim': {
      const exists = simulations.some((s) => s.id === b.id);
      return exists ? (
        <Link to={`/simulations/${b.id}`} className="flex items-center gap-3 rounded-2xl bg-gradient-to-l from-royal-600 to-cyan-500 p-4 font-bold text-white shadow-card hover:brightness-110">
          <Play /> {b.label}</Link>) : null;
    }
    case 'exercise': return <Exercise block={b} />;
    default: return null;
  }
}
