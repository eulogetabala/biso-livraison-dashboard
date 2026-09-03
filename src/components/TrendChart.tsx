import { useMemo } from 'react';
import { formatFcfa, formatShortDate } from '../lib/format';
import type { DailyOrderPoint } from '../graphql/statistics';

type Props = {
  data: DailyOrderPoint[];
  loading?: boolean;
  metric?: 'orders' | 'revenue';
};

export default function TrendChart({ data, loading, metric = 'revenue' }: Props) {
  const { bars, max } = useMemo(() => {
    const values = data.map((point) => (metric === 'revenue' ? point.revenue : point.orders));
    const peak = Math.max(...values, 1);
    return {
      max: peak,
      bars: data.map((point) => ({
        date: point.date,
        value: metric === 'revenue' ? point.revenue : point.orders,
        label: metric === 'revenue' ? formatFcfa(point.revenue) : `${point.orders} cmd.`,
      })),
    };
  }, [data, metric]);

  if (loading) {
    return <div className="trend-chart trend-chart--loading">Chargement des tendances…</div>;
  }

  if (bars.length === 0) {
    return (
      <div className="trend-chart trend-chart--empty">
        Aucune commande sur la période. Les ventes apparaîtront ici dès les premières commandes.
      </div>
    );
  }

  return (
    <div className="trend-chart">
      <div className="trend-chart-bars" role="img" aria-label="Graphique des tendances">
        {bars.map((bar) => {
          const height = Math.max(6, Math.round((bar.value / max) * 100));
          return (
            <div key={bar.date} className="trend-bar-col" title={`${formatShortDate(bar.date)} — ${bar.label}`}>
              <div className="trend-bar-value">{metric === 'revenue' ? Math.round(bar.value / 1000) + 'k' : bar.value}</div>
              <div className="trend-bar-track">
                <div className="trend-bar-fill" style={{ height: `${height}%` }} />
              </div>
              <span className="trend-bar-label">{formatShortDate(bar.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
