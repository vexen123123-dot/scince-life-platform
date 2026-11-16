// عميل Supabase مزيّف للاختبار فقط — يسجّل العمليات ويعيد بيانات مُعدّة سلفاً
export const db: any = { users: {}, profiles: {}, submissions: {}, log: [] as any[], created: [] as any[] };
const q = (table: string) => {
  const st: any = { table, filters: {} };
  const api: any = {
    select: () => api, eq: (k: string, v: any) => { st.filters[k] = v; return api; },
    maybeSingle: async () => ({ data: table === 'profiles' ? db.profiles[st.filters.id] ?? null : table === 'submissions' ? db.submissions[st.filters.id] ?? null : null, error: null }),
    single: async () => api.maybeSingle(),
    update: (v: any) => { st.op = 'update'; st.v = v; return api; },
    insert: async (v: any) => { db.log.push({ table, op: 'insert', v }); return { error: null }; },
    upsert: async (v: any) => { db.log.push({ table, op: 'upsert', v }); return { error: null }; },
    then: (res: any) => { if (st.op === 'update') { db.log.push({ table, op: 'update', v: st.v, f: st.filters }); if (table === 'profiles' && db.profiles[st.filters.id]) Object.assign(db.profiles[st.filters.id], st.v); } res({ error: null }); },
  };
  return api;
};
export const createClient = () => ({
  auth: {
    getUser: async (t: string) => (db.users[t] ? { data: { user: db.users[t] }, error: null } : { data: { user: null }, error: { message: 'bad' } }),
    admin: { createUser: async (a: any) => { const u = { id: crypto.randomUUID(), email: a.email }; db.created.push(a); db.profiles[u.id] = { role: 'student', is_active: true }; return { data: { user: u }, error: null }; }, listUsers: async () => ({ data: { users: [] }, error: null }) },
  },
  from: q,
});
