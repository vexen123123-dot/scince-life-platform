import { useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, Search } from 'lucide-react';
import { cx } from '../lib/format';

export function Button({ variant = 'primary', size = 'md', className, loading, children, ...p }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'cyan'; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  const v = {
    primary: 'bg-royal-600 text-white hover:bg-royal-700',
    secondary: 'bg-white text-navy-800 border border-soft-200 hover:bg-soft-100',
    ghost: 'text-navy-800 hover:bg-soft-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    cyan: 'bg-cyan-500 text-navy-950 hover:bg-cyan-400',
  }[variant];
  const s = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-base', lg: 'px-7 py-3.5 text-lg' }[size];
  return (
    <button {...p} disabled={p.disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-xl font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-50', v, s, className)}>
      {loading && <Loader2 className="animate-spin" size={18} />}{children}
    </button>
  );
}

export const Card = ({ className, children }: { className?: string; children: ReactNode }) =>
  <div className={cx('rounded-2xl border border-soft-200 bg-white p-5 shadow-card', className)}>{children}</div>;

export const Spinner = ({ label = 'جارٍ التحميل…' }: { label?: string }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-navy-700" role="status">
    <Loader2 className="animate-spin" /> <span>{label}</span>
  </div>
);

export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-800" role="alert">
    <AlertTriangle /> <p>{message}</p>
    {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>إعادة المحاولة</Button>}
  </div>
);

export const Empty = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-soft-200 bg-soft-50 p-10 text-center text-navy-700">
    <Inbox className="text-cyan-600" size={36} /><p className="text-lg font-bold">{title}</p>
    {hint && <p className="max-w-md text-sm text-slate-600">{hint}</p>}{action}
  </div>
);

export const Badge = ({ tone = 'blue', children }: { tone?: 'blue' | 'green' | 'amber' | 'red' | 'gray'; children: ReactNode }) => {
  const t = { blue: 'bg-blue-100 text-blue-800', green: 'bg-emerald-100 text-emerald-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800', gray: 'bg-slate-100 text-slate-700' }[tone];
  return <span className={cx('inline-block rounded-full px-3 py-1 text-xs font-bold', t)}>{children}</span>;
};

export const statusTone = (s: string) =>
  (({ graded: 'green', submitted: 'blue', returned: 'amber', draft: 'gray', published: 'green' }) as const)[s as 'graded'] ?? 'gray';

export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <label className="block space-y-1.5">
    <span className="text-sm font-bold text-navy-800">{label}</span>{children}
    {hint && <span className="block text-xs text-slate-500">{hint}</span>}
  </label>
);
export const inputCls = 'w-full rounded-xl border border-soft-200 bg-white px-4 py-2.5 text-base text-navy-900 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-400/25';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}</div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export const Banner = ({ tone = 'amber', children }: { tone?: 'amber' | 'blue'; children: ReactNode }) => (
  <div className={cx('mb-6 rounded-xl border p-4 text-sm leading-7', tone === 'amber' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900')}>{children}</div>
);

export const BackLink = ({ to, children }: { to: string; children: ReactNode }) =>
  <Link to={to} className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-royal-600 hover:underline"><ChevronRight size={16} />{children}</Link>;

/** جدول عام: بحث + ترتيب + ترقيم صفحات (من جهة العميل) */
export interface Column<T> { key: string; header: string; render?: (r: T) => ReactNode; sortValue?: (r: T) => string | number; searchValue?: (r: T) => string }
export function DataTable<T extends { id?: string | number }>({ rows, columns, pageSize = 10, searchable = true, filters, empty = 'لا توجد بيانات' }:
  { rows: T[]; columns: Column<T>[]; pageSize?: number; searchable?: boolean; filters?: ReactNode; empty?: string }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const view = useMemo(() => {
    let r = rows;
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      r = r.filter((row) => columns.some((c) => (c.searchValue ? c.searchValue(row) : String((row as Record<string, unknown>)[c.key] ?? '')).toLowerCase().includes(n)));
    }
    if (sort) {
      const c = columns.find((x) => x.key === sort.key);
      r = [...r].sort((a, b) => {
        const va = c?.sortValue ? c.sortValue(a) : String((a as Record<string, unknown>)[sort.key] ?? '');
        const vb = c?.sortValue ? c.sortValue(b) : String((b as Record<string, unknown>)[sort.key] ?? '');
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
      });
    }
    return r;
  }, [rows, q, sort, columns]);
  const pages = Math.max(1, Math.ceil(view.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const slice = view.slice(cur * pageSize, cur * pageSize + pageSize);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {searchable && (
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className={cx(inputCls, 'ps-10')} placeholder="بحث…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} aria-label="بحث" />
          </div>
        )}
        {filters}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-soft-200 bg-white">
        <table className="w-full min-w-[40rem] text-start text-sm">
          <thead className="bg-soft-100 text-navy-800">
            <tr>{columns.map((c) => (
              <th key={c.key} className="px-4 py-3 text-start font-bold">
                <button className="inline-flex items-center gap-1 hover:text-royal-600" onClick={() => setSort((s) => s?.key === c.key ? { key: c.key, dir: (s.dir * -1) as 1 | -1 } : { key: c.key, dir: 1 })}>
                  {c.header}{sort?.key === c.key && (sort.dir === 1 ? ' ▲' : ' ▼')}
                </button>
              </th>))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">{empty}</td></tr>}
            {slice.map((r, i) => (
              <tr key={String(r.id ?? i)} className="border-t border-soft-200 hover:bg-soft-50">
                {columns.map((c) => <td key={c.key} className="px-4 py-3 align-middle">{c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '—')}</td>)}
              </tr>))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{view.length} نتيجة</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="السابق"><ChevronRight size={16} /></Button>
          <span>{cur + 1} / {pages}</span>
          <Button variant="secondary" size="sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="التالي"><ChevronLeft size={16} /></Button>
        </div>
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={cx('max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl', wide ? 'max-w-3xl' : 'max-w-lg')} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold text-navy-900">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="إغلاق">✕</Button></div>
        {children}
      </div>
    </div>
  );
}
