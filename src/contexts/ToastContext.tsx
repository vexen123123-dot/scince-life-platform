import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface Toast { id: number; kind: 'success' | 'error'; text: string }
const Ctx = createContext<{ success: (t: string) => void; error: (t: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  const api = { success: (t: string) => push('success', t), error: (t: string) => push('error', t) };
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 start-4 z-[100] flex w-[min(92vw,26rem)] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-start gap-3 rounded-xl p-4 text-white shadow-card ${t.kind === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 shrink-0" size={20} /> : <AlertTriangle className="mt-0.5 shrink-0" size={20} />}
            <p className="flex-1 text-sm leading-6">{t.text}</p>
            <button aria-label="إغلاق" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}><X size={16} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => { const v = useContext(Ctx); if (!v) throw new Error('ToastProvider missing'); return v; };
