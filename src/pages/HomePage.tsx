import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import QueryErrorBanner from '../components/QueryErrorBanner';
import { useAuth } from '../auth';
import {
  DAILY_ORDERS_QUERY,
  ORDERS_BY_STATUS_QUERY,
  STATISTICS_OVERVIEW_QUERY,
  TOP_RESTAURANTS_QUERY,
  type DailyOrderPoint,
  type OrderStatusRow,
  type StatisticsOverview,
  type TopRestaurantRow,
} from '../graphql/statistics';
import { HOME_RECENT_ORDERS_QUERY, type HomeRecentOrder } from '../graphql/orders';
import { ACTIVE_DELIVERIES_TRACKING_QUERY } from '../graphql/tracking';
import { formatFcfa, formatShortDate, lastNDaysRange, ORDER_STATUS_LABELS } from '../lib/format';
import { isUnauthorizedError } from '../lib/auth-session';
import { canAccessPath, isAdmin } from '../lib/roles';

const PERIOD_OPTIONS = [7, 14, 30] as const;
type Period = (typeof PERIOD_OPTIONS)[number];

const FLOW_ORDER = ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'DELIVERED', 'CANCELLED'] as const;

function initials(first?: string | null, last?: string | null): string {
  const value = `${(first ?? '').trim().charAt(0)}${(last ?? '').trim().charAt(0)}`.toUpperCase();
  return value || 'BI';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value > 0;
  const down = value < 0;
  if (!up && !down) return <span className="at-delta is-flat">0%</span>;
  return (
    <span className={`at-delta${up ? ' is-up' : ' is-down'}`}>
      {up ? <ArrowUpRight size={13} strokeWidth={2.5} /> : <ArrowDownRight size={13} strokeWidth={2.5} />}
      {up ? '+' : ''}
      {value}%
    </span>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>(14);
  const range = useMemo(() => lastNDaysRange(period), [period]);
  const showTracking = isAdmin(user?.role) && canAccessPath(user?.role, '/tracking');
  const adminView = isAdmin(user?.role);
  const canOpenOrders = canAccessPath(user?.role, '/orders');
  const canOpenRevenue = canAccessPath(user?.role, '/revenue');

  const overviewQuery = useQuery<{ statisticsOverview: StatisticsOverview | null }>(
    STATISTICS_OVERVIEW_QUERY,
    { variables: { range }, fetchPolicy: 'network-only' },
  );
  const dailyQuery = useQuery<{ dailyOrders: DailyOrderPoint[] }>(DAILY_ORDERS_QUERY, {
    variables: { range },
    fetchPolicy: 'network-only',
  });
  const statusQuery = useQuery<{ ordersByStatus: OrderStatusRow[] }>(ORDERS_BY_STATUS_QUERY, {
    variables: { range },
    fetchPolicy: 'network-only',
  });
  const topQuery = useQuery<{ topRestaurants: TopRestaurantRow[] }>(TOP_RESTAURANTS_QUERY, {
    variables: { input: { limit: 4, from: range.from, to: range.to } },
    skip: !canOpenRevenue,
    fetchPolicy: 'network-only',
  });
  const recentQuery = useQuery<{ orders: { items: HomeRecentOrder[] } | null }>(HOME_RECENT_ORDERS_QUERY, {
    skip: !canOpenOrders,
    fetchPolicy: 'network-only',
  });
  const trackingQuery = useQuery(ACTIVE_DELIVERIES_TRACKING_QUERY, {
    skip: !showTracking,
    fetchPolicy: 'network-only',
    pollInterval: showTracking ? 30000 : 0,
  });

  const overview = overviewQuery.data?.statisticsOverview;
  const daily = dailyQuery.data?.dailyOrders ?? [];
  const activeDeliveries = trackingQuery.data?.activeDeliveriesTracking?.length ?? 0;
  const firstError = overviewQuery.error ?? dailyQuery.error;
  const authError = firstError && isUnauthorizedError(firstError);
  const loading = overviewQuery.loading || dailyQuery.loading;

  const greeting = user?.firstName ?? 'équipe';
  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const summary = useMemo(() => {
    const totalRevenue = daily.reduce((sum, p) => sum + p.revenue, 0);
    const totalOrders = daily.reduce((sum, p) => sum + p.orders, 0);
    const bestDay = daily.reduce<DailyOrderPoint | null>(
      (top, p) => (!top || p.revenue > top.revenue ? p : top),
      null,
    );
    const half = Math.floor(daily.length / 2);
    const previous = daily.slice(0, half);
    const current = daily.slice(half);
    const sumKey = (points: DailyOrderPoint[], key: 'revenue' | 'orders') =>
      points.reduce((acc, p) => acc + p[key], 0);
    const percent = (now: number, before: number): number | null => {
      if (before === 0) return now > 0 ? null : 0;
      return Math.round(((now - before) / before) * 100);
    };
    const comparable = half > 0 && current.length > 0;
    const statusMap = Object.fromEntries(
      (statusQuery.data?.ordersByStatus ?? []).map((row) => [row.status, row.count]),
    ) as Record<string, number>;
    const delivered = statusMap.DELIVERED ?? 0;
    const cancelled = statusMap.CANCELLED ?? 0;
    const statusTotal = (statusQuery.data?.ordersByStatus ?? []).reduce((s, r) => s + r.count, 0);

    return {
      totalRevenue,
      totalOrders,
      averageRevenue: daily.length > 0 ? Math.round(totalRevenue / daily.length) : 0,
      averageOrders: daily.length > 0 ? totalOrders / daily.length : 0,
      bestDay: bestDay && bestDay.revenue > 0 ? bestDay : null,
      revenueDelta: comparable ? percent(sumKey(current, 'revenue'), sumKey(previous, 'revenue')) : null,
      ordersDelta: comparable ? percent(sumKey(current, 'orders'), sumKey(previous, 'orders')) : null,
      deliveryRate: statusTotal > 0 ? Math.round((delivered / statusTotal) * 100) : 0,
      cancelRate: statusTotal > 0 ? Math.round((cancelled / statusTotal) * 100) : 0,
      delivered,
      cancelled,
      statusMap,
    };
  }, [daily, statusQuery.data]);

  const peakRevenue = Math.max(...daily.map((d) => d.revenue), 1);
  const flowMax = Math.max(
    1,
    ...FLOW_ORDER.map((status) =>
      status === 'DELIVERING'
        ? (summary.statusMap.DELIVERING ?? 0) + (summary.statusMap.IN_TRANSIT ?? 0)
        : (summary.statusMap[status] ?? 0),
    ),
  );

  const topRestaurants = useMemo(() => {
    const rows = topQuery.data?.topRestaurants ?? [];
    const peak = rows.reduce((max, row) => Math.max(max, row.revenue), 0);
    return rows.map((row, index) => ({
      ...row,
      rank: index + 1,
      share: peak > 0 ? Math.max(14, Math.round((row.revenue / peak) * 100)) : 0,
    }));
  }, [topQuery.data]);

  const recentOrders = recentQuery.data?.orders?.items ?? [];
  const queue = recentOrders.filter((o) => o.status === 'PENDING');
  const focusOrders = (queue.length > 0 ? queue : recentOrders).slice(0, 4);
  const pendingOrders = overview?.pendingOrders ?? queue.length;
  const totalOrders = overview?.totalOrders ?? summary.totalOrders;
  const availableDrivers = overview?.availableDriverProfiles ?? 0;
  const totalDrivers = overview?.totalDriverProfiles ?? 0;
  const aov = overview?.averageOrderValue ?? 0;
  const revenue = overview?.totalRevenue ?? summary.totalRevenue;

  return (
    <div className="at">
      <section className="at-hero">
        <div className="at-hero-copy">
          <p className="at-hero-date">{todayLabel}</p>
          <h1 className="at-hero-title">
            Bonjour,
            <br />
            {greeting}.
          </h1>
          <p className="at-hero-lead">
            {adminView
              ? 'Votre journée commence ici — file, flotte et rythme des ventes.'
              : `Vue restaurant sur ${period} jours.`}
          </p>
        </div>

        <div className="at-hero-side">
          <div className="at-period" role="group" aria-label="Période">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={option === period ? 'is-on' : undefined}
                aria-pressed={option === period}
                onClick={() => setPeriod(option)}
              >
                {option} jours
              </button>
            ))}
          </div>

          {canOpenOrders && pendingOrders > 0 ? (
            <Link to="/orders" className="at-hero-cta">
              <span>
                <strong>{pendingOrders}</strong> commande{pendingOrders > 1 ? 's' : ''} en attente
              </span>
              <em>
                Traiter <ArrowRight size={16} />
              </em>
            </Link>
          ) : (
            <div className="at-hero-calm">
              <i aria-hidden />
              Tout est à jour pour le moment
            </div>
          )}
        </div>
      </section>

      <QueryErrorBanner
        error={firstError}
        onRetry={() => {
          overviewQuery.refetch();
          dailyQuery.refetch();
        }}
      />

      {!authError ? (
        <>
          <section className="at-score" aria-label="Indicateurs clés">
            <div className="at-score-item">
              <span>Chiffre d’affaires</span>
              <strong>{loading ? '…' : formatFcfa(revenue)}</strong>
              <Delta value={summary.revenueDelta} />
            </div>
            <div className="at-score-item">
              <span>Commandes</span>
              <strong>{loading ? '…' : totalOrders}</strong>
              <Delta value={summary.ordersDelta} />
            </div>
            <div className="at-score-item">
              <span>Panier moyen</span>
              <strong className="at-score-sm">{loading ? '…' : formatFcfa(aov)}</strong>
            </div>
            <div className="at-score-item">
              <span>Taux livré</span>
              <strong>{statusQuery.loading ? '…' : `${summary.deliveryRate}%`}</strong>
            </div>
            {showTracking ? (
              <Link to="/tracking" className="at-score-item at-score-item--link">
                <span>En route</span>
                <strong>{trackingQuery.loading ? '…' : activeDeliveries}</strong>
                <em>
                  {availableDrivers}/{totalDrivers} dispo
                </em>
              </Link>
            ) : (
              <div className="at-score-item">
                <span>Rythme</span>
                <strong>{summary.averageOrders.toFixed(1)}</strong>
                <em>/ jour</em>
              </div>
            )}
          </section>

          <section className="at-main">
            <div className="at-panel at-panel--focus">
              <header className="at-panel-head">
                <div>
                  <h2>Focus du moment</h2>
                  <p>
                    {pendingOrders > 0
                      ? 'Ces commandes demandent une action.'
                      : 'Dernière activité récente.'}
                  </p>
                </div>
                {canOpenOrders ? (
                  <Link to="/orders" className="at-text-link">
                    Commandes <ArrowRight size={14} />
                  </Link>
                ) : null}
              </header>

              {!canOpenOrders ? (
                <p className="at-empty">Accès commandes indisponible.</p>
              ) : recentQuery.loading ? (
                <p className="at-empty">Chargement…</p>
              ) : focusOrders.length > 0 ? (
                <ul className="at-focus-list">
                  {focusOrders.map((order) => (
                    <li key={order.id} className={order.status === 'PENDING' ? 'is-hot' : undefined}>
                      <span className="at-focus-av">{initials(order.user?.firstName, order.user?.lastName)}</span>
                      <div className="at-focus-body">
                        <strong>
                          {`${order.user?.firstName ?? ''} ${order.user?.lastName ?? ''}`.trim() ||
                            'Client Biso'}
                        </strong>
                        <small>
                          {order.restaurant?.name ?? 'Restaurant'} · {formatTime(order.createdAt)}
                        </small>
                      </div>
                      <div className="at-focus-meta">
                        <strong>{formatFcfa(order.grandTotal ?? order.total)}</strong>
                        <span>{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="at-empty-block">
                  <p>Aucune commande pour l’instant.</p>
                  <span>Les prochaines apparaîtront ici en priorité.</span>
                </div>
              )}
            </div>

            <div className="at-panel at-panel--trend">
              <header className="at-panel-head">
                <div>
                  <h2>Revenus</h2>
                  <p>
                    Moy. {formatFcfa(summary.averageRevenue)}/j
                    {summary.bestDay ? ` · pic ${formatShortDate(summary.bestDay.date)}` : ''}
                  </p>
                </div>
                {canOpenRevenue ? (
                  <Link to="/revenue" className="at-text-link">
                    Détail <ArrowRight size={14} />
                  </Link>
                ) : null}
              </header>

              {dailyQuery.loading ? (
                <p className="at-empty">Chargement…</p>
              ) : daily.length === 0 ? (
                <p className="at-empty">Pas encore de courbe sur la période.</p>
              ) : (
                <div className="at-bars" role="img" aria-label="Revenus journaliers">
                  {daily.map((point) => {
                    const h = Math.max(8, Math.round((point.revenue / peakRevenue) * 100));
                    return (
                      <div key={point.date} className="at-bar-col" title={`${formatShortDate(point.date)} · ${formatFcfa(point.revenue)}`}>
                        <span className="at-bar" style={{ height: `${h}%` }} />
                        <span className="at-bar-label">{formatShortDate(point.date)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="at-flow" aria-label="Parcours des commandes">
            <header className="at-panel-head">
              <div>
                <h2>Parcours</h2>
                <p>Répartition sur {period} jours</p>
              </div>
            </header>
            {statusQuery.loading ? (
              <p className="at-empty">Chargement…</p>
            ) : (
              <ul className="at-flow-list">
                {FLOW_ORDER.map((status) => {
                  const count =
                    status === 'DELIVERING'
                      ? (summary.statusMap.DELIVERING ?? 0) + (summary.statusMap.IN_TRANSIT ?? 0)
                      : (summary.statusMap[status] ?? 0);
                  const share = Math.round((count / flowMax) * 100);
                  return (
                    <li key={status}>
                      <div className="at-flow-top">
                        <span>{ORDER_STATUS_LABELS[status] ?? status}</span>
                        <strong>{count}</strong>
                      </div>
                      <div className="at-flow-track">
                        <span
                          className={status === 'PENDING' && count > 0 ? 'is-hot' : undefined}
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="at-footer-grid">
            {canOpenRevenue ? (
              <div className="at-panel">
                <header className="at-panel-head">
                  <div>
                    <h2>Top restos</h2>
                    <p>Classement CA</p>
                  </div>
                  <Link to="/revenue" className="at-text-link">
                    Voir <ArrowRight size={14} />
                  </Link>
                </header>
                {topQuery.loading ? (
                  <p className="at-empty">Chargement…</p>
                ) : topRestaurants.length > 0 ? (
                  <ol className="at-rank">
                    {topRestaurants.map((row) => (
                      <li key={row.restaurantId}>
                        <span className="at-rank-n">{row.rank}</span>
                        <div className="at-rank-body">
                          <div className="at-rank-row">
                            <strong>{row.restaurantName}</strong>
                            <span>{formatFcfa(row.revenue)}</span>
                          </div>
                          <div className="at-rank-bar">
                            <i style={{ width: `${row.share}%` }} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="at-empty">Pas encore de classement.</p>
                )}
              </div>
            ) : null}

            <div className="at-panel at-panel--aside">
              <header className="at-panel-head">
                <div>
                  <h2>Réseau</h2>
                  <p>État live</p>
                </div>
              </header>
              <dl className="at-net">
                {adminView ? (
                  <>
                    <div>
                      <dt>Restos actifs</dt>
                      <dd>{loading ? '…' : overview?.activeRestaurants ?? 0}</dd>
                    </div>
                    <div>
                      <dt>Flotte</dt>
                      <dd>
                        {availableDrivers}
                        <small>/{totalDrivers}</small>
                      </dd>
                    </div>
                  </>
                ) : null}
                <div>
                  <dt>Annulations</dt>
                  <dd>{summary.cancelRate}%</dd>
                </div>
                <div>
                  <dt>Cmd / jour</dt>
                  <dd>{summary.averageOrders.toFixed(1)}</dd>
                </div>
              </dl>
              {canOpenOrders ? (
                <Link to="/orders" className="at-solid">
                  Ouvrir les commandes <ArrowRight size={15} />
                </Link>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
