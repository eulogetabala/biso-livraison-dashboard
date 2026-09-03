import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import EmptyState from '../components/EmptyState';
import QueryErrorBanner from '../components/QueryErrorBanner';
import FilterToolbar from '../components/FilterToolbar';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import AssignParcelDriverModal from '../components/AssignParcelDriverModal';
import {
  nextParcelAction,
  PARCEL_STATUS_FILTERS,
  PARCEL_STATUS_LABELS,
  PARCELS_QUERY,
  UPDATE_PARCEL_STATUS,
  type ParcelRow,
} from '../graphql/parcels';
import { rangeFromPreset, type DateRangePreset } from '../lib/format';
import { apolloErrorMessage } from '../lib/apollo-error';

const LIMIT = 20;

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'warning',
  PICKED_UP: 'accent',
  IN_TRANSIT: 'default',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

export default function ParcelsPage() {
  const [preset, setPreset] = useState<DateRangePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [detailParcel, setDetailParcel] = useState<ParcelRow | null>(null);
  const [assignParcel, setAssignParcel] = useState<ParcelRow | null>(null);
  const [actionError, setActionError] = useState('');

  const range = useMemo(
    () => rangeFromPreset(preset, preset === 'custom' ? { from: customFrom, to: customTo } : undefined),
    [preset, customFrom, customTo],
  );

  const input = useMemo(() => {
    const value: { status?: string; from?: string; to?: string } = {};
    if (statusFilter) value.status = statusFilter;
    if (range.from) value.from = range.from;
    if (range.to) value.to = range.to;
    return Object.keys(value).length > 0 ? value : undefined;
  }, [statusFilter, range]);

  const { data, loading, error, refetch } = useQuery(PARCELS_QUERY, {
    variables: { page, limit: LIMIT, input },
    fetchPolicy: 'network-only',
  });

  const [updateStatus, { loading: updating }] = useMutation(UPDATE_PARCEL_STATUS);

  const rows: ParcelRow[] = data?.parcels?.items ?? [];
  const pageInfo = data?.parcels?.pageInfo;
  const total = pageInfo?.totalItems ?? 0;

  function changePreset(value: DateRangePreset) {
    setPreset(value);
    setPage(1);
  }

  function changeFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  async function handleAdvance(parcel: ParcelRow) {
    const next = nextParcelAction(parcel.status);
    if (!next) return;
    setActionError('');
    try {
      await updateStatus({
        variables: { input: { id: parcel.id, status: next.status } },
      });
      await refetch();
      if (detailParcel?.id === parcel.id) {
        setDetailParcel({ ...parcel, status: next.status });
      }
    } catch (err) {
      setActionError(apolloErrorMessage(err));
    }
  }

  async function handleCancel(parcel: ParcelRow) {
    if (!window.confirm('Annuler cette expédition colis ?')) return;
    setActionError('');
    try {
      await updateStatus({
        variables: { input: { id: parcel.id, status: 'CANCELLED' } },
      });
      await refetch();
      setDetailParcel(null);
    } catch (err) {
      setActionError(apolloErrorMessage(err));
    }
  }

  function canAssign(parcel: ParcelRow) {
    return (
      !parcel.delivery &&
      parcel.status !== 'CANCELLED' &&
      parcel.status !== 'DELIVERED'
    );
  }

  function isActiveDelivery(parcel: ParcelRow) {
    const status = parcel.delivery?.status;
    return status === 'ASSIGNED' || status === 'PICKED_UP' || status === 'IN_TRANSIT';
  }

  return (
    <>
      <PageHeader
        title="Colis"
        subtitle="Expéditions colis séparées des commandes repas et produits — validation et suivi admin."
        badge={total}
      />

      <QueryErrorBanner error={error} onRetry={() => refetch()} />
      {actionError ? <p className="form-error">{actionError}</p> : null}

      <SectionCard
        title="Liste des colis"
        subtitle={total > 0 ? `${total} colis` : 'Aucun colis pour ces critères'}
      >
        <FilterToolbar
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onPresetChange={changePreset}
          onFromChange={(value) => { setCustomFrom(value); setPage(1); }}
          onToChange={(value) => { setCustomTo(value); setPage(1); }}
          statusFilter={statusFilter}
          statusOptions={PARCEL_STATUS_FILTERS}
          onStatusChange={changeFilter}
        />

        <EmptyState
          loading={loading && rows.length === 0}
          empty={!loading && rows.length === 0}
          emptyTitle="Aucun colis"
          emptyHint="Les demandes d'expédition colis apparaîtront ici."
        />

        {!loading || rows.length > 0 ? (
          <>
            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Expéditeur</th>
                    <th>Destinataire</th>
                    <th>Adresse livraison</th>
                    <th>Livreur</th>
                    <th>Statut</th>
                    <th>Poids</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const next = nextParcelAction(row.status);
                    return (
                      <tr key={row.id}>
                        <td>
                          {new Date(row.createdAt).toLocaleString('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td>
                          {row.sender ? `${row.sender.firstName} ${row.sender.lastName}` : '—'}
                          {row.sender?.phone ? (
                            <span className="muted orders-sub">{row.sender.phone}</span>
                          ) : null}
                        </td>
                        <td>
                          {row.receiverName}
                          <span className="muted orders-sub">{row.receiverPhone}</span>
                        </td>
                        <td className="parcels-address">{row.receiverAddress}</td>
                        <td>
                          {row.delivery?.driver ? (
                            <span className="orders-driver-assigned">
                              {row.delivery.driver.firstName} {row.delivery.driver.lastName}
                            </span>
                          ) : canAssign(row) ? (
                            <button
                              type="button"
                              className="orders-assign-driver-btn"
                              disabled={updating}
                              onClick={() => setAssignParcel(row)}
                            >
                              Assigner un livreur
                            </button>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge--${STATUS_CLASS[row.status] ?? 'default'}`}>
                            {PARCEL_STATUS_LABELS[row.status] ?? row.status}
                          </span>
                        </td>
                        <td>{row.weight > 0 ? `${row.weight} kg` : '—'}</td>
                        <td>
                          <div className="orders-actions">
                            {isActiveDelivery(row) && row.delivery ? (
                              <Link
                                to={`/tracking?delivery=${row.delivery.id}`}
                                className="btn secondary btn-sm"
                              >
                                Carte
                              </Link>
                            ) : null}
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => setDetailParcel(row)}
                            >
                              Détail
                            </button>
                            {next ? (
                              <button
                                type="button"
                                className="btn btn-sm"
                                disabled={updating}
                                onClick={() => handleAdvance(row)}
                              >
                                {next.label}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      <Modal
        open={detailParcel != null}
        onClose={() => setDetailParcel(null)}
        title="Détail colis"
        subtitle={detailParcel ? `#${detailParcel.id.slice(0, 8).toUpperCase()}` : undefined}
        wide
        footer={
          detailParcel ? (
            <div className="modal-footer-actions">
              {nextParcelAction(detailParcel.status) ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={updating}
                  onClick={() => handleAdvance(detailParcel)}
                >
                  {nextParcelAction(detailParcel.status)!.label}
                </button>
              ) : null}
              {canAssign(detailParcel) ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={updating}
                  onClick={() => {
                    setAssignParcel(detailParcel);
                    setDetailParcel(null);
                  }}
                >
                  Assigner un livreur
                </button>
              ) : null}
              {detailParcel.delivery?.driver ? (
                <p className="orders-driver-assigned-block">
                  Livreur assigné :{' '}
                  <strong>
                    {detailParcel.delivery.driver.firstName} {detailParcel.delivery.driver.lastName}
                  </strong>{' '}
                  ({detailParcel.delivery.driver.phone})
                </p>
              ) : null}
              {isActiveDelivery(detailParcel) && detailParcel.delivery ? (
                <Link
                  to={`/tracking?delivery=${detailParcel.delivery.id}`}
                  className="btn btn-sm orders-tracking-link"
                  onClick={() => setDetailParcel(null)}
                >
                  Voir sur la carte
                </Link>
              ) : null}
              {detailParcel.status === 'PENDING' && !detailParcel.delivery ? (
                <button
                  type="button"
                  className="btn danger btn-sm"
                  disabled={updating}
                  onClick={() => handleCancel(detailParcel)}
                >
                  Annuler
                </button>
              ) : null}
              <button type="button" className="btn secondary btn-sm" onClick={() => setDetailParcel(null)}>
                Fermer
              </button>
            </div>
          ) : undefined
        }
      >
        {detailParcel ? (
          <div className="order-detail">
            <div className="order-detail-grid">
              <div>
                <strong>Expéditeur</strong>
                <p>
                  {detailParcel.sender
                    ? `${detailParcel.sender.firstName} ${detailParcel.sender.lastName}`
                    : '—'}
                </p>
                <p className="muted">{detailParcel.sender?.phone}</p>
              </div>
              <div>
                <strong>Destinataire</strong>
                <p>{detailParcel.receiverName}</p>
                <p className="muted">{detailParcel.receiverPhone}</p>
              </div>
              <div>
                <strong>Adresse de livraison</strong>
                <p>{detailParcel.receiverAddress}</p>
              </div>
              <div>
                <strong>Statut</strong>
                <p>{PARCEL_STATUS_LABELS[detailParcel.status] ?? detailParcel.status}</p>
              </div>
            </div>
            {detailParcel.description ? (
              <>
                <strong>Détails du colis</strong>
                <p className="parcels-description">{detailParcel.description}</p>
              </>
            ) : null}
            <div className="order-detail-totals">
              <span>Poids estimé</span>
              <strong>{detailParcel.weight > 0 ? `${detailParcel.weight} kg` : '—'}</strong>
            </div>
          </div>
        ) : null}
      </Modal>

      <AssignParcelDriverModal
        parcel={assignParcel}
        open={assignParcel != null}
        onClose={() => setAssignParcel(null)}
        onAssigned={() => refetch()}
      />
    </>
  );
}
