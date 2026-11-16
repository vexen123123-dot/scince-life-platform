import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, EyeOff, Eye, Maximize, Minimize, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui';
import { cx } from '../../lib/format';
import { Equation } from '../lessons/BlockRenderer';
import type { Simulation } from './data';
import { Scene } from './scenes';

type Status = 'idle' | 'playing' | 'paused' | 'done';

export function SimPlayer({ sim }: { sim: Simulation }) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [pres, setPres] = useState(false);
  const [hideControls, setHideControls] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const last = useRef(0);
  const n = sim.steps.length;
  const step = sim.steps[index];

  useEffect(() => { setIndex(0); setElapsed(0); setStatus('idle'); }, [sim.id]);

  // حلقة الحركة: لا تعمل إلا عند التشغيل
  useEffect(() => {
    if (status !== 'playing') return;
    let raf = 0;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = now - last.current; last.current = now;
      setElapsed((e) => e + dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  useEffect(() => {
    if (status === 'playing' && elapsed >= step.ms) {
      if (index < n - 1) { setIndex(index + 1); setElapsed(0); } else { setElapsed(step.ms); setStatus('done'); }
    }
  }, [elapsed, status, index, n, step.ms]);

  const start = () => { setIndex(0); setElapsed(0); setStatus('playing'); };
  const pause = () => setStatus('paused');
  const resume = () => setStatus(status === 'done' ? 'playing' : 'playing');
  const restart = () => { setIndex(0); setElapsed(0); setStatus('playing'); };
  const goto = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(n - 1, i))); setElapsed(0);
    setStatus((s) => (s === 'playing' ? 'playing' : 'paused'));
  }, [n]);

  const toggleFs = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await box.current?.requestFullscreen();
    } catch { setPres((p) => !p); } // المتصفح لا يدعم ملء الشاشة: نكتفي بالعرض الكبير
  }, []);
  useEffect(() => {
    const onFs = () => setPres(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); status === 'playing' ? pause() : status === 'idle' ? start() : resume(); }
      else if (e.key === 'ArrowLeft') goto(index + 1);   // اتجاه RTL: اليسار = التالي
      else if (e.key === 'ArrowRight') goto(index - 1);
      else if (e.key.toLowerCase() === 'f') toggleFs();
      else if (e.key.toLowerCase() === 'h') setHideControls((h) => !h);
      else if (e.key === 'Home') restart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const t = Math.min(1, elapsed / step.ms);
  const big = pres;
  return (
    <div ref={box} className={cx('flex flex-col gap-4 rounded-3xl', big ? 'h-screen overflow-hidden bg-navy-950 p-6 text-white' : 'bg-white p-4 shadow-card sm:p-6')}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={cx('font-extrabold', big ? 'text-4xl' : 'text-xl sm:text-2xl')}>{sim.title}</h2>
        <span className={cx('rounded-full px-4 py-1 font-bold', big ? 'bg-cyan-500 text-navy-950 text-xl' : 'bg-cyan-100 text-navy-800 text-sm')}>
          المرحلة {index + 1} من {n}
        </span>
      </div>

      <div className={cx('grid min-h-0 flex-1 gap-4', big ? 'lg:grid-cols-[3fr_2fr]' : 'lg:grid-cols-2')}>
        <div className={cx('min-h-72 overflow-hidden rounded-2xl bg-white p-2', big ? 'h-full' : 'aspect-[600/340] lg:aspect-auto lg:min-h-96')}>
          <Scene kind={sim.scene} index={index} t={t} steps={sim.steps} />
        </div>
        <div className={cx('flex flex-col justify-center gap-4 overflow-y-auto rounded-2xl p-5', big ? 'bg-navy-900' : 'bg-soft-50')} aria-live="polite">
          <h3 className={cx('font-extrabold', big ? 'text-5xl text-cyan-300' : 'text-2xl text-royal-600')}>{step.title}</h3>
          <p className={cx('font-medium', big ? 'text-3xl leading-[1.9]' : 'text-lg leading-9 text-slate-800')}>{step.text}</p>
          {step.equation && <Equation {...step.equation} big={big} />}
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200/60" aria-hidden>
        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${((index + t) / n) * 100}%` }} />
      </div>

      <div className={cx('flex flex-wrap items-center justify-center gap-2', hideControls && big && 'opacity-0 transition-opacity hover:opacity-100')}>
        {status === 'idle' && <Button variant="cyan" size={big ? 'lg' : 'md'} onClick={start}><Play size={20} />ابدأ</Button>}
        {status === 'playing' && <Button variant="secondary" size={big ? 'lg' : 'md'} onClick={pause}><Pause size={20} />إيقاف مؤقت</Button>}
        {(status === 'paused' || status === 'done') && <Button variant="cyan" size={big ? 'lg' : 'md'} onClick={status === 'done' ? restart : resume}><Play size={20} />{status === 'done' ? 'أعد التشغيل' : 'استئناف'}</Button>}
        <Button variant="secondary" size={big ? 'lg' : 'md'} onClick={restart} disabled={status === 'idle'}><RotateCcw size={20} />إعادة من البداية</Button>
        <Button variant="secondary" size={big ? 'lg' : 'md'} onClick={() => goto(index - 1)} disabled={index === 0} aria-label="المرحلة السابقة"><ChevronRight size={20} />السابق</Button>
        <Button variant="secondary" size={big ? 'lg' : 'md'} onClick={() => goto(index + 1)} disabled={index === n - 1} aria-label="المرحلة التالية">التالي<ChevronLeft size={20} /></Button>
        <Button variant="primary" size={big ? 'lg' : 'md'} onClick={toggleFs}>{pres ? <Minimize size={20} /> : <Maximize size={20} />}{pres ? 'إنهاء وضع العرض' : 'وضع العرض الصفّي'}</Button>
        {big && <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setHideControls((h) => !h)}>{hideControls ? <Eye size={20} /> : <EyeOff size={20} />}{hideControls ? 'إظهار' : 'إخفاء'} الأزرار (H)</Button>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {sim.steps.map((s, i) => (
          <button key={s.title} onClick={() => goto(i)} aria-label={`الانتقال إلى ${s.title}`} aria-current={i === index}
            className={cx('h-3 rounded-full transition-all', i === index ? 'w-10 bg-cyan-500' : 'w-3 bg-slate-300 hover:bg-slate-400')} />))}
      </div>
      {!big && <p className="text-center text-xs text-slate-500">اختصارات لوحة المفاتيح: المسافة = تشغيل/إيقاف، ← → = التنقل بين المراحل، F = ملء الشاشة، H = إخفاء الأزرار.</p>}
    </div>
  );
}
