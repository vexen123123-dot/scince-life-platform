import { useCallback, useEffect, useRef, useState } from 'react';
import { errMsg } from '../lib/supabase';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn); fnRef.current = fn;
  const run = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await fnRef.current()); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);
  return { data, error, loading, reload: run, setData };
}
