import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  ArrowRight,
  Bike,
  ClipboardList,
  MapPin,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
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
  {
    to: '/orders',
    icon: ShoppingBag,
    title: 'Commandes',
    text: 'Repas et produits — confirmer, assigner un livreur',
    tone: 'orders',
  },
  {
    to: '/parcels',
    icon: Package,
    title: 'Colis',
    text: 'Expéditions colis séparées des commandes',
    tone: 'parcels',
    adminOnly: true,
  },
  {
    to: '/tracking',
    icon: MapPin,
    title: 'Suivi livraisons',
    text: 'Carte temps réel des livreurs en course',
    tone: 'tracking',
    adminOnly: true,
  },
  {
    to: '/revenue',
    icon: Wallet,
    title: 'Revenus',
    text: 'Analyses détaillées, filtres et top restos',
    tone: 'revenue',
  },
  {
    to: '/drivers',
    icon: Bike,
    title: 'Livreurs',
    text: 'Flotte et disponibilité en temps réel',
    tone: 'drivers',
    adminOnly: true,
  },
  {
    to: '/users',
    icon: Users,
    title: 'Utilisateurs',
    text: 'Inscriptions app, OTP et comptes bloqués',
    tone: 'users',
    adminOnly: true,
  },
  {
    to: '/restaurants',
    icon: UtensilsCrossed,
    title: 'Catalogue',
    text: 'Restaurants, menus et produits app',
    tone: 'catalog',
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const range = useMemo(() => lastNDaysRange(14), []);
  const hubLinks = filterByRole(HUB_LINKS, user?.role);
  const showTracking = isAdmin(user?.role) && canAccessPath(user?.role, '/tracking');

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

  const greeting = user?.firstName ? `Bonjour, ${user.firstName}` : 'Tableau de bord';
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="dashboard-home">
      <header className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-hero-eyebrow">{today}</p>
          <h1 className="dashboard-hero-title">{greeting}</h1>
          <p className="dashboard-hero-subtitle">
            {isAdmin(user?.role)
              ? 'Vue synthétique des 14 derniers jours. Le détail financier est sur la page Revenus.'
              : 'Vue synthétique de votre restaurant — 14 derniers jours.'}
          </p>
        </div>

        {!authError ? (
          <div className="dashboard-hero-kpis">
            <article className="dashboard-hero-kpi dashboard-hero-kpi--accent">
              <span className="dashboard-hero-kpi-label">Chiffre d&apos;affaires</span>
              <strong>{overviewQuery.loading ? '…' : formatFcfa(overview?.totalRevenue ?? 0)}</strong>
              <span className="dashboard-hero-kpi-hint">14 derniers jours</span>
            </article>
            <article className="dashboard-hero-kpi">
              <span className="dashboard-hero-kpi-label">Commandes</span>
              <strong>{overviewQuery.loading ? '…' : overview?.totalOrders ?? 0}</strong>
            </article>
            <article className="dashboard-hero-kpi">
              <span className="dashboard-hero-kpi-label">En attente</span>
              <strong>{overviewQuery.loading ? '…' : overview?.pendingOrders ?? 0}</strong>
            </article>
            {showTracking ? (
              <Link to="/tracking" className="dashboard-hero-kpi dashboard-hero-kpi--link">
                <span className="dashboard-hero-kpi-label">Livraisons actives</span>
                <strong>{trackingQuery.loading ? '…' : activeDeliveries}</strong>
                <span className="dashboard-hero-kpi-hint">Suivi carte →</span>
              </Link>
            ) : null}
            {isAdmin(user?.role) ? (
              <article className="dashboard-hero-kpi">
                <span className="dashboard-hero-kpi-label">Livreurs dispo</span>
                <strong>
                  {overviewQuery.loading
                    ? '…'
                    : `${overview?.availableDriverProfiles ?? 0}/${overview?.totalDriverProfiles ?? 0}`}
                </strong>
              </article>
            ) : null}
          </div>
        ) : null}
      </header>

      <QueryErrorBanner
        error={firstError}
        onRetry={() => {
          overviewQuery.refetch();
          dailyQuery.refetch();
        }}
      />

      {!authError ? (
        <>
          <section className="dashboard-chart-panel">
            <div className="dashboard-chart-head">
              <div>
                <h2>Évolution du chiffre d&apos;affaires</h2>
                <p className="muted">Revenus quotidiens — 14 jours</p>
              </div>
              <Link to="/revenue" className="dashboard-chart-link">
                Analyse complète
                <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            <TrendChart data={daily} loading={dailyQuery.loading} metric="revenue" />
            <div className="dashboard-chart-foot">
              <div className="dashboard-chart-stat">
                <TrendingUp size={18} aria-hidden />
                <span>
                  Panier moyen{' '}
                  <strong>{formatFcfa(overview?.averageOrderValue ?? 0)}</strong>
                </span>
              </div>
              <Link to="/orders" className="btn secondary btn-sm">
                Voir les commandes
              </Link>
            </div>
          </section>

          <section className="dashboard-hub">
            <h2 className="dashboard-hub-title">Accès rapide</h2>
            <div className="dashboard-hub-grid">
              {hubLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to} className={`dashboard-hub-card dashboard-hub-card--${item.tone}`}>
                    <span className="dashboard-hub-icon" aria-hidden>
                      <Icon size={22} strokeWidth={2} />
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.text}</p>
                    </div>
                    <ArrowRight size={18} className="dashboard-hub-arrow" aria-hidden />
                  </Link>
                );
              })}
            </div>
          </section>

          <p className="dashboard-footnote muted">
            <ClipboardList size={14} aria-hidden />
            {isAdmin(user?.role)
              ? 'Menus, produits, bannières et cuisines restent accessibles depuis le menu latéral.'
              : 'Gérez vos menus et votre fiche restaurant depuis le menu latéral.'}
          </p>
        </>
      ) : null}
    </div>
  );
}
