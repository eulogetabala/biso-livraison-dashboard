import { ORDER_STATUS_LABELS } from '../lib/format';
import type { OrderStatusRow } from '../graphql/statistics';

type Props = {
  rows: OrderStatusRow[];
  loading?: boolean;
};

const STATUS_TONE: Record<string, string> = {
  PENDING: 'warning',
  CONFIRMED: 'accent',
  PREPARING: 'accent',
  IN_TRANSIT: 'default',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

export default function StatusBreakdown({ rows, loading }: Props) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  if (loading) {
    return <div className="status-breakdown status-breakdown--loading">Chargement…</div>;
  }

  if (total === 0) {
    return <p className="muted">Aucune commande enregistrée pour le moment.</p>;
  }

  return (
    <div className="status-breakdown">
      {rows.map((row) => {
        const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
        const tone = STATUS_TONE[row.status] ?? 'default';
        return (
          <div key={row.status} className="status-row">
            <div className="status-row-head">
              <span>{ORDER_STATUS_LABELS[row.status] ?? row.status}</span>
              <strong>{row.count}</strong>
            </div>
            <div className="status-row-track">
              <div className={`status-row-fill status-row-fill--${tone}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
