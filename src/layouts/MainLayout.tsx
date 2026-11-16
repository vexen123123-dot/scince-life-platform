import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Menu, X } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { cx } from '../lib/format';

const links = [
  { to: '/', label: 'الرئيسية', end: true },
  { to: '/lessons', label: 'الدروس' },
  { to: '/lab', label: 'المعمل ثلاثي الأبعاد' },
  { to: '/simulations', label: 'المحاكاة' },
  { to: '/concept-maps', label: 'خرائط المفاهيم' },
  { to: '/quizzes', label: 'الاختبارات' },
  { to: '/homework', label: 'الواجبات' },
];

export default function MainLayout() {
  const { profile, isAdmin, signOut, session } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const item = ({ isActive }: { isActive: boolean }) => cx('rounded-lg px-3 py-2 text-sm font-bold transition', isActive ? 'bg-cyan-400 text-navy-950' : 'text-white/90 hover:bg-white/10');
  return (
    <div className="flex min-h-screen flex-col bg-soft-50">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">تخطّي إلى المحتوى</a>
      <header className="sticky top-0 z-40 bg-gradient-to-l from-navy-900 to-navy-800 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-3 text-white"><Logo /><span className="text-lg font-extrabold sm:text-xl">منصة العلوم والحياة</span></Link>
          <nav className="hidden items-center gap-1 xl:flex" aria-label="التنقل الرئيسي">{links.map((l) => <NavLink key={l.to} {...l} className={item}>{l.label}</NavLink>)}</nav>
          <div className="hidden items-center gap-2 xl:flex">
            {session && profile ? (
              <>
                <NavLink to={isAdmin ? '/admin' : '/dashboard'} className={item}>{isAdmin ? 'لوحة الإدارة' : 'لوحتي'}</NavLink>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={async () => { await signOut(); nav('/'); }}><LogOut size={16} />خروج</Button>
              </>
            ) : <Button variant="cyan" size="sm" onClick={() => nav('/login')}><LogIn size={16} />دخول</Button>}
          </div>
          <button className="rounded-lg p-2 text-white xl:hidden" aria-label="القائمة" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
        {open && (
          <nav className="flex flex-col gap-1 border-t border-white/10 px-4 pb-4 xl:hidden" aria-label="القائمة">
            {links.map((l) => <NavLink key={l.to} {...l} className={item} onClick={() => setOpen(false)}>{l.label}</NavLink>)}
            {session && profile
              ? <><NavLink to={isAdmin ? '/admin' : '/dashboard'} className={item} onClick={() => setOpen(false)}>{isAdmin ? 'لوحة الإدارة' : 'لوحتي'}</NavLink>
                <button className="rounded-lg px-3 py-2 text-start text-sm font-bold text-white/90" onClick={async () => { await signOut(); setOpen(false); nav('/'); }}>تسجيل الخروج</button></>
              : <NavLink to="/login" className={item} onClick={() => setOpen(false)}>تسجيل الدخول</NavLink>}
          </nav>)}
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8"><Outlet /></main>
      <footer className="bg-navy-950 py-8 text-center text-white/90">
        <p className="text-lg font-extrabold">منصة العلوم والحياة</p>
        <p className="mt-1 text-sm text-white/70">الصف التاسع الأساسي — فلسطين — الفصل الدراسي الأول</p>
        <div className="mx-auto mt-4 max-w-md space-y-1 rounded-2xl border border-cyan-400/30 bg-white/5 p-4">
          <p>عمل الطالب المبدع: <strong className="text-cyan-300">سليمان بديع قديح</strong></p>
          <p>تحت إشراف المعلمة الفاضلة: <strong className="text-cyan-300">رولا طه</strong></p>
        </div>
        <p className="mt-4 text-xs text-white/50">المحتوى مبني على كتاب العلوم والحياة — وزارة التربية والتعليم الفلسطينية (ط 2020).</p>
      </footer>
    </div>
  );
}
