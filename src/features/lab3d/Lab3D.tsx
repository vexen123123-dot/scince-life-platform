import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Eye, EyeOff, Maximize, Minimize, RefreshCcw, RotateCw } from 'lucide-react';
import { Button } from '../../components/ui';
import { cx } from '../../lib/format';
import { GLB_CONFIG, organById, organInfo } from './organs';

const HOME_POS = new THREE.Vector3(0, 0.2, 9.5);
const HOME_TARGET = new THREE.Vector3(0, 0, 0);

interface Ctx { selected: string | null; hovered: string | null; labels: boolean; select: (id: string | null) => void; hover: (id: string | null) => void }

/** مجموعة عضو واحد: نقر + تمرير + تمييز بالإضاءة والتعتيم */
function Organ({ id, ctx, children, labelAt }: { id: string; ctx: Ctx; children: ReactNode; labelAt: [number, number, number] }) {
  const info = organById(id)!;
  const active = ctx.selected === id, hov = ctx.hovered === id;
  const dim = ctx.selected !== null && !active;
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const target = active ? 0.55 + Math.sin(clock.elapsedTime * 3) * 0.12 : hov ? 0.35 : 0;
    mats.current.forEach((m) => { m.emissiveIntensity += (target - m.emissiveIntensity) * 0.2; m.opacity += ((dim ? 0.18 : 1) - m.opacity) * 0.15; });
  });
  useEffect(() => {
    const list: THREE.MeshStandardMaterial[] = [];
    group.current?.traverse((o) => { const m = (o as THREE.Mesh).material; if (m && (m as THREE.MeshStandardMaterial).isMeshStandardMaterial) list.push(m as THREE.MeshStandardMaterial); });
    mats.current = list;
  });
  return (
    <group ref={group} name={id}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); ctx.select(active ? null : id); }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); ctx.hover(id); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { ctx.hover(null); document.body.style.cursor = 'auto'; }}>
      {children}
      {ctx.labels && (
        <Html position={labelAt} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
          <span className={cx('whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-extrabold shadow', active ? 'bg-cyan-400 text-navy-950' : 'bg-white/90 text-navy-900', dim && 'opacity-40')}>{info.name}</span>
        </Html>)}
    </group>
  );
}
const Mat = ({ color }: { color: string }) => <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} emissive={color} emissiveIntensity={0} transparent />;

function Tube({ points, radius, color, closed = false, seg = 220 }: { points: [number, number, number][]; radius: number; color: string; closed?: boolean; seg?: number }) {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.5), seg, radius, 16, closed), [points, radius, closed, seg]);
  return <mesh geometry={geo}><Mat color={color} /></mesh>;
}

const smallPts: [number, number, number][] = (() => {
  const p: [number, number, number][] = [[0.45, -0.05, 0.1]];
  for (let r = 0; r < 6; r++) { const y = -0.4 - r * 0.28, dir = r % 2 ? -1 : 1; p.push([0.7 * dir, y + 0.08, 0.1 + (r % 3) * 0.06], [-0.7 * dir, y - 0.08, 0.05]); }
  p.push([-0.85, -2.0, 0.1]); return p;
})();
const largePts: [number, number, number][] = [[-1.05, -2.05, 0.1], [-1.15, -1.2, 0.1], [-1.1, -0.35, 0.1], [-0.6, -0.15, 0.1], [0.6, -0.15, 0.1], [1.1, -0.35, 0.1], [1.15, -1.2, 0.1], [1.0, -2.1, 0.1], [0.5, -2.5, 0.1], [0.1, -2.65, 0.1]];

function Body({ ctx }: { ctx: Ctx }) {
  return (
    <group onClick={() => ctx.select(null)}>
      <mesh position={[0, -0.3, -0.35]} scale={[1.9, 3.6, 0.9]}><sphereGeometry args={[1, 40, 40]} /><meshStandardMaterial color="#93c5fd" transparent opacity={0.1} depthWrite={false} /></mesh>
      <Organ id="mouth" ctx={ctx} labelAt={[0.9, 3.1, 0]}><mesh position={[0, 3.0, 0.2]} scale={[0.5, 0.3, 0.4]}><sphereGeometry args={[1, 32, 32]} /><Mat color="#fb7185" /></mesh></Organ>
      <Organ id="salivary" ctx={ctx} labelAt={[-1.3, 2.7, 0]}>
        {[-1, 1].map((s) => <mesh key={s} position={[0.62 * s, 2.82, 0.1]} scale={[0.22, 0.16, 0.18]}><sphereGeometry args={[1, 24, 24]} /><Mat color="#f59e0b" /></mesh>)}
      </Organ>
      <Organ id="esophagus" ctx={ctx} labelAt={[0.7, 1.9, 0]}><Tube points={[[0, 2.8, 0.15], [0, 2.2, 0], [0, 1.6, -0.05], [0.1, 1.05, 0.1]]} radius={0.11} color="#f472b6" seg={60} /></Organ>
      <Organ id="liver" ctx={ctx} labelAt={[-1.5, 1.05, 0.3]}><mesh position={[-0.75, 0.65, 0.2]} rotation={[0, 0, 0.25]} scale={[1.0, 0.52, 0.6]}><sphereGeometry args={[1, 40, 40]} /><Mat color="#9a3412" /></mesh></Organ>
      <Organ id="gallbladder" ctx={ctx} labelAt={[-0.7, -0.05, 0.6]}><mesh position={[-0.42, 0.22, 0.55]} rotation={[0, 0, 0.3]}><capsuleGeometry args={[0.09, 0.2, 8, 16]} /><Mat color="#16a34a" /></mesh></Organ>
      <Organ id="stomach" ctx={ctx} labelAt={[1.3, 0.8, 0.4]}><mesh position={[0.4, 0.5, 0.2]} rotation={[0, 0, -0.6]} scale={[0.7, 0.48, 0.45]}><sphereGeometry args={[1, 40, 40]} /><Mat color="#f97316" /></mesh></Organ>
      <Organ id="pancreas" ctx={ctx} labelAt={[1.1, 0.02, 0.2]}><mesh position={[0.1, 0.08, 0.05]} rotation={[0, 0, Math.PI / 2 + 0.12]}><capsuleGeometry args={[0.12, 1.1, 8, 16]} /><Mat color="#eab308" /></mesh></Organ>
      <Organ id="small" ctx={ctx} labelAt={[0, -2.35, 0.5]}><Tube points={smallPts} radius={0.1} color="#ec4899" /></Organ>
      <Organ id="large" ctx={ctx} labelAt={[1.8, -1.2, 0.3]}><Tube points={largePts} radius={0.2} color="#a855f7" /></Organ>
      <Organ id="appendix" ctx={ctx} labelAt={[-1.65, -2.2, 0.2]}><Tube points={[[-1.05, -2.05, 0.1], [-1.15, -2.25, 0.1], [-1.0, -2.4, 0.1]]} radius={0.05} color="#7c3aed" seg={20} /></Organ>
    </group>
  );
}

/** نموذج GLB اختياري من public/models — يُستعمل فقط إن وُجد الملف فعلاً */
function GlbModel({ ctx }: { ctx: Ctx }) {
  const { scene } = useGLTF(GLB_CONFIG.url);
  const idOf = (name: string) => Object.entries(GLB_CONFIG.nodeMap).find(([, names]) => names.some((n) => name.toLowerCase().includes(n.toLowerCase())))?.[0] ?? null;
  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh; if (!mesh.isMesh) return;
      let node: THREE.Object3D | null = mesh, id: string | null = null;
      while (node && !id) { id = idOf(node.name); node = node.parent; }
      const m = mesh.material as THREE.MeshStandardMaterial;
      if (!m || !('emissive' in m)) return;
      m.transparent = true;
      m.opacity = ctx.selected && id !== ctx.selected ? 0.2 : 1;
      m.emissive = new THREE.Color(id && id === ctx.selected ? '#22d3ee' : '#000000'); m.emissiveIntensity = 0.5;
    });
  });
  return <primitive object={scene} onClick={(e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation(); let n: THREE.Object3D | null = e.object, id: string | null = null;
    while (n && !id) { id = idOf(n.name); n = n.parent; } ctx.select(id);
  }} />;
}

function CameraRig({ goal, controls, onDone }: { goal: { pos: THREE.Vector3; target: THREE.Vector3 } | null; controls: RefObject<any>; onDone: () => void }) {
  useFrame(({ camera }) => {
    const c = controls.current; if (!goal || !c) return;
    camera.position.lerp(goal.pos, 0.08); c.target.lerp(goal.target, 0.08); c.update();
    if (camera.position.distanceTo(goal.pos) < 0.02 && c.target.distanceTo(goal.target) < 0.02) onDone();
  });
  return null;
}

export default function Lab3D() {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [labels, setLabels] = useState(true);
  const [spin, setSpin] = useState(false);
  const [fs, setFs] = useState(false);
  const [goal, setGoal] = useState<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const [glb, setGlb] = useState(false);
  const controls = useRef<any>(null);
  const box = useRef<HTMLDivElement>(null);

  // هل وُضع نموذج GLB فعلاً؟ (خادم التطوير يعيد index.html للملفات المفقودة فنتحقق من نوع المحتوى)
  useEffect(() => {
    fetch(GLB_CONFIG.url, { method: 'HEAD' }).then((r) => setGlb(r.ok && !(r.headers.get('content-type') ?? '').includes('text/html'))).catch(() => setGlb(false));
  }, []);
  useEffect(() => {
    const f = () => setFs(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);

  const select = (id: string | null) => {
    setSelected(id);
    const o = id ? organById(id) : null;
    if (o) { const t = new THREE.Vector3(...o.focus); setGoal({ target: t, pos: t.clone().add(new THREE.Vector3(0, 0.3, o.zoom + 1.5)) }); }
    else setGoal({ pos: HOME_POS.clone(), target: HOME_TARGET.clone() });
  };
  const ctx: Ctx = { selected, hovered, labels, select, hover: setHovered };
  const info = selected ? organById(selected) : null;
  const toggleFs = async () => { try { document.fullscreenElement ? await document.exitFullscreen() : await box.current?.requestFullscreen(); } catch { /* غير مدعوم */ } };

  return (
    <div ref={box} className={cx('grid gap-4 bg-soft-50 lg:grid-cols-[2fr_1fr]', fs && 'h-screen p-4')}>
      <div className="relative min-h-[26rem] overflow-hidden rounded-3xl bg-gradient-to-b from-navy-900 to-navy-700 lg:min-h-[34rem]" style={{ touchAction: 'none' }}>
        <Canvas camera={{ position: HOME_POS.toArray(), fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }} onPointerMissed={() => selected && select(null)}>
          <ambientLight intensity={0.8} /><directionalLight position={[4, 6, 6]} intensity={1.4} /><directionalLight position={[-5, -2, -4]} intensity={0.5} color="#67e8f9" />
          <Suspense fallback={null}>{glb ? <GlbModel ctx={ctx} /> : <Body ctx={ctx} />}</Suspense>
          <OrbitControls ref={controls} enableDamping dampingFactor={0.08} minDistance={2.5} maxDistance={16} autoRotate={spin} autoRotateSpeed={1.6}
            onStart={() => setGoal(null)} touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }} />
          <CameraRig goal={goal} controls={controls} onDone={() => setGoal(null)} />
        </Canvas>
        <div className="absolute inset-x-3 top-3 flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="cyan" onClick={() => { setSelected(null); setGoal({ pos: HOME_POS.clone(), target: HOME_TARGET.clone() }); }}><RefreshCcw size={16} />إعادة ضبط الكاميرا</Button>
          <Button size="sm" variant="secondary" onClick={() => setLabels((l) => !l)}>{labels ? <EyeOff size={16} /> : <Eye size={16} />}{labels ? 'إخفاء' : 'إظهار'} الأسماء</Button>
          <Button size="sm" variant="secondary" onClick={() => setSpin((s) => !s)}><RotateCw size={16} />{spin ? 'إيقاف الدوران' : 'دوران تلقائي'}</Button>
          <Button size="sm" variant="secondary" onClick={toggleFs}>{fs ? <Minimize size={16} /> : <Maximize size={16} />}{fs ? 'خروج' : 'ملء الشاشة'}</Button>
        </div>
        <p className="absolute inset-x-0 bottom-2 text-center text-xs text-white/80">اسحب للتدوير • اقرص أو استعمل العجلة للتكبير • اضغط على أي عضو لعرض معلوماته</p>
        {!glb && <p className="absolute start-3 bottom-8 rounded bg-black/40 px-2 py-1 text-[11px] text-white/80">نموذج مُنشأ برمجياً (تقريبي) — لإضافة نموذج GLB راجع docs/3D-MODELS.md</p>}
      </div>

      <aside className="space-y-3 overflow-y-auto" aria-live="polite">
        <div className="rounded-2xl bg-white p-5 shadow-card">
          {info ? (
            <>
              <h2 className="text-2xl font-extrabold" style={{ color: info.color }}>{info.name}</h2>
              <p className="mt-2 text-lg font-bold text-navy-900">الوظيفة</p><p className="leading-8 text-slate-800">{info.func}</p>
              <p className="mt-3 text-lg font-bold text-navy-900">التفاصيل</p>
              <ul className="list-disc space-y-1 ps-6 leading-8 text-slate-800">{info.details.map((d) => <li key={d}>{d}</li>)}</ul>
            </>
          ) : <><h2 className="text-xl font-extrabold text-navy-900">اختر عضواً</h2><p className="mt-2 leading-8 text-slate-700">اضغط على أي عضو في النموذج، أو اختره من القائمة أدناه، لتظهر وظيفته وشرحه.</p></>}
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="mb-2 font-bold text-navy-900">قائمة الأعضاء</p>
          <div className="flex flex-wrap gap-2">
            {organInfo.map((o) => (
              <button key={o.id} onClick={() => select(selected === o.id ? null : o.id)} aria-pressed={selected === o.id}
                className={cx('rounded-full border px-3 py-1.5 text-sm font-bold transition', selected === o.id ? 'border-cyan-500 bg-cyan-500 text-navy-950' : 'border-soft-200 hover:bg-soft-100')}>{o.name}</button>))}
          </div>
        </div>
      </aside>
    </div>
  );
}
