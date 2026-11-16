import { DataTable, ErrorBox, PageHeader, Spinner, type Column } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { fmtDate } from '../../lib/format';
import { listAudit } from '../../services/admin';
import type { AuditLog } from '../../types/db';

export default function AdminAudit() {
  const { data, loading, error, reload } = useAsync(() => listAudit(500), []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const cols: Column<AuditLog>[] = [
    { key: 'created_at', header: 'الوقت', render: (r) => fmtDate(r.created_at) }, { key: 'action', header: 'الإجراء' }, { key: 'entity', header: 'الكيان' },
    { key: 'entity_id', header: 'المعرّف', render: (r) => <code dir="ltr" className="text-xs">{r.entity_id?.slice(0, 8) ?? '—'}</code> },
    { key: 'actor_id', header: 'المنفّذ', render: (r) => <code dir="ltr" className="text-xs">{r.actor_id?.slice(0, 8) ?? 'النظام'}</code> },
    { key: 'details', header: 'تفاصيل', searchValue: (r) => JSON.stringify(r.details), render: (r) => <code dir="ltr" className="line-clamp-1 max-w-xs text-xs">{JSON.stringify(r.details).slice(0, 90)}</code> },
  ];
  return <><PageHeader title="سجلّ التدقيق" subtitle="آخر 500 عملية إدارية (للقراءة فقط)" /><DataTable rows={data.map((d) => ({ ...d, id: d.id }))} columns={cols} pageSize={15} /></>;
}
