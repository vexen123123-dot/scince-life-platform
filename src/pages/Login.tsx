import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Banner, Button, Card, Field, inputCls } from '../components/ui';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Login() {
  const { signIn, session, profile, isAdmin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  if (session && profile) return <Navigate to={loc.state?.from ?? (isAdmin ? '/admin' : '/dashboard')} replace />;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const m = await signIn(email.trim(), password); setBusy(false);
    if (m) setErr(m); else nav(loc.state?.from ?? '/dashboard', { replace: true });
  };
  return (
    <div className="mx-auto max-w-md py-8">
      <Card className="space-y-5">
        <div className="flex flex-col items-center gap-2 text-center"><Logo size={64} /><h1 className="text-2xl font-extrabold text-navy-900">تسجيل الدخول</h1>
          <p className="text-sm text-slate-600">الحسابات تُنشأ من قِبل المعلمة أو المشرف. لا يوجد تسجيل عام.</p></div>
        {!isSupabaseConfigured && <Banner>لم يتم ربط Supabase بعد، لذلك لا يمكن تسجيل الدخول. (راجع README ← «ربط Supabase»). الدروس والمحاكاة والمعمل تعمل بدون حساب.</Banner>}
        <form onSubmit={submit} className="space-y-4">
          <Field label="البريد الإلكتروني"><input className={inputCls} type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" /></Field>
          <Field label="كلمة المرور"><input className={inputCls} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" /></Field>
          {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <Button type="submit" className="w-full" loading={busy} disabled={!isSupabaseConfigured}>دخول</Button>
        </form>
      </Card>
    </div>
  );
}
