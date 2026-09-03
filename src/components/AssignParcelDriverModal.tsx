import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Bike, Zap } from 'lucide-react';
import Modal from './Modal';
import { DRIVERS_QUERY, type DriverRow } from '../graphql/drivers';
import {
  ASSIGN_AVAILABLE_DRIVER_TO_PARCEL,
  ASSIGN_DRIVER_TO_PARCEL,
  type ParcelRow,
} from '../graphql/parcels';
import { apolloErrorMessage } from '../lib/apollo-error';

type Props = {
  parcel: ParcelRow | null;
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
};

export default function AssignParcelDriverModal({ parcel, open, onClose, onAssigned }: Props) {
  const { data, loading } = useQuery(DRIVERS_QUERY, { skip: !open });
  const [assignDriver, { loading: assigning }] = useMutation(ASSIGN_DRIVER_TO_PARCEL);
  const [assignAvailable, { loading: autoAssigning }] = useMutation(ASSIGN_AVAILABLE_DRIVER_TO_PARCEL);

  const drivers: DriverRow[] = data?.drivers ?? [];
  const sortedDrivers = useMemo(
    () => [...drivers].sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable)),
    [drivers],
  );
  const availableCount = drivers.filter((d) => d.isAvailable).length;
  const busy = assigning || autoAssigning;

  async function handleAssign(driverUserId: string) {
    if (!parcel) return;
    try {
      await assignDriver({
        variables: { input: { parcelId: parcel.id, driverId: driverUserId } },
      });
      onAssigned();
      onClose();
    } catch (err) {
      alert(apolloErrorMessage(err, 'Assignation impossible'));
    }
  }

  async function handleAutoAssign() {
    if (!parcel) return;
    try {
      await assignAvailable({ variables: { parcelId: parcel.id } });
      onAssigned();
      onClose();
    } catch (err) {
      alert(apolloErrorMessage(err, 'Aucun livreur disponible'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assigner un livreur"
      subtitle={
        parcel
          ? `Colis #${parcel.id.slice(0, 8).toUpperCase()} → ${parcel.receiverName}`
          : undefined
      }
      wide
      footer={
        <div className="modal-footer-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Annuler
          </button>
        </div>
      }
    >
      {parcel ? (
        <div className="assign-driver-modal">
          <p className="muted assign-driver-hint">
            Choisissez un livreur pour cette expédition colis. Il recevra un SMS avec les détails du destinataire.
          </p>

          <div className="assign-driver-toolbar">
            <div className="assign-driver-legend">
              <span className="badge badge--success">Disponible</span>
              <span className="badge badge--default">Indisponible</span>
              <span className="muted assign-driver-count">
                {loading ? '…' : `${availableCount} disponible${availableCount > 1 ? 's' : ''} sur ${drivers.length}`}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              disabled={busy || availableCount === 0}
              onClick={handleAutoAssign}
            >
              <Zap size={15} aria-hidden />
              Premier disponible
            </button>
          </div>

          <div className="assign-driver-list">
            {loading ? (
              <p className="muted">Chargement des livreurs…</p>
            ) : sortedDrivers.length === 0 ? (
              <p className="muted">Aucun livreur enregistré. Ajoutez-en depuis la page Livreurs.</p>
            ) : (
              sortedDrivers.map((driver) => (
                <button
                  key={driver.id}
                  type="button"
                  className={`assign-driver-row ${driver.isAvailable ? 'assign-driver-row--available' : ''}`}
                  disabled={busy}
                  onClick={() => handleAssign(driver.userId)}
                >
                  <span className="assign-driver-avatar" aria-hidden>
                    <Bike size={18} />
                  </span>
                  <span className="assign-driver-info">
                    <strong>{driver.user?.firstName} {driver.user?.lastName}</strong>
                    <span className="muted">{driver.user?.phone} · {driver.vehicleType}</span>
                  </span>
                  <span className={`badge ${driver.isAvailable ? 'badge--success' : 'badge--default'}`}>
                    {driver.isAvailable ? 'Disponible' : 'Indisponible'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
