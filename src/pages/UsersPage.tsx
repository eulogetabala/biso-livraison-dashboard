import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  ChevronDown,
  ChevronUp,
  Phone,
  Search,
  ShieldBan,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import QueryErrorBanner from '../components/QueryErrorBanner';
import EmptyState from '../components/EmptyState';
import TrendChart from '../components/TrendChart';
import PaginationBar from '../components/PaginationBar';
import {
  ADMIN_SET_USER_BLOCKED,
  DAILY_USER_REGISTRATIONS_QUERY,
  searchInputFromStatus,
  USER_STATUS_FILTERS,
  USER_STATISTICS_OVERVIEW_QUERY,
  USERS_PAGINATED_QUERY,
  userDisplayName,
  userInitials,
  userStatusClass,
  userStatusLabel,
  type UserRow,
  type UserStatusFilter,
} from '../graphql/users';
import { rangeFromPreset, type DateRangePreset } from '../lib/format';
import { apolloErrorMessage } from '../lib/apollo-error';
import PaginationBar from '../components/PaginationBar';
import { PAGE_SIZE } from '../lib/pagination';
import type { DailyOrderPoint } from '../graphql/statistics';

const PERIOD_OPTIONS: { id: DateRangePreset; label: string }[] = [
  { id: 'all', label: 'Toute la période' },
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: 'month', label: 'Ce mois' },
  { id: 'year', label: 'Cette année' },
];

function formatJoined(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function UsersPage() {
  const [preset, setPreset] = useState<DateRangePreset>('30d');
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showChart, setShowChart] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const range = useMemo(() => rangeFromPreset(preset), [preset]);

  const listInput = useMemo(
    () => ({
      ...searchInputFromStatus(statusFilter),
      search: search.trim() || undefined,
    }),
    [statusFilter, search],
  );

  const statsQuery = useQuery(USER_STATISTICS_OVERVIEW_QUERY, {
    variables: { range },
    fetchPolicy: 'network-only',
  });
  const dailyQuery = useQuery(DAILY_USER_REGISTRATIONS_QUERY, {
    variables: { range },
    fetchPolicy: 'network-only',
    skip: !showChart,
  });
  const listQuery = useQuery(USERS_PAGINATED_QUERY, {
    variables: { page, limit: PAGE_SIZE, input: listInput },
    fetchPolicy: 'network-only',
  });

  const [setBlocked] = useMutation(ADMIN_SET_USER_BLOCKED);

  const stats = statsQuery.data?.userStatisticsOverview;
  const dailyRaw = dailyQuery.data?.dailyUserRegistrations ?? [];
  const rows: UserRow[] = listQuery.data?.usersPaginated?.items ?? [];
  const pageInfo = listQuery.data?.usersPaginated?.pageInfo;
  const total = pageInfo?.totalItems ?? 0;

  const dailyChart: DailyOrderPoint[] = useMemo(
    () => dailyRaw.map((point) => ({ date: point.date, orders: point.count, revenue: 0 })),
    [dailyRaw],
  );

  const firstError = statsQuery.error ?? listQuery.error;

  function refetchAll() {
    statsQuery.refetch();
    if (showChart) dailyQuery.refetch();
    listQuery.refetch();
  }

  function changeStatusFilter(value: UserStatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function changePreset(next: DateRangePreset) {
    setPreset(next);
    setPage(1);
  }

  async function toggleBlocked(user: UserRow) {
    const nextBlocked = !user.isBlocked;
    const label = nextBlocked ? 'bloquer' : 'débloquer';
    if (!window.confirm(`${nextBlocked ? 'Bloquer' : 'Débloquer'} ${userDisplayName(user)} ?`)) {
      return;
    }

    setTogglingId(user.id);
    setActionError('');
    try {
      await setBlocked({
        variables: { input: { userId: user.id, isBlocked: nextBlocked } },
      });
      await refetchAll();
    } catch (err) {
      setActionError(apolloErrorMessage(err, `Impossible de ${label} l'utilisateur`));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="page-content users-page">
      <PageHeader
        title="Utilisateurs"
        subtitle="Clients inscrits sur l'app mobile — statut OTP et gestion des accès."
        badge={stats?.totalClients ?? total}
      />

      <QueryErrorBanner error={firstError} onRetry={refetchAll} />
      {actionError ? <p className="users-action-error">{actionError}</p> : null}

      <div className="users-overview">
        <div className="stats-grid stats-grid--3">
          <StatCard
            icon={Users}
            label="Clients inscrits"
            value={stats?.totalClients ?? 0}
            loading={statsQuery.loading}
          />
          <StatCard
            icon={UserPlus}
            label="Nouveaux"
            value={stats?.newRegistrations ?? 0}
            hint="Sur la période sélectionnée"
            tone="accent"
            loading={statsQuery.loading}
          />
          <StatCard
            icon={ShieldCheck}
            label="OTP validé"
            value={stats?.verifiedRegistrations ?? 0}
            hint={`${stats?.pendingOtp ?? 0} en attente · ${stats?.blockedClients ?? 0} bloqué(s)`}
            tone="success"
            loading={statsQuery.loading}
          />
        </div>

        <div className="users-period-row">
          <label className="users-period" htmlFor="users-period-select">
            <span className="users-period-label">Période stats</span>
            <select
              id="users-period-select"
              value={preset}
              onChange={(e) => changePreset(e.target.value as DateRangePreset)}
            >
              {PERIOD_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="users-chart-toggle"
            onClick={() => setShowChart((open) => !open)}
            aria-expanded={showChart}
          >
            {showChart ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
            {showChart ? 'Masquer le graphique' : 'Voir les inscriptions'}
          </button>
        </div>

        {showChart ? (
          <div className="users-chart-panel">
            <TrendChart data={dailyChart} loading={dailyQuery.loading} metric="orders" />
          </div>
        ) : null}
      </div>

      <div className="card users-panel">
        <div className="users-toolbar">
          <label className="users-search">
            <Search size={18} aria-hidden className="users-search-icon" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Nom ou téléphone…"
              aria-label="Rechercher un utilisateur"
            />
          </label>

          <div className="users-status-tabs" role="tablist" aria-label="Filtrer par statut">
            {USER_STATUS_FILTERS.map((item) => (
              <button
                key={item.value || 'all'}
                type="button"
                role="tab"
                aria-selected={statusFilter === item.value}
                className={`users-status-tab ${statusFilter === item.value ? 'is-active' : ''}`}
                onClick={() => changeStatusFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <p className="users-list-meta muted">
          {total} client{total > 1 ? 's' : ''}
          {search.trim() ? ` · recherche « ${search.trim()} »` : ''}
        </p>

        <EmptyState
          loading={listQuery.loading && rows.length === 0}
          empty={!listQuery.loading && rows.length === 0}
          emptyTitle="Aucun utilisateur"
          emptyHint="Les inscriptions app apparaîtront ici."
        />

        {!listQuery.loading || rows.length > 0 ? (
          <ul className="users-list">
            {rows.map((row) => (
              <li key={row.id} className={`users-row ${row.isBlocked ? 'users-row--blocked' : ''}`}>
                <div className="users-row-avatar" aria-hidden>
                  {userInitials(row)}
                </div>

                <div className="users-row-main">
                  <div className="users-row-head">
                    <strong>{userDisplayName(row)}</strong>
                    <span className={`users-status-pill users-status-pill--${userStatusClass(row)}`}>
                      {userStatusLabel(row)}
                    </span>
                  </div>
                  <p className="users-row-phone">
                    <Phone size={13} aria-hidden />
                    {row.phone}
                  </p>
                  <p className="users-row-meta muted">Inscrit le {formatJoined(row.createdAt)}</p>
                </div>

                <div className="users-row-action">
                  <button
                    type="button"
                    className={`btn btn-sm ${row.isBlocked ? '' : 'secondary'}`}
                    disabled={togglingId === row.id}
                    onClick={() => toggleBlocked(row)}
                  >
                    {row.isBlocked ? (
                      <>
                        <ShieldCheck size={14} aria-hidden />
                        Débloquer
                      </>
                    ) : (
                      <>
                        <ShieldBan size={14} aria-hidden />
                        Bloquer
                      </>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {pageInfo ? (
          <PaginationBar
            className="users-pagination"
            pageInfo={pageInfo}
            pageSize={PAGE_SIZE}
            loading={listQuery.loading}
            onPageChange={setPage}
          />
        ) : null}
      </div>
    </div>
  );
}
