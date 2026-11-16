import type { ReactNode } from 'react';

export const ORGANS: Record<string, { name: string; fill: string }> = {
  salivary: { name: 'الغدد اللعابية', fill: '#f59e0b' },
  mouth: { name: 'الفم', fill: '#fb7185' },
  esophagus: { name: 'المريء', fill: '#f472b6' },
  liver: { name: 'الكبد', fill: '#9a3412' },
  gallbladder: { name: 'المرارة', fill: '#16a34a' },
  stomach: { name: 'المعدة', fill: '#f97316' },
  pancreas: { name: 'البنكرياس', fill: '#eab308' },
  small: { name: 'الأمعاء الدقيقة', fill: '#ec4899' },
  large: { name: 'الأمعاء الغليظة', fill: '#a855f7' },
  appendix: { name: 'الزائدة الدودية', fill: '#7c3aed' },
};

/** مسار لقمة الطعام عبر القناة الهضمية (إحداثيات الرسم 320×440) */
export const FOOD_TRACK =
  'M160 28 L160 60 L160 150 C150 175 160 200 185 215 C205 225 215 240 205 250 ' +
  'C230 268 215 286 190 291 C150 296 112 300 120 315 C135 328 215 320 200 335 ' +
  'C185 348 112 345 125 360 C140 372 190 362 165 372 L120 376 L85 380 L85 275 L235 275 L235 385 L195 400 L165 420';

const geom: Record<string, ReactNode> = {};
type P = { id: string; hl: boolean; dim: boolean; onSelect?: (id: string) => void; labels: boolean };

function Organ({ id, hl, dim, onSelect, labels, d, lx, ly, stroke }: P & { d: string; lx: number; ly: number; stroke?: number }) {
  const o = ORGANS[id];
  const common = {
    onClick: onSelect ? () => onSelect(id) : undefined, style: { cursor: onSelect ? 'pointer' : 'default', transition: 'opacity .25s' },
    opacity: dim ? 0.3 : 1, role: onSelect ? 'button' : undefined, 'aria-label': o.name,
  } as const;
  return (
    <g {...common}>
      {stroke ? <path d={d} fill="none" stroke={o.fill} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        : <path d={d} fill={o.fill} stroke={hl ? '#22d3ee' : '#ffffff'} strokeWidth={hl ? 4 : 1.5} />}
      {stroke && hl && <path d={d} fill="none" stroke="#22d3ee" strokeWidth={stroke + 6} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />}
      {labels && <text x={lx} y={ly} fontSize="13" fontWeight="700" fill="#0a1a3f" textAnchor="middle" stroke="#fff" strokeWidth="3" paintOrder="stroke">{o.name}</text>}
    </g>
  );
}

export function DigestiveSvg({ highlight = [], labels = true, onSelect, children, className = '' }:
  { highlight?: string[]; labels?: boolean; onSelect?: (id: string) => void; children?: ReactNode; className?: string }) {
  const any = highlight.length > 0;
  const p = (id: string) => ({ id, hl: highlight.includes(id), dim: any && !highlight.includes(id), onSelect, labels });
  void geom;
  return (
    <svg viewBox="0 0 320 440" className={className} role="img" aria-label="رسم تخطيطي للجهاز الهضمي">
      <rect x="0" y="0" width="320" height="440" rx="24" fill="#eff6ff" />
      <Organ {...p('large')} d="M85 385 L85 275 L235 275 L235 385 L195 400 L165 420" lx={160} ly={268} stroke={24} />
      <Organ {...p('small')} d="M205 250 C230 268 215 286 190 291 C150 296 112 300 120 315 C135 328 215 320 200 335 C185 348 112 345 125 360 C140 372 190 362 165 372" lx={160} ly={310} stroke={13} />
      <Organ {...p('appendix')} d="M85 385 L72 408" lx={50} ly={415} stroke={7} />
      <Organ {...p('pancreas')} d="M130 245 C170 232 215 238 240 250 C215 264 170 260 130 256 Z" lx={185} ly={252} />
      <Organ {...p('liver')} d="M52 172 C55 140 130 138 160 162 L152 202 C120 224 66 218 52 172 Z" lx={95} ly={178} />
      <Organ {...p('gallbladder')} d="M126 200 C118 208 120 226 128 228 C138 226 138 208 126 200 Z" lx={104} ly={236} />
      <Organ {...p('stomach')} d="M140 150 C118 162 124 216 176 236 C226 250 246 214 226 190 C210 172 186 176 172 150 Z" lx={196} ly={206} />
      <Organ {...p('esophagus')} d="M160 52 L160 152" lx={196} ly={100} stroke={9} />
      <Organ {...p('mouth')} d="M138 28 C138 12 182 12 182 28 C182 42 138 42 160 42 C150 42 138 40 138 28 Z" lx={226} ly={30} />
      <Organ {...p('salivary')} d="M118 46 a10 7 0 1 0 0.1 0 Z M202 46 a10 7 0 1 0 0.1 0 Z" lx={72} ly={52} />
      {children}
    </svg>
  );
}

export function VillusSvg({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 330" className={className} role="img" aria-label="تركيب الخملة المعوية">
      <rect width="360" height="330" rx="20" fill="#fff7ed" />
      <path d="M110 320 L110 150 C110 40 250 40 250 150 L250 320 Z" fill="#fda4af" stroke="#be123c" strokeWidth="3" />
      {Array.from({ length: 9 }).map((_, i) => <line key={i} x1={112 + i * 17} y1={Math.max(62, 150 - (i - 4) ** 2 * 6)} x2={112 + i * 17} y2={Math.max(50, 138 - (i - 4) ** 2 * 6)} stroke="#9f1239" strokeWidth="3" strokeLinecap="round" />)}
      <path d="M150 300 L150 120 C150 90 175 90 180 120 L180 300" fill="none" stroke="#dc2626" strokeWidth="7" />
      <path d="M205 300 L205 120 C205 95 215 95 215 120 L215 300" fill="none" stroke="#2563eb" strokeWidth="7" />
      <path d="M180 300 L180 140 C180 110 200 110 200 140 L200 300" fill="none" stroke="#ca8a04" strokeWidth="9" strokeOpacity={0.85} />
      <g fontSize="13" fontWeight="700" fill="#0a1a3f">
        <text x="262" y="52">زوائد دقيقة</text><line x1="258" y1="48" x2="236" y2="62" stroke="#0a1a3f" />
        <text x="262" y="110">خلايا طلائية</text><line x1="258" y1="106" x2="248" y2="112" stroke="#0a1a3f" />
        <text x="8" y="130">شعيرات دموية</text><line x1="86" y1="126" x2="150" y2="120" stroke="#0a1a3f" />
        <text x="8" y="190">وعاء ليمفي</text><line x1="72" y1="186" x2="182" y2="190" stroke="#0a1a3f" />
        <text x="262" y="300">وريد</text><line x1="258" y1="296" x2="208" y2="290" stroke="#0a1a3f" />
        <text x="8" y="300">شريان</text><line x1="48" y1="296" x2="150" y2="290" stroke="#0a1a3f" />
      </g>
      <text x="180" y="22" textAnchor="middle" fontSize="12" fill="#7c2d12">طول الخملة ≈ 1 ملم</text>
    </svg>
  );
}

export function PyramidSvg({ className = '' }: { className?: string }) {
  const tiers = [
    { y: 20, w: 70, c: '#fca5a5', t: 'الدهون والزيوت والحلويات' },
    { y: 80, w: 150, c: '#fdba74', t: 'الحليب واللحوم' },
    { y: 140, w: 230, c: '#86efac', t: 'الفواكه  |  الخضار' },
    { y: 200, w: 310, c: '#fcd34d', t: 'الحبوب' },
    { y: 260, w: 390, c: '#7dd3fc', t: 'الماء' },
  ];
  return (
    <svg viewBox="0 0 400 330" className={className} role="img" aria-label="الهرم الغذائي">
      {tiers.map((t) => (
        <g key={t.t}>
          <rect x={200 - t.w / 2} y={t.y} width={t.w} height="54" rx="10" fill={t.c} stroke="#0a1a3f" strokeOpacity="0.25" />
          <text x="200" y={t.y + 33} textAnchor="middle" fontWeight="700" fontSize="15" fill="#0a1a3f">{t.t}</text>
        </g>
      ))}
    </svg>
  );
}

export function Figure({ id }: { id: 'pyramid' | 'digestive' | 'villus' | 'stomach' | 'liver-bile' }) {
  const cls = 'mx-auto w-full max-w-md';
  switch (id) {
    case 'pyramid': return <PyramidSvg className={cls} />;
    case 'villus': return <VillusSvg className={cls} />;
    case 'stomach': return <DigestiveSvg className={cls} highlight={['stomach', 'esophagus']} />;
    case 'liver-bile': return <DigestiveSvg className={cls} highlight={['liver', 'gallbladder', 'pancreas']} />;
    default: return <DigestiveSvg className={cls} />;
  }
}
