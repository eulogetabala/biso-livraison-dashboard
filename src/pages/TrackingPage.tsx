import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { MapPin, Radio, RefreshCw, Truck } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import QueryErrorBanner from '../components/QueryErrorBanner';
import EmptyState from '../components/EmptyState';
import TrackingMap, { trackingToMapPoints } from '../components/TrackingMap';
import {
  ACTIVE_DELIVERIES_TRACKING_QUERY,
  DELIVERY_STATUS_LABELS,
  type ActiveDeliveryTracking,
} from '../graphql/tracking';

const POLL_MS = 3000;

export default function TrackingPage() {
  const [searchParams] = useSearchParams();
  const deliveryFromUrl = searchParams.get('delivery');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(() => new Date());

  const { data, loading, error, refetch, networkStatus } = useQuery(
    ACTIVE_DELIVERIES_TRACKING_QUERY,
    {
      fetchPolicy: 'network-only',
      pollInterval: POLL_MS,
      notifyOnNetworkStatusChange: true,
      onCompleted: (result) => {
        setLastRefresh(new Date());
        const rows = result.activeDeliveriesTracking ?? [];
        if (!selectedId && rows.length > 0) {
          setSelectedId(rows[0].deliveryId);
        }
      },
    },
  );

  const rows: ActiveDeliveryTracking[] = data?.activeDeliveriesTracking ?? [];
  const selected = rows.find((r) => r.deliveryId === selectedId) ?? rows[0] ?? null;
  const isRefreshing = networkStatus === 4 || networkStatus === 1;

  useEffect(() => {
    if (deliveryFromUrl && rows.some((row) => row.deliveryId === deliveryFromUrl)) {
      setSelectedId(deliveryFromUrl);
    }
  }, [deliveryFromUrl, rows]);

  const mapPoints = useMemo(
    () => (selected ? trackingToMapPoints(selected) : []),
    [selected],
  );

  const allMapPoints = useMemo(
    () =>
      rows.flatMap((row) => {
        const points = trackingToMapPoints(row);
        return points.filter((p) => p.kind === 'driver' || p.kind === 'destination' || p.kind === 'restaurant');
      }),
    [rows],
  );

  async function handleRefresh() {
    await refetch();
    setLastRefresh(new Date());
  }

  return (
    <>
      <PageHeader
        title="Suivi livraisons"
        subtitle="Carte OpenStreetMap en direct — actualisation automatique toutes les 3 s."
        badge={rows.length}
        action={
          <div className="tracking-header-actions">
            <span className={`tracking-live ${isRefreshing ? 'tracking-live--pulse' : ''}`.trim()}>
              <Radio size={14} aria-hidden />
              Live
            </span>
            <button type="button" className="btn secondary btn-sm" onClick={() => void handleRefresh()}>
              <RefreshCw size={16} aria-hidden className={isRefreshing ? 'spin' : undefined} />
              Actualiser
            </button>
          </div>
        }
      />

      <QueryErrorBanner error={error} onRetry={() => void refetch()} />

      <div className="tracking-layout">
        <SectionCard
          title="Carte"
          subtitle={
            selected
              ? `#${(selected.orderId ?? selected.deliveryId).slice(0, 8).toUpperCase()} · ${selected.restaurantName}`
              : 'Vue globale des livraisons actives'
          }
        >
          <div className="tracking-meta-row">
            {selected?.locationUpdatedAt ? (
              <p className="tracking-meta muted">
                Dernière position GPS :{' '}
                {new Date(selected.locationUpdatedAt).toLocaleString('fr-FR', {
                  dateStyle: 'short',
                  timeStyle: 'medium',
                })}
              </p>
            ) : (
              <p className="tracking-meta muted">GPS livreur en attente de signal</p>
            )}
            <p className="tracking-meta muted tracking-meta--right">
              Sync : {lastRefresh.toLocaleTimeString('fr-FR')}
            </p>
          </div>
          {selected ? (
            <TrackingMap points={mapPoints} selectedId={selected.deliveryId} fitKey={selected.deliveryId} height={500} />
          ) : (
            <TrackingMap points={allMapPoints} height={500} showAllDrivers fitKey="all" />
          )}
        </SectionCard>

        <SectionCard title="Livraisons en cours" subtitle={`${rows.length} course${rows.length > 1 ? 's' : ''} active${rows.length > 1 ? 's' : ''}`}>
          <EmptyState
            loading={loading && rows.length === 0}
            empty={!loading && rows.length === 0}
            emptyTitle="Aucune livraison active"
            emptyHint="Assignez un livreur à une commande confirmée pour la voir ici."
          />

          {rows.length > 0 ? (
            <div className="tracking-list">
              {rows.map((row) => {
                const active = row.deliveryId === selected?.deliveryId;
                const hasGps = row.driverLatitude != null && row.driverLongitude != null;
                return (
                  <button
                    key={row.deliveryId}
                    type="button"
                    className={`tracking-list-item ${active ? 'tracking-list-item--active' : ''}`.trim()}
                    onClick={() => setSelectedId(row.deliveryId)}
                  >
                    <span className="tracking-list-icon" aria-hidden>
                      <Truck size={18} />
                    </span>
                    <span className="tracking-list-main">
                      <strong>
                        {row.clientFirstName} {row.clientLastName}
                      </strong>
                      <span className="muted">
                        {row.restaurantName} → {row.deliveryCity}
                      </span>
                      <span className="muted">
                        Livreur : {row.driverFirstName} {row.driverLastName}
                        {row.driverPhone ? ` · ${row.driverPhone}` : ''}
                      </span>
                    </span>
                    <span className="tracking-list-meta">
                      <span className={`badge badge--${row.deliveryStatus === 'IN_TRANSIT' ? 'accent' : 'default'}`}>
                        {DELIVERY_STATUS_LABELS[row.deliveryStatus] ?? row.deliveryStatus}
                      </span>
                      <span className={`tracking-gps ${hasGps ? 'tracking-gps--ok' : ''}`.trim()}>
                        <MapPin size={13} aria-hidden />
                        {hasGps ? 'GPS actif' : 'GPS en attente'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </SectionCard>
      </div>
    </>
  );
}
