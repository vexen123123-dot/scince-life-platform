import { Link } from 'react-router-dom';
export default function NotFound() {
  return <div className="py-20 text-center"><p className="text-6xl">🔬</p><h1 className="mt-4 text-3xl font-extrabold text-navy-900">الصفحة غير موجودة</h1>
    <Link to="/" className="mt-6 inline-block font-bold text-royal-600 underline">العودة إلى الرئيسية</Link></div>;
}
