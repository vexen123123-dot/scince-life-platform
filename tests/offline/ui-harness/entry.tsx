import { createRoot } from 'react-dom/client';
import { simulations } from '/home/claude/science-life/src/features/simulations/data';
import { SimPlayer } from '/home/claude/science-life/src/features/simulations/SimPlayer';
import { BlockRenderer } from '/home/claude/science-life/src/features/lessons/BlockRenderer';
import { lessons } from '/home/claude/science-life/src/content/curriculum';
import { ConceptMap } from '/home/claude/science-life/src/features/conceptmaps/ConceptMap';
import { Card } from '/home/claude/science-life/src/components/ui';

const App = () => (
  <div dir="rtl">
    {simulations.map((s) => <section key={s.id} data-sim={s.id}><SimPlayer sim={s} /></section>)}
    {lessons.map((l) => l.sections.map((sec) => <section key={l.slug + sec.slug} data-sec={l.slug + '/' + sec.slug}><BlockRenderer blocks={sec.blocks} /></section>))}
  </div>
);
createRoot(document.getElementById('root')!).render(<App />);
