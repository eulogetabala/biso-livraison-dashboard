import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import EmptyState from '../components/EmptyState';
import QueryErrorBanner from '../components/QueryErrorBanner';
import FilterToolbar from '../components/FilterToolbar';
import Modal from '../components/Modal';
import AssignDriverModal from '../components/AssignDriverModal';
import {
  CANCEL_ORDER,
  ORDER_STATUS_FILTERS,
  ORDER_TYPE_FILTERS,
  ORDERS_QUERY,
  UPDATE_ORDER_STATUS,
  type OrderRow,
} from '../graphql/orders';
import { formatFcfa, ORDER_STATUS_LABELS, rangeFromPreset, type DateRangePreset } from '../lib/format';
import { apolloErrorMessage } from '../lib/apollo-error';

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'warning',
  CONFIRMED: 'accent',
  PREPARING: 'accent',
  IN_TRANSIT: 'default',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

const LIMIT = 20;

function isActiveDelivery(order: OrderRow) {
  const status = order.delivery?.status;
  return status === 'ASSIGNED' || status === 'PICKED_UP' || status === 'IN_TRANSIT';
}

export default function OrdersPage() {
  const [preset, setPreset] = useState<DateRangePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [assignOrder, setAssignOrder] = useState<OrderRow | null>(null);
  const [actionError, setActionError] = useState('');

  const range = useMemo(
    () => rangeFromPreset(preset, preset === 'custom' ? { from: customFrom, to: customTo } : undefined),
    [preset, customFrom, customTo],
  );

  const input = useMemo(() => {
    const value: { status?: string; restaurantType?: string; from?: string; to?: string } = {};
    if (statusFilter) value.status = statusFilter;
    if (typeFilter) value.restaurantType = typeFilter;
    if (range.from) value.from = range.from;
    if (range.to) value.to = range.to;
    return Object.keys(value).length > 0 ? value : undefined;
  }, [statusFilter, typeFilter, range]);

  const { data, loading, error, refetch } = useQuery(ORDERS_QUERY, {
    variables: { page, limit: LIMIT, input },
    fetchPolicy: 'network-only',
  });

  const [updateStatus, { loading: updating }] = useMutation(UPDATE_ORDER_STATUS);
  const [cancelOrder, { loading: cancelling }] = useMutation(CANCEL_ORDER);

  const rows: OrderRow[] = data?.orders?.items ?? [];
  const pageInfo = data?.orders?.pageInfo;
  const total = pageInfo?.totalItems ?? 0;
  const busy = updating || cancelling;

  function changePreset(value: DateRangePreset) {
    setPreset(value);
    setPage(1);
  }

  function changeFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function changeTypeFilter(value: string) {
    setTypeFilter(value);
    setPage(1);
  }

  async function handleConfirm(order: OrderRow) {
    setActionError('');
    try {
      await updateStatus({
        variables: { input: { id: order.id, status: 'CONFIRMED' } },
      });
      await refetch();
      if (detailOrder?.id === order.id) {
        setDetailOrder({ ...order, status: 'CONFIRMED' });
      }
    } catch (err) {
      setActionError(apolloErrorMessage(err));
    }
  }

  async function handleCancel(order: OrderRow) {
    if (!window.confirm('Annuler cette commande ?')) return;
    setActionError('');
    try {
      await cancelOrder({ variables: { id: order.id } });
      await refetch();
      setDetailOrder(null);
    } catch (err) {
      setActionError(apolloErrorMessage(err));
    }
  }

  function canAssign(order: OrderRow) {
    return !order.delivery && order.status !== 'CANCELLED' && order.status !== 'DELIVERED';
  }

  function canConfirm(order: OrderRow) {
    return order.status === 'PENDING';
  }

  function canCancel(order: OrderRow) {
    return order.status !== 'CANCELLED' && order.status !== 'DELIVERED';
  }

  return (
    <>
      <PageHeader
        title="Commandes repas & produits"
        subtitle="Restaurants et produits simples — confirmer, annuler et assigner un livreur."
        badge={total}
      />

      <QueryErrorBanner error={error} onRetry={() => refetch()} />
      {actionError ? <p className="form-error">{actionError}</p> : null}

      <SectionCard
        title="Liste des commandes"
        subtitle={total > 0 ? `${total} commande${total > 1 ? 's' : ''}` : 'Aucune commande pour ces critères'}
      >
        <FilterToolbar
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onPresetChange={changePreset}
          onFromChange={(value) => { setCustomFrom(value); setPage(1); }}
          onToChange={(value) => { setCustomTo(value); setPage(1); }}
          typeFilter={typeFilter}
          typeOptions={ORDER_TYPE_FILTERS}
          onTypeChange={changeTypeFilter}
          statusFilter={statusFilter}
          statusOptions={ORDER_STATUS_FILTERS}
          onStatusChange={changeFilter}
        />

        <EmptyState
          loading={loading && rows.length === 0}
          empty={!loading && rows.length === 0}
          emptyTitle="Aucune commande"
          emptyHint="Les commandes passées depuis l’app apparaîtront ici."
        />

        {!loading || rows.length > 0 ? (
          <>
            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Source</th>
                    <th>Livreur</th>
                    <th>Statut</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{new Date(row.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>
                        {row.user ? `${row.user.firstName} ${row.user.lastName}` : '—'}
                        {row.user?.phone ? <span className="muted orders-sub">{row.user.phone}</span> : null}
                      </td>
                      <td>
                        <span className={`badge badge--${row.restaurant?.type === 'MARKET' ? 'accent' : 'default'}`}>
                          {row.restaurant?.type === 'MARKET' ? 'Produit' : 'Repas'}
                        </span>
                      </td>
                      <td>{row.restaurant?.name ?? '—'}</td>
                      <td>
                        {row.delivery?.driver ? (
                          <span className="orders-driver-assigned">
                            {row.delivery.driver.firstName} {row.delivery.driver.lastName}
                          </span>
                        ) : canAssign(row) ? (
                          <button
                            type="button"
                            className="orders-assign-driver-btn"
                            disabled={busy}
                            onClick={() => setAssignOrder(row)}
                          >
                            Assigner un livreur
                          </button>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge--${STATUS_CLASS[row.status] ?? 'default'}`}>
                          {ORDER_STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="orders-total">{formatFcfa(row.grandTotal)}</td>
                      <td>
                        <div className="orders-actions">
                          {isActiveDelivery(row) ? (
                            <Link
                              to={`/tracking?delivery=${row.delivery!.id}`}
                              className="btn secondary btn-sm"
                            >
                              Carte
                            </Link>
                          ) : null}
                          <button type="button" className="btn secondary btn-sm" onClick={() => setDetailOrder(row)}>
                            Détail
                          </button>
                          {canConfirm(row) ? (
                            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => handleConfirm(row)}>
                              Confirmer
                            </button>
                          ) : null}
                        </div>
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

      <Modal
        open={detailOrder != null}
        onClose={() => setDetailOrder(null)}
        title="Détail commande"
        subtitle={detailOrder ? `#${detailOrder.id.slice(0, 8).toUpperCase()}` : undefined}
        wide
        footer={
          detailOrder ? (
            <div className="modal-footer-actions">
              {canConfirm(detailOrder) ? (
                <button type="button" className="btn btn-sm" disabled={busy} onClick={() => handleConfirm(detailOrder)}>
                  Confirmer
                </button>
              ) : null}
              {canAssign(detailOrder) ? (
                <button type="button" className="btn btn-sm" disabled={busy} onClick={() => { setAssignOrder(detailOrder); setDetailOrder(null); }}>
                  Assigner un livreur
                </button>
              ) : null}
              {canCancel(detailOrder) ? (
                <button type="button" className="btn danger btn-sm" disabled={busy} onClick={() => handleCancel(detailOrder)}>
                  Annuler
                </button>
              ) : null}
              <button type="button" className="btn secondary btn-sm" onClick={() => setDetailOrder(null)}>
                Fermer
              </button>
            </div>
          ) : undefined
        }
      >
        {detailOrder ? (
          <div className="order-detail">
            <div className="order-detail-grid">
              <div>
                <strong>Client</strong>
                <p>{detailOrder.user ? `${detailOrder.user.firstName} ${detailOrder.user.lastName}` : '—'}</p>
                <p className="muted">{detailOrder.user?.phone}</p>
              </div>
              <div>
                <strong>Source</strong>
                <p>{detailOrder.restaurant?.name ?? '—'}</p>
                <p className="muted">
                  {detailOrder.restaurant?.type === 'MARKET' ? 'Produit simple' : 'Restaurant / repas'}
                </p>
              </div>
              <div>
                <strong>Livraison</strong>
                <p>{detailOrder.deliveryAddress}</p>
                <p className="muted">{detailOrder.deliveryCity} {detailOrder.deliveryZipCode}</p>
              </div>
              <div>
                <strong>Statut</strong>
                <p>{ORDER_STATUS_LABELS[detailOrder.status] ?? detailOrder.status}</p>
              </div>
            </div>

            <strong>Articles</strong>
            <ul className="order-items-list">
              {detailOrder.items.map((item, index) => (
                <li key={`${item.menuItem?.id ?? index}`}>
                  {item.quantity}× {item.menuItem?.name ?? 'Article'} — {formatFcfa(item.unitPrice * item.quantity)}
                </li>
              ))}
            </ul>

            <div className="order-detail-totals">
              <span>Sous-total + livraison</span>
              <strong>{formatFcfa(detailOrder.grandTotal)}</strong>
            </div>

            {detailOrder.delivery?.driver ? (
              <>
                <p className="orders-driver-assigned-block">
                  Livreur assigné :{' '}
                  <strong>
                    {detailOrder.delivery.driver.firstName} {detailOrder.delivery.driver.lastName}
                  </strong>{' '}
                  ({detailOrder.delivery.driver.phone})
                </p>
                {isActiveDelivery(detailOrder) ? (
                  <Link
                    to={`/tracking?delivery=${detailOrder.delivery.id}`}
                    className="btn btn-sm orders-tracking-link"
                    onClick={() => setDetailOrder(null)}
                  >
                    Voir sur la carte
                  </Link>
                ) : null}
              </>
            ) : canAssign(detailOrder) ? (
              <button
                type="button"
                className="orders-assign-driver-btn orders-assign-driver-btn--block"
                disabled={busy}
                onClick={() => { setAssignOrder(detailOrder); setDetailOrder(null); }}
              >
                Assigner un livreur
              </button>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <AssignDriverModal
        order={assignOrder}
        open={assignOrder != null}
        onClose={() => setAssignOrder(null)}
        onAssigned={() => refetch()}
      />
    </>
  );
}
