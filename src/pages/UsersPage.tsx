import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { ShieldBan, ShieldCheck, UserPlus, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import QueryErrorBanner from '../components/QueryErrorBanner';
import FilterToolbar from '../components/FilterToolbar';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import TrendChart from '../components/TrendChart';
import {
  ADMIN_SET_USER_BLOCKED,
  DAILY_USER_REGISTRATIONS_QUERY,
  searchInputFromStatus,
  USER_STATUS_FILTERS,
  USER_STATISTICS_OVERVIEW_QUERY,
  USERS_PAGINATED_QUERY,
  userStatusClass,
  userStatusLabel,
  type UserRow,
  type UserStatusFilter,
} from '../graphql/users';
import { rangeFromPreset, type DateRangePreset } from '../lib/format';
import { apolloErrorMessage } from '../lib/apollo-error';
import type { DailyOrderPoint } from '../graphql/statistics';

const LIMIT = 20;

export default function UsersPage() {
  const [preset, setPreset] = useState<DateRangePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const range = useMemo(
    () => rangeFromPreset(preset, preset === 'custom' ? { from: customFrom, to: customTo } : undefined),
    [preset, customFrom, customTo],
  );

  const listInput = useMemo(
    () => ({
      ...searchInputFromStatus(statusFilter),
      ...(range.from ? { from: range.from } : {}),
      ...(range.to ? { to: range.to } : {}),
      search: search.trim() || undefined,
    }),
    [statusFilter, range, search],
  );

  const statsQuery = useQuery(USER_STATISTICS_OVERVIEW_QUERY, {
    variables: { range },
    fetchPolicy: 'network-only',
  });
  const dailyQuery = useQuery(DAILY_USER_REGISTRATIONS_QUERY, {
    variables: { range },
    fetchPolicy: 'network-only',
  });
  const listQuery = useQuery(USERS_PAGINATED_QUERY, {
    variables: { page, limit: LIMIT, input: listInput },
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

  const firstError = statsQuery.error ?? dailyQuery.error ?? listQuery.error;

  function refetchAll() {
    statsQuery.refetch();
    dailyQuery.refetch();
    listQuery.refetch();
  }

  function changeStatusFilter(value: UserStatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function changePreset(next: DateRangePreset) {
    setPreset(next);
    setPage(1);
    if (next === 'custom' && !customFrom) {
      const r = rangeFromPreset('30d');
      setCustomFrom(r.from);
      setCustomTo(r.to);
    }
  }

  async function toggleBlocked(user: UserRow) {
    const nextBlocked = !user.isBlocked;
    const label = nextBlocked ? 'bloquer' : 'débloquer';
    if (!window.confirm(`${nextBlocked ? 'Bloquer' : 'Débloquer'} ${user.firstName} ${user.lastName} ?`)) {
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
    <>
      <PageHeader
        title="Utilisateurs"
        subtitle="Inscriptions app, statut OTP et gestion des comptes bloqués."
        badge={stats?.totalClients ?? total}
      />

      <QueryErrorBanner error={firstError} onRetry={refetchAll} />
      {actionError ? <p className="form-error">{actionError}</p> : null}

      <SectionCard title="Période des statistiques" subtitle="Graphiques et indicateurs">
        <FilterToolbar
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onPresetChange={changePreset}
          onFromChange={(value) => { setCustomFrom(value); setPage(1); }}
          onToChange={(value) => { setCustomTo(value); setPage(1); }}
        />
      </SectionCard>

      <div className="stats-grid stats-grid--4">
        <StatCard
          icon={Users}
          label="Total clients"
          value={stats?.totalClients ?? 0}
          loading={statsQuery.loading}
        />
        <StatCard
          icon={UserPlus}
          label="Nouveaux (période)"
          value={stats?.newRegistrations ?? 0}
          tone="accent"
          loading={statsQuery.loading}
        />
        <StatCard
          icon={ShieldCheck}
          label="OTP validé (période)"
          value={stats?.verifiedRegistrations ?? 0}
          tone="success"
          loading={statsQuery.loading}
        />
        <StatCard
          icon={ShieldBan}
          label="Bloqués / OTP en attente"
          value={`${stats?.blockedClients ?? 0} / ${stats?.pendingOtp ?? 0}`}
          tone="warning"
          loading={statsQuery.loading}
        />
      </div>

      <SectionCard title="Inscriptions" subtitle="Évolution sur la période sélectionnée">
        <TrendChart data={dailyChart} loading={dailyQuery.loading} metric="orders" />
      </SectionCard>

      <SectionCard title="Liste des utilisateurs" subtitle={total > 0 ? `${total} utilisateur${total > 1 ? 's' : ''}` : undefined}>
        <FilterToolbar
          showPeriod={false}
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onPresetChange={changePreset}
          onFromChange={(value) => { setCustomFrom(value); setPage(1); }}
          onToChange={(value) => { setCustomTo(value); setPage(1); }}
          statusFilter={statusFilter}
          statusOptions={USER_STATUS_FILTERS}
          onStatusChange={changeStatusFilter}
        />

        <SearchBar
          value={search}
          onChange={(value) => { setSearch(value); setPage(1); }}
          placeholder="Rechercher par nom ou numéro…"
        />

        <EmptyState
          loading={listQuery.loading && rows.length === 0}
          empty={!listQuery.loading && rows.length === 0}
          emptyTitle="Aucun utilisateur"
          emptyHint="Les inscriptions app apparaîtront ici."
        />

        {!listQuery.loading || rows.length > 0 ? (
          <>
            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Inscription</th>
                    <th>Nom</th>
                    <th>Téléphone</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {new Date(row.createdAt).toLocaleString('fr-FR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td>
                        <strong>{row.firstName} {row.lastName}</strong>
                      </td>
                      <td>{row.phone}</td>
                      <td>
                        <span className={`badge badge--${userStatusClass(row)}`}>
                          {userStatusLabel(row)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${row.isBlocked ? 'secondary' : 'danger'}`}
                          disabled={togglingId === row.id}
                          onClick={() => toggleBlocked(row)}
                        >
                          {row.isBlocked ? 'Débloquer' : 'Bloquer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pageInfo && pageInfo.totalPages > 1 ? (
              <div className="pagination-bar">
                <button
                  type="button"
                  className="btn secondary btn-sm"
                  disabled={!pageInfo.hasPreviousPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </button>
                <span className="muted">
                  Page {pageInfo.currentPage} / {pageInfo.totalPages}
                </span>
                <button
                  type="button"
                  className="btn secondary btn-sm"
                  disabled={!pageInfo.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </SectionCard>
    </>
  );
}
