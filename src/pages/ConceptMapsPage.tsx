import { PageHeader } from '../components/ui';
import { ConceptMap } from '../features/conceptmaps/ConceptMap';
import { conceptMaps } from '../content/conceptMaps';
export default function ConceptMapsPage() {
  return <><PageHeader title="خرائط المفاهيم التفاعلية" subtitle="اضغط على أي مفهوم لتظهر معلوماته والمفاهيم المرتبطة به." />
    <div className="space-y-8">{conceptMaps.map((m) => <ConceptMap key={m.id} mapId={m.id} />)}</div></>;
}
