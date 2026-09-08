import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import QueryErrorBanner from '../components/QueryErrorBanner';
import TrendChart from '../components/TrendChart';
import { useAuth } from '../auth';
import {
  DAILY_ORDERS_QUERY,
  STATISTICS_OVERVIEW_QUERY,
} from '../graphql/statistics';
import { ACTIVE_DELIVERIES_TRACKING_QUERY } from '../graphql/tracking';
import { formatFcfa, lastNDaysRange } from '../lib/format';
import { isUnauthorizedError } from '../lib/auth-session';
import { canAccessPath, filterByRole, isAdmin } from '../lib/roles';

const HUB_LINKS = [
  { to: '/orders', title: 'Commandes', text: 'Confirmer et assigner', tone: 'orders' },
  { to: '/parcels', title: 'Colis', text: 'Expéditions standalone', tone: 'parcels', adminOnly: true },
  { to: '/tracking', title: 'Suivi live', text: 'Carte des livreurs', tone: 'tracking', adminOnly: true },
  { to: '/revenue', title: 'Revenus', text: 'Analyses détaillées', tone: 'revenue' },
  { to: '/drivers', title: 'Livreurs', text: 'Flotte & dispo', tone: 'drivers', adminOnly: true },
  { to: '/users', title: 'Utilisateurs', text: 'Comptes & OTP', tone: 'users', adminOnly: true },
  { to: '/restaurants', title: 'Catalogue', text: 'Menus & produits', tone: 'catalog' },
];

export default function HomePage() {
  const { user } = useAuth();
  const range = useMemo(() => lastNDaysRange(14), []);
  const hubLinks = filterByRole(HUB_LINKS, user?.role);
  const showTracking = isAdmin(user?.role) && canAccessPath(user?.role, '/tracking');
  const adminView = isAdmin(user?.role);

  const overviewQuery = useQuery(STATISTICS_OVERVIEW_QUERY, {
    variables: { range },
    fetchPolicy: 'network-only',
  });
  const dailyQuery = useQuery(DAILY_ORDERS_QUERY, {
    variables: { range },
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

  const greeting = user?.firstName ?? 'Bienvenue';
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const sparkline = useMemo(() => {
    const slice = daily.slice(-7);
    if (slice.length === 0) return [];
    const peak = Math.max(...slice.map((p) => p.revenue), 1);
    return slice.map((p) => ({ ...p, height: Math.max(12, Math.round((p.revenue / peak) * 100)) }));
  }, [daily]);

  const pendingOrders = overview?.pendingOrders ?? 0;

  return (
    <div className="home-page">
      <section className="home-deck" aria-label="Vue d'ensemble">
        <div className="home-deck-orbs" aria-hidden>
          <span className="home-deck-orb home-deck-orb--orange" />
          <span className="home-deck-orb home-deck-orb--blue" />
        </div>

        <div className="home-deck-header">
          <div className="home-deck-intro">
            <p className="home-deck-date">{today}</p>
            <h1 className="home-deck-title">
              Bonjour, <em>{greeting}</em>
            </h1>
            <p className="home-deck-lead">
              {adminView
                ? 'Votre centre de pilotage Biso — ventes, livraisons et catalogue.'
                : 'Activité de votre restaurant sur les 14 derniers jours.'}
            </p>
          </div>

          {!loading && pendingOrders > 0 ? (
            <Link to="/orders" className="home-deck-alert">
              <span className="home-deck-alert-count">{pendingOrders}</span>
              <span>
                commande{pendingOrders > 1 ? 's' : ''} en attente
                <small>Traiter maintenant →</small>
              </span>
            </Link>
          ) : (
            <div className="home-deck-badge">
              <span className="home-deck-badge-dot" aria-hidden />
              Sync live
            </div>
          )}
        </div>

        {!authError ? (
          <div className="home-deck-metrics">
            <article className="home-metric home-metric--hero">
              <p className="home-metric-label">Chiffre d&apos;affaires</p>
              <p className="home-metric-value">{loading ? '…' : formatFcfa(overview?.totalRevenue ?? 0)}</p>
              <p className="home-metric-hint">14 derniers jours</p>
              {sparkline.length > 0 ? (
                <div className="home-sparkline" aria-hidden>
                  {sparkline.map((bar) => (
                    <span key={bar.date} className="home-sparkline-bar" style={{ height: `${bar.height}%` }} />
                  ))}
                </div>
              ) : null}
            </article>

            <article className="home-metric">
              <p className="home-metric-label">Commandes</p>
              <p className="home-metric-value">{loading ? '…' : overview?.totalOrders ?? 0}</p>
            </article>

            <article className="home-metric">
              <p className="home-metric-label">Panier moyen</p>
              <p className="home-metric-value home-metric-value--compact">
                {loading ? '…' : formatFcfa(overview?.averageOrderValue ?? 0)}
              </p>
            </article>

            {showTracking ? (
              <Link to="/tracking" className="home-metric home-metric--link">
                <p className="home-metric-label">En livraison</p>
                <p className="home-metric-value">{trackingQuery.loading ? '…' : activeDeliveries}</p>
                <span className="home-metric-link">Carte →</span>
              </Link>
            ) : null}

            {adminView ? (
              <article className="home-metric">
                <p className="home-metric-label">Livreurs prêts</p>
                <p className="home-metric-value home-metric-value--compact">
                  {loading ? '…' : `${overview?.availableDriverProfiles ?? 0} / ${overview?.totalDriverProfiles ?? 0}`}
                </p>
              </article>
            ) : null}
          </div>
        ) : null}
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
          <section className="home-main">
            <article className="home-chart-panel">
              <header className="home-panel-head">
                <div>
                  <h2>Tendance des revenus</h2>
                  <p>Performance quotidienne</p>
                </div>
                <Link to="/revenue" className="home-panel-cta">
                  Analyse →
                </Link>
              </header>
              <TrendChart data={daily} loading={dailyQuery.loading} metric="revenue" />
              <footer className="home-chart-footer">
                <Link to="/orders" className="btn secondary btn-sm">
                  Voir les commandes
                </Link>
              </footer>
            </article>

            <aside className="home-pulse">
              <h2 className="home-pulse-title">En ce moment</h2>
              <div className="home-pulse-grid">
                <div className="home-pulse-item">
                  <span>En attente</span>
                  <strong>{loading ? '…' : pendingOrders}</strong>
                </div>
                <div className="home-pulse-item">
                  <span>Commandes</span>
                  <strong>{loading ? '…' : overview?.totalOrders ?? 0}</strong>
                </div>
                {showTracking ? (
                  <div className="home-pulse-item home-pulse-item--accent">
                    <span>Courses live</span>
                    <strong>{trackingQuery.loading ? '…' : activeDeliveries}</strong>
                  </div>
                ) : null}
                {adminView ? (
                  <div className="home-pulse-item">
                    <span>Restos actifs</span>
                    <strong>{loading ? '…' : overview?.activeRestaurants ?? 0}</strong>
                  </div>
                ) : null}
              </div>
              {showTracking && activeDeliveries > 0 ? (
                <Link to="/tracking" className="home-pulse-action">
                  Ouvrir le suivi carte
                </Link>
              ) : null}
            </aside>
          </section>

          <section className="home-mosaic">
            <header className="home-mosaic-head">
              <h2>Raccourcis</h2>
              <p>Accédez aux espaces clés en un clic</p>
            </header>
            <div className="home-mosaic-grid">
              {hubLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`home-tile home-tile--${item.tone}`}
                >
                  <span className="home-tile-shine" aria-hidden />
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                  <em>Ouvrir</em>
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
