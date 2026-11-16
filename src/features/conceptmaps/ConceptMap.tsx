import { useMemo, useState } from 'react';
import { getConceptMap } from '../../content/conceptMaps';
import { cx } from '../../lib/format';
import type { ConceptMapData } from '../../types/content';

const palette = ['bg-navy-800 text-white', 'bg-royal-600 text-white', 'bg-cyan-500 text-navy-950', 'bg-sky-100 text-navy-900', 'bg-soft-100 text-navy-900'];

function Tree({ map, id, depth, sel, setSel }: { map: ConceptMapData; id: string; depth: number; sel: string; setSel: (s: string) => void }) {
  const node = map.nodes.find((n) => n.id === id);
  if (!node) return null;
  return (
    <li className="flex flex-col items-center">
      <button onClick={() => setSel(node.id)} aria-pressed={sel === node.id}
        className={cx('max-w-44 rounded-2xl px-4 py-2 text-center text-sm font-extrabold shadow-card transition hover:scale-105 sm:text-base', palette[Math.min(depth, palette.length - 1)], sel === node.id && 'ring-4 ring-amber-400')}>
        {node.label}
      </button>
      {node.children && node.children.length > 0 && (
        <>
          <span className="h-4 w-0.5 bg-slate-300" aria-hidden />
          <ul className="relative flex flex-wrap justify-center gap-x-3 gap-y-5 border-t-2 border-slate-300 pt-4">
            {node.children.map((c) => <Tree key={c} map={map} id={c} depth={depth + 1} sel={sel} setSel={setSel} />)}
          </ul>
        </>
      )}
    </li>
  );
}

export function ConceptMap({ mapId, large }: { mapId: string; large?: boolean }) {
  const map = useMemo(() => getConceptMap(mapId), [mapId]);
  const [sel, setSel] = useState<string>(map?.root ?? '');
  if (!map) return null;
  const node = map.nodes.find((n) => n.id === sel) ?? map.nodes[0];
  const related = map.nodes.filter((n) => node.children?.includes(n.id) || n.children?.includes(node.id));
  return (
    <section className="rounded-2xl border border-soft-200 bg-white p-4 shadow-card" aria-label={`خريطة مفاهيمية: ${map.title}`}>
      <h3 className="mb-3 text-lg font-extrabold text-navy-900">🗺️ خريطة مفاهيمية: {map.title} <span className="text-sm font-normal text-slate-500">(اضغط على أي مفهوم)</span></h3>
      <div className="overflow-x-auto pb-2"><ul className={cx('mx-auto flex w-max min-w-full justify-center', large && 'scale-110')}><Tree map={map} id={map.root} depth={0} sel={node.id} setSel={setSel} /></ul></div>
      <div className="mt-4 rounded-xl border-s-4 border-cyan-500 bg-cyan-50 p-4" aria-live="polite">
        <p className="text-lg font-extrabold text-navy-900">{node.label}</p>
        <p className="mt-1 leading-8 text-slate-800">{node.detail}</p>
        {related.length > 0 && <p className="mt-2 text-sm text-slate-600">مفاهيم مرتبطة: {related.map((r) => (
          <button key={r.id} className="me-2 font-bold text-royal-600 underline" onClick={() => setSel(r.id)}>{r.label}</button>))}</p>}
      </div>
    </section>
  );
}
