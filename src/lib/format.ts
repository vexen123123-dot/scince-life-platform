export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
export const fmtDay = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ar-EG-u-nu-latn', { dateStyle: 'medium' }) : '—';
export const pct = (n: number | null | undefined) => (n == null ? '—' : `${Math.round(Number(n))}%`);
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
export const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export const ALLOWED_UPLOAD = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export function validateFile(f: File): string | null {
  if (!ALLOWED_UPLOAD.includes(f.type)) return `نوع الملف غير مدعوم (${f.name}). المسموح: صور JPG/PNG/WEBP/HEIC وPDF وDOCX وTXT.`;
  if (f.size > MAX_UPLOAD_BYTES) return `حجم الملف (${f.name}) يتجاوز 10 ميغابايت.`;
  if (f.size === 0) return `الملف ${f.name} فارغ.`;
  return null;
}
export const statusLabel: Record<string, string> = {
  draft: 'مسودة', submitted: 'تم التسليم', returned: 'أُعيد للتصحيح', graded: 'تم التصحيح', published: 'منشور',
};
