import { NavLink, Outlet } from 'react-router-dom';
import { cx } from '../lib/format';

const items = [
  ['/admin', 'نظرة عامة', true], ['/admin/students', 'الطلاب'], ['/admin/content', 'الوحدات والدروس'], ['/admin/assignments', 'الواجبات'],
  ['/admin/quizzes', 'الاختبارات'], ['/admin/settings', 'الإعدادات والإعلانات'], ['/admin/audit', 'سجلّ التدقيق'],
] as const;
export default function AdminLayout() {
  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
      <nav aria-label="إدارة المنصة" className="flex gap-2 overflow-x-auto lg:sticky lg:top-24 lg:flex-col lg:self-start">
        {items.map(([to, label, end]) => <NavLink key={to} to={to} end={Boolean(end)} className={({ isActive }) => cx('whitespace-nowrap rounded-xl px-4 py-2.5 font-bold', isActive ? 'bg-royal-600 text-white' : 'bg-white text-navy-800 hover:bg-soft-100')}>{label}</NavLink>)}
      </nav>
      <div className="min-w-0"><Outlet /></div>
    </div>
  );
}
