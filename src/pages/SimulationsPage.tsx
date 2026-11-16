import { Link, useParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import { BackLink, Card, ErrorBox, PageHeader } from '../components/ui';
import { getSim, simulations } from '../features/simulations/data';
import { SimPlayer } from '../features/simulations/SimPlayer';

export function SimulationsList() {
  return (
    <>
      <PageHeader title="المحاكاة العلمية التفاعلية" subtitle="شغّل، أوقف مؤقتاً، وتنقّل بين المراحل. وضع العرض الصفّي للمعلمة." />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {simulations.map((s, i) => (
          <Link key={s.id} to={`/simulations/${s.id}`} className="group">
            <Card className="h-full transition group-hover:-translate-y-1 group-hover:shadow-glow">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-royal-600 to-cyan-500 text-xl font-extrabold text-white">{i + 1}</div>
              <h2 className="text-lg font-extrabold text-navy-900">{s.title}</h2><p className="mt-1 text-slate-600">{s.summary}</p>
              <p className="mt-3 flex items-center gap-1 text-sm font-bold text-royal-600"><Play size={16} />{s.steps.length} مراحل</p></Card></Link>))}
      </div>
    </>
  );
}
export function SimulationPage() {
  const { id = '' } = useParams(); const sim = getSim(id);
  if (!sim) return <ErrorBox message="المحاكاة غير موجودة" />;
  return <><BackLink to="/simulations">كل المحاكاة</BackLink><SimPlayer sim={sim} /></>;
}
