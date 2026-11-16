import { Suspense, lazy } from 'react';
import { PageHeader, Spinner } from '../components/ui';
const Lab3D = lazy(() => import('../features/lab3d/Lab3D'));
export default function LabPage() {
  return <><PageHeader title="المعمل ثلاثي الأبعاد: الجهاز الهضمي" subtitle="دوّر النموذج، كبّره، واضغط على أي عضو لتعرف وظيفته." />
    <Suspense fallback={<Spinner label="جارٍ تحميل المشهد ثلاثي الأبعاد…" />}><Lab3D /></Suspense></>;
}
