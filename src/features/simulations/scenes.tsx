import { useRef, type ReactNode } from 'react';
import { DigestiveSvg, FOOD_TRACK } from '../lessons/figures';
import type { SceneKind, SimStep } from './data';

export interface SceneProps { kind: SceneKind; index: number; t: number; steps: SimStep[] }

const GLU = '#f59e0b', FRU = '#ec4899', GAL = '#22c55e', ENZ = '#2563eb';
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (x: number) => x * x * (3 - 2 * x);

const mv = (x: number, y: number, ms = 1200) => ({ transform: `translate(${x}px, ${y}px)`, transition: `transform ${ms}ms ease-in-out, opacity ${ms}ms` });

function Bead({ x, y, color, r = 17, bond, label, op = 1 }: { x: number; y: number; color: string; r?: number; bond?: number; label?: string; op?: number }) {
  return (
    <g style={{ ...mv(x, y), opacity: op }}>
      {bond !== undefined && <line x1={r - 2} y1={0} x2={bond - r + 2} y2={0} stroke="#475569" strokeWidth={5} strokeLinecap="round" />}
      <circle r={r} fill={color} stroke="#fff" strokeWidth={2.5} />
      {label && <text textAnchor="middle" y={5} fontSize="12" fontWeight="800" fill="#fff">{label}</text>}
    </g>
  );
}
function Enzyme({ x, y, label, show, scale = 1 }: { x: number; y: number; label: string; show: boolean; scale?: number }) {
  return (
    <g style={{ ...mv(x, y, 900), opacity: show ? 1 : 0 }}>
      <g transform={`scale(${scale})`}>
        <path d="M-34 0 A34 34 0 1 1 34 0 L10 0 L0 -12 L-10 0 Z" transform="translate(0,6)" fill={ENZ} />
        <text y={-34} textAnchor="middle" fontSize="15" fontWeight="800" fill={ENZ}>{label}</text>
        <text y={-12} textAnchor="middle" fontSize="20" fill="#fff">✂</text>
      </g>
    </g>
  );
}
const Frame = ({ children, title }: { children: ReactNode; title?: string }) => (
  <svg viewBox="0 0 600 340" className="h-full w-full" role="img" aria-label={title}>
    <rect width="600" height="340" rx="22" fill="#f0f9ff" />{children}
  </svg>
);
const Legend = ({ items }: { items: [string, string][] }) => (
  <g transform="translate(14,18)" fontSize="14" fontWeight="700" fill="#0a1a3f">
    {items.map(([c, l], i) => <g key={l} transform={`translate(${i * 120},0)`}><circle r="8" fill={c} /><text x="14" y="5">{l}</text></g>)}
  </g>
);

function Amylase({ index }: { index: number }) {
  const n = 8;
  return (
    <Frame title="عمل الأميليز">
      <Legend items={[[GLU, 'غلوكوز']]} />
      {Array.from({ length: n }).map((_, i) => {
        const g = Math.floor(i / 2);
        const split = index >= 2;
        const x = 70 + i * 62 + (split ? (g - 1.5) * 26 : 0);
        const y = split ? 190 + (g % 2 ? 14 : -14) : 190;
        const bonded = split ? i % 2 === 0 : i < n - 1;
        return <Bead key={i} x={x} y={y} color={GLU} bond={bonded ? 62 : undefined} />;
      })}
      <Enzyme x={index >= 2 ? 300 : 280} y={110} label="أميليز" show={index >= 1 && index < 3} />
      {index >= 1 && index < 3 && <text x="300" y="300" textAnchor="middle" fontSize="16" fill="#0369a1" fontWeight="700">+ ماء (H₂O)</text>}
      {index === 0 && <text x="300" y="280" textAnchor="middle" fontSize="20" fontWeight="800" fill="#0a1a3f">نشا (سلسلة طويلة من الغلوكوز)</text>}
      {index >= 3 && <text x="300" y="290" textAnchor="middle" fontSize="22" fontWeight="800" fill="#b45309">4 جزيئات مالتوز (غلوكوز + غلوكوز)</text>}
    </Frame>
  );
}

function Pepsin({ index }: { index: number }) {
  const cols = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#14b8a6', '#ec4899', '#6366f1', '#84cc16', '#f97316'];
  const grp = (i: number) => (i < 4 ? 0 : i < 7 ? 1 : 2);
  const split = index >= 2;
  return (
    <Frame title="عمل الببسين">
      <Legend items={[['#3b82f6', 'حمض أميني']]} />
      {cols.map((c, i) => {
        const x = 50 + i * 52 + (split ? (grp(i) - 1) * 36 : 0);
        const y = 190 + (split ? (grp(i) - 1) * 24 : Math.sin(i) * 14);
        const bonded = split ? grp(i) === grp(i + 1) : i < 9;
        return <Bead key={i} x={x} y={y} color={c} r={16} bond={bonded ? 52 : undefined} />;
      })}
      {index >= 1 && (
        <g fontWeight="800" fontSize="16" fill="#dc2626">
          {[[90, 90], [200, 70], [330, 95], [450, 70], [520, 105]].map(([x, y], i) => <text key={i} x={x} y={y + (index === 1 ? Math.sin(i) * 6 : 0)}>H⁺Cl⁻</text>)}
          <text x="300" y="38" textAnchor="middle" fontSize="18" fill="#b91c1c">وسط حمضي (حمض الهيدروكلوريك)</text>
        </g>
      )}
      <Enzyme x={290} y={125} label="ببسين" show={index === 2} />
      <text x="300" y="305" textAnchor="middle" fontSize="20" fontWeight="800" fill="#0a1a3f">{index < 2 ? 'بروتين (سلسلة حموض أمينية)' : 'عديدات ببتيد (سلاسل أقصر)'}</text>
    </Frame>
  );
}

function Carb({ index: s }: { index: number }) {
  const st = (a: [number, number][]) => a[Math.min(s, a.length - 1)];
  const beads: ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const k = Math.floor(i / 2), base = 40 + i * 38, off = (k - 1.5) * 12, side = i % 2 ? 12 : -12;
    const [x, y] = st([[base, 60], [base, 60], [base + off, 130], [base + off, 130], [base + off + side, 215], [base + off + side, 305]]);
    const bonded = s <= 1 ? i < 7 : s <= 3 ? i % 2 === 0 : false;
    beads.push(<Bead key={`s${i}`} x={x} y={y} color={GLU} r={14} bond={bonded ? 38 : undefined} />);
  }
  const pair = (key: string, c2: string, x0: number, x4: number) => [
    <Bead key={key + 'a'} x={st([[x0, 60], [x0, 60], [x0, 60], [x0, 60], [x4 - 30, 215], [x4 - 30, 305]])[0]} y={st([[x0, 60], [x0, 60], [x0, 60], [x0, 60], [x4 - 30, 215], [x4 - 30, 305]])[1]} color={GLU} r={14} bond={s <= 3 ? 32 : undefined} />,
    <Bead key={key + 'b'} x={st([[x0 + 32, 60], [x0 + 32, 60], [x0 + 32, 60], [x0 + 32, 60], [x4 + 30, 215], [x4 + 30, 305]])[0]} y={st([[x0 + 32, 60], [x0 + 32, 60], [x0 + 32, 60], [x0 + 32, 60], [x4 + 30, 215], [x4 + 30, 305]])[1]} color={c2} r={14} />,
  ];
  return (
    <Frame title="هضم الكربوهيدرات">
      <Legend items={[[GLU, 'غلوكوز'], [FRU, 'فركتوز'], [GAL, 'غالاكتوز']]} />
      <rect x="10" y="280" width="580" height="48" rx="12" fill="#fecaca" opacity={s >= 5 ? 1 : 0.35} style={{ transition: 'opacity 1s' }} />
      <text x="300" y="310" textAnchor="middle" fontWeight="800" fill="#991b1b" fontSize="16">الدم (الشعيرات الدموية)</text>
      {beads}{pair('suc', FRU, 450, 470)}{pair('lac', GAL, 520, 540)}
      <text x="150" y="42" fontSize="14" fontWeight="700" textAnchor="middle" fill="#0a1a3f">نشا</text>
      <text x="466" y="42" fontSize="14" fontWeight="700" textAnchor="middle" fill="#0a1a3f">سكروز</text>
      <text x="556" y="42" fontSize="14" fontWeight="700" textAnchor="middle" fill="#0a1a3f">لاكتوز</text>
      <Enzyme x={190} y={110} label="أميليز" show={s === 1} scale={0.8} />
      <Enzyme x={150} y={170} label="مالتيز" show={s === 3} scale={0.8} />
      <Enzyme x={430} y={140} label="سكريز" show={s === 3} scale={0.8} />
      <Enzyme x={540} y={140} label="لاكتيز" show={s === 3} scale={0.8} />
    </Frame>
  );
}

function Bile({ index: s }: { index: number }) {
  const drops = Array.from({ length: 16 }, (_, i) => [150 + (i % 8) * 42 + (Math.floor(i / 8) ? 20 : 0), 130 + Math.floor(i / 8) * 75 + (i % 3) * 8] as const);
  return (
    <Frame title="استحلاب الدهون">
      <rect x="40" y="70" width="520" height="220" rx="18" fill="#bae6fd" />
      <text x="300" y="58" textAnchor="middle" fontWeight="800" fill="#0369a1" fontSize="16">كيموس (ماء)</text>
      <ellipse cx="300" cy="180" rx="120" ry="60" fill="#facc15" stroke="#ca8a04" strokeWidth="3" style={{ transition: 'opacity 1.2s, transform 1.2s', opacity: s >= 2 ? 0 : 1, transformOrigin: '300px 180px', transform: s >= 2 ? 'scale(0.3)' : 'scale(1)' }} />
      <text x="300" y="186" textAnchor="middle" fontWeight="800" fill="#713f12" fontSize="18" style={{ opacity: s >= 2 ? 0 : 1, transition: 'opacity 1s' }}>دهن</text>
      {s >= 1 && s < 2 && Array.from({ length: 12 }).map((_, i) => <circle key={i} cx={300 + Math.cos(i * 0.52) * 150} cy={180 + Math.sin(i * 0.52) * 90} r="9" fill="#16a34a" />)}
      {s === 1 && <text x="300" y="320" textAnchor="middle" fontWeight="800" fill="#166534" fontSize="18">الصفراء (من الكبد والمرارة)</text>}
      {drops.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={s >= 3 ? 9 : 14} fill="#facc15" stroke="#ca8a04" strokeWidth="2" style={{ transition: 'opacity 1.2s, r 1s', opacity: s >= 2 ? 1 : 0 }} />)}
      {s >= 2 && <text x="300" y="320" textAnchor="middle" fontWeight="800" fill="#713f12" fontSize="18">{s === 2 ? 'مستحلب دهني: قطيرات صغيرة' : 'ليبيز ← غليسرول + حموض دهنية'}</text>}
      {s >= 3 && drops.slice(0, 8).map(([x, y], i) => <g key={i}><polygon points={`${x + 16},${y - 8} ${x + 28},${y - 8} ${x + 22},${y + 4}`} fill="#a855f7" /><rect x={x - 30} y={y - 4} width="18" height="7" rx="3" fill="#0ea5e9" /></g>)}
      {s >= 3 && <Enzyme x={300} y={130} label="ليبيز" show scale={0.7} />}
      {s >= 3 && <Legend items={[['#a855f7', 'غليسرول'], ['#0ea5e9', 'حمض دهني']]} />}
    </Frame>
  );
}

function MechChem({ index: s }: { index: number }) {
  const big = s === 0, mid = s === 1, small = s === 2 || s === 3, mol = s === 4;
  const op = (v: boolean) => ({ opacity: v ? 1 : 0, transition: 'opacity 1s' });
  return (
    <Frame title="الهضم الميكانيكي والكيميائي">
      <g style={op(big)}><rect x="220" y="110" width="160" height="120" rx="16" fill="#f59e0b" stroke="#b45309" strokeWidth="3" /><text x="300" y="178" textAnchor="middle" fontWeight="800" fill="#fff" fontSize="20">قطعة طعام</text></g>
      <g style={op(mid)}>{Array.from({ length: 6 }).map((_, i) => <rect key={i} x={170 + (i % 3) * 90} y={110 + Math.floor(i / 3) * 70} width="76" height="56" rx="10" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />)}</g>
      <g style={op(small)}>{Array.from({ length: 24 }).map((_, i) => <rect key={i} x={140 + (i % 8) * 40} y={110 + Math.floor(i / 8) * 40} width="30" height="30" rx="6" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />)}</g>
      <g style={op(mol)}>{Array.from({ length: 40 }).map((_, i) => <circle key={i} cx={110 + (i % 10) * 42} cy={100 + Math.floor(i / 10) * 40} r="11" fill={[GLU, '#3b82f6', '#22c55e', '#a855f7'][i % 4]} stroke="#fff" strokeWidth="2" />)}</g>
      <Enzyme x={220} y={90} label="أنزيم" show={s === 3} scale={0.8} /><Enzyme x={380} y={90} label="أنزيم" show={s === 3} scale={0.8} />
      <text x="300" y="300" textAnchor="middle" fontWeight="800" fill="#0a1a3f" fontSize="20">
        {s === 1 || s === 2 ? '🦷 هضم ميكانيكي (تقطيع وطحن)' : s >= 3 ? '⚗️ هضم كيميائي (أنزيمات)' : ''}</text>
    </Frame>
  );
}

function Absorption({ index: s }: { index: number }) {
  const pts: { c: string; p: [number, number][] }[] = [];
  const lumenL = [[90, 120], [130, 200], [100, 260], [160, 150], [150, 250]], lumenR = [[500, 130], [460, 210], [510, 260], [440, 160], [450, 260]];
  [...lumenL, ...lumenR].forEach(([x, y], i) => {
    const kind = i % 3;
    const col = kind === 0 ? GLU : kind === 1 ? '#3b82f6' : '#84cc16';
    const wall = x < 300 ? 248 : 352;
    const target: [number, number] = kind === 2 ? [322, 190] : [282, 190];
    const toLiver: [number, number] = kind === 2 ? [322, 150] : [282, 310];
    pts.push({ c: col, p: [[x, y], [wall, y], target, toLiver] });
  });
  return (
    <Frame title="الامتصاص عبر الخملات">
      <path d="M230 330 L230 130 C230 40 370 40 370 130 L370 330 Z" fill="#fda4af" stroke="#be123c" strokeWidth="3" />
      <path d="M262 330 L262 110 C262 90 300 90 300 110 L300 330" fill="none" stroke="#dc2626" strokeWidth="9" opacity="0.8" />
      <path d="M306 330 L306 110 C306 90 336 90 336 110 L336 330" fill="none" stroke="#ca8a04" strokeWidth="10" opacity="0.7" />
      <text x="282" y="80" textAnchor="middle" fontSize="12" fontWeight="800" fill="#7f1d1d">شعيرة دموية</text>
      <text x="326" y="64" textAnchor="middle" fontSize="12" fontWeight="800" fill="#713f12">وعاء ليمفي</text>
      <text x="300" y="30" textAnchor="middle" fontSize="14" fontWeight="800" fill="#9f1239">خملة معوية</text>
      {pts.map((q, i) => { const [x, y] = q.p[Math.min(s, 3)]; return <Bead key={i} x={x} y={y} color={q.c} r={9} />; })}
      <Legend items={[[GLU, 'غلوكوز'], ['#3b82f6', 'حمض أميني'], ['#84cc16', 'حمض دهني/غليسرول']]} />
      {s >= 3 && <text x="282" y="326" textAnchor="middle" fontSize="13" fontWeight="800" fill="#7f1d1d">← إلى الكبد</text>}
    </Frame>
  );
}

function Peristalsis({ index, t }: { index: number; t: number }) {
  const q = index === 0 ? 0 : index === 1 ? 0.1 * t : index === 2 ? 0.1 + 0.1 * t : 0.2 + 0.8 * ease(clamp(t));
  const xc = 70 + 440 * q;
  const g = (d: number, w: number) => Math.exp(-((d / w) ** 2));
  const squeeze = index >= 1 ? 1 : 0, relax = index >= 2 ? 1 : 0;
  const h = (x: number) => 34 + 15 * g(x - xc, 30) - 17 * squeeze * g(x - (xc - 75), 28) + 8 * relax * g(x - (xc + 75), 28);
  const xs = Array.from({ length: 53 }, (_, i) => 40 + i * 10);
  const top = xs.map((x, i) => `${i ? 'L' : 'M'}${x} ${180 - h(x)}`).join(' ');
  const bot = xs.map((x) => `L${x} ${180 + h(x)}`).reverse().join(' ');
  return (
    <Frame title="الحركة الدودية">
      <path d={`${top} ${bot} Z`} fill="#fecdd3" stroke="#be123c" strokeWidth="4" strokeLinejoin="round" />
      <circle cx={xc} cy={180} r={24} fill="#f59e0b" stroke="#b45309" strokeWidth="3" />
      <text x={xc} y={185} textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">لقمة</text>
      {squeeze > 0 && <><text x={xc - 75} y={100} textAnchor="middle" fontWeight="800" fill="#dc2626" fontSize="15">انقباض ⬇️</text></>}
      {relax > 0 && <text x={xc + 75} y={100} textAnchor="middle" fontWeight="800" fill="#16a34a" fontSize="15">ارتخاء</text>}
      <text x="300" y="300" textAnchor="middle" fontWeight="800" fill="#0a1a3f" fontSize="18">عضلات ملساء دائرية لا إرادية — الاتجاه نحو المعدة ⟵</text>
    </Frame>
  );
}

function Journey({ index, t, steps }: { index: number; t: number; steps: SimStep[] }) {
  const ref = useRef<SVGPathElement>(null);
  const s = steps[index];
  const p = (s.from ?? 0) + ((s.to ?? 0) - (s.from ?? 0)) * ease(clamp(t));
  let pt = { x: 160, y: 28 };
  if (ref.current) { const len = ref.current.getTotalLength(); pt = ref.current.getPointAtLength(len * p); }
  return (
    <DigestiveSvg className="mx-auto h-full max-h-full" highlight={s.highlight ?? []}>
      <path ref={ref} d={FOOD_TRACK} fill="none" stroke="none" />
      <circle cx={pt.x} cy={pt.y} r="11" fill="#facc15" stroke="#b45309" strokeWidth="3" />
      <circle cx={pt.x} cy={pt.y} r="18" fill="none" stroke="#facc15" strokeOpacity="0.5" strokeWidth="3" />
    </DigestiveSvg>
  );
}

export function Scene({ kind, index, t, steps }: SceneProps) {
  switch (kind) {
    case 'journey': return <Journey index={index} t={t} steps={steps} />;
    case 'mechchem': return <MechChem index={index} />;
    case 'amylase': return <Amylase index={index} />;
    case 'pepsin': return <Pepsin index={index} />;
    case 'carb': return <Carb index={index} />;
    case 'bile': return <Bile index={index} />;
    case 'absorption': return <Absorption index={index} />;
    case 'peristalsis': return <Peristalsis index={index} t={t} />;
  }
}
