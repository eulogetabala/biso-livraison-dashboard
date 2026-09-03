import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Package, ShoppingBag, TrendingUp, Wallet } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import QueryErrorBanner from '../components/QueryErrorBanner';
import TrendChart from '../components/TrendChart';
import StatusBreakdown from '../components/StatusBreakdown';
import DateRangeFilter from '../components/DateRangeFilter';
import {
  DAILY_ORDERS_QUERY,
  ORDERS_BY_STATUS_QUERY,
  STATISTICS_OVERVIEW_QUERY,
  TOP_RESTAURANTS_QUERY,
} from '../graphql/statistics';
import { formatFcfa, rangeFromPreset, type DateRangePreset } from '../lib/format';

export default function RevenuePage() {
  const [preset, setPreset] = useState<DateRangePreset>('14d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [trendMetric, setTrendMetric] = useState<'revenue' | 'orders'>('revenue');

  const range = useMemo(
    () => rangeFromPreset(preset, preset === 'custom' ? { from: customFrom, to: customTo } : undefined),
    [preset, customFrom, customTo],
  );

  const overviewQuery = useQuery(STATISTICS_OVERVIEW_QUERY, {
    variables: { range },
    fetchPolicy: 'network-only',
  });
  const dailyQuery = useQuery(DAILY_ORDERS_QUERY, {
    variables: { range },
    fetchPolicy: 'network-only',
  });
  const statusQuery = useQuery(ORDERS_BY_STATUS_QUERY, {
    variables: { range },
    fetchPolicy: 'network-only',
  });
  const topQuery = useQuery(TOP_RESTAURANTS_QUERY, {
    variables: { input: { limit: 5, from: range.from, to: range.to } },
    fetchPolicy: 'network-only',
  });

  const overview = overviewQuery.data?.statisticsOverview;
  const daily = dailyQuery.data?.dailyOrders ?? [];
  const statusRows = statusQuery.data?.ordersByStatus ?? [];
  const topRestaurants = topQuery.data?.topRestaurants ?? [];

  const firstError =
    overviewQuery.error ?? dailyQuery.error ?? statusQuery.error ?? topQuery.error;

  const refetchAll = () => {
    overviewQuery.refetch();
    dailyQuery.refetch();
    statusQuery.refetch();
    topQuery.refetch();
  };

  const deliveredCount = statusRows.find((r) => r.status === 'DELIVERED')?.count ?? 0;

  return (
    <>
      <PageHeader
        title="Revenus"
        subtitle="Chiffre d’affaires et tendances de l’app sur la période sélectionnée."
      />

      <QueryErrorBanner error={firstError} onRetry={refetchAll} />

      <SectionCard title="Période" subtitle="Filtrez tous les indicateurs ci-dessous">
        <DateRangeFilter
          preset={preset}
          from={customFrom}
          to={customTo}
          onPresetChange={(next) => {
            setPreset(next);
            if (next === 'custom' && !customFrom) {
              const r = rangeFromPreset('14d');
              setCustomFrom(r.from);
              setCustomTo(r.to);
            }
          }}
          onFromChange={setCustomFrom}
          onToChange={setCustomTo}
        />
      </SectionCard>

      <div className="stats-grid stats-grid--4">
        <StatCard
          icon={Wallet}
          label="Chiffre d’affaires"
          value={formatFcfa(overview?.totalRevenue ?? 0)}
          tone="accent"
          loading={overviewQuery.loading}
        />
        <StatCard
          icon={ShoppingBag}
          label="Commandes"
          value={overview?.totalOrders ?? 0}
          loading={overviewQuery.loading}
        />
        <StatCard
          icon={TrendingUp}
          label="Panier moyen"
          value={formatFcfa(overview?.averageOrderValue ?? 0)}
          loading={overviewQuery.loading}
        />
        <StatCard
          icon={Package}
          label="Livrées"
          value={deliveredCount}
          tone="success"
          loading={statusQuery.loading}
        />
      </div>

      <div className="dashboard-grid-2">
        <SectionCard title="Évolution" subtitle="Revenus ou volume de commandes">
          <div className="trend-toggle">
            <button
              type="button"
              className={trendMetric === 'revenue' ? 'active' : ''}
              onClick={() => setTrendMetric('revenue')}
            >
              Revenus
            </button>
            <button
              type="button"
              className={trendMetric === 'orders' ? 'active' : ''}
              onClick={() => setTrendMetric('orders')}
            >
              Commandes
            </button>
          </div>
          <TrendChart data={daily} loading={dailyQuery.loading} metric={trendMetric} />
        </SectionCard>

        <SectionCard title="Par statut" subtitle="Répartition sur la période">
          <StatusBreakdown rows={statusRows} loading={statusQuery.loading} />
        </SectionCard>
      </div>

      <SectionCard title="Top restaurants" subtitle="Classement par CA sur la période">
        {topQuery.loading ? (
          <p className="muted">Chargement…</p>
        ) : topRestaurants.length === 0 ? (
          <p className="muted">Aucune vente sur cette période.</p>
        ) : (
          <div className="ranking-list">
            {topRestaurants.map((row, index) => (
              <div key={row.restaurantId} className="ranking-row">
                <span className="ranking-rank">{index + 1}</span>
                <div className="ranking-main">
                  <strong>{row.restaurantName}</strong>
                  <span className="muted">{row.orderCount} commande{row.orderCount > 1 ? 's' : ''}</span>
                </div>
                <span className="ranking-value">{formatFcfa(row.revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
