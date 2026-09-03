import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Bike, Car, CircleCheck, Plus, Radio, Star, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import Modal from '../components/Modal';
import Field from '../components/Field';
import FormSection from '../components/FormSection';
import ModalFormFooter from '../components/ModalFormFooter';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import QueryErrorBanner from '../components/QueryErrorBanner';
import StatCard from '../components/StatCard';
import FilterToolbar from '../components/FilterToolbar';
import PaginationBar from '../components/PaginationBar';
import {
  ADMIN_CREATE_DRIVER,
  ADMIN_SET_DRIVER_AVAILABILITY,
  ADMIN_UPDATE_DRIVER,
  DRIVER_AVAILABILITY_FILTERS,
  DRIVERS_QUERY,
  driverDisplayName,
  driverFormFromRow,
  driverInitials,
  emptyDriverForm,
  type DriverAvailabilityFilter,
  type DriverRow,
} from '../graphql/drivers';
import { STATISTICS_OVERVIEW_QUERY } from '../graphql/statistics';
import { apolloErrorMessage } from '../lib/apollo-error';
import { PAGE_SIZE, paginateList } from '../lib/pagination';

const FORM_ID = 'driver-form';

const VEHICLE_OPTIONS = [
  { value: 'MOTO', label: 'Moto' },
  { value: 'VOITURE', label: 'Voiture' },
  { value: 'VELO', label: 'Vélo' },
] as const;

function VehicleIcon({ type }: { type: string }) {
  const normalized = type.toUpperCase();
  if (normalized.includes('VOITURE') || normalized.includes('CAR')) {
    return <Car size={14} aria-hidden />;
  }
  return <Bike size={14} aria-hidden />;
}

type AvailabilityToggleProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
};

function AvailabilityToggle({ checked, disabled, onChange }: AvailabilityToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? 'Mettre hors ligne' : 'Rendre disponible'}
      className={`availability-toggle ${checked ? 'availability-toggle--on' : ''}`}
      disabled={disabled}
      onClick={onChange}
    >
      <span className="availability-toggle-track" aria-hidden>
        <span className="availability-toggle-thumb" />
      </span>
      <span className="availability-toggle-label">{checked ? 'Disponible' : 'Hors ligne'}</span>
    </button>
  );
}

export default function DriversPage() {
  const { data, loading, error, refetch } = useQuery(DRIVERS_QUERY, { fetchPolicy: 'network-only' });
  const { data: overviewData } = useQuery(STATISTICS_OVERVIEW_QUERY, { fetchPolicy: 'network-only' });
  const [createDriver] = useMutation(ADMIN_CREATE_DRIVER);
  const [updateDriver] = useMutation(ADMIN_UPDATE_DRIVER);
  const [setAvailability] = useMutation(ADMIN_SET_DRIVER_AVAILABILITY);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyDriverForm());
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<DriverAvailabilityFilter>('');
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const rows: DriverRow[] = data?.drivers ?? [];
  const overview = overviewData?.statisticsOverview;

  const totalCount = overview?.totalDriverProfiles ?? rows.length;
  const availableCount = overview?.availableDriverProfiles ?? rows.filter((r) => r.isAvailable).length;
  const offlineCount = Math.max(0, totalCount - availableCount);
  const availabilityRate = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (availabilityFilter === 'available' && !row.isAvailable) return false;
      if (availabilityFilter === 'offline' && row.isAvailable) return false;
      if (!q) return true;
      const name = driverDisplayName(row).toLowerCase();
      return (
        name.includes(q)
        || (row.user?.phone ?? '').includes(q)
        || row.vehicleType.toLowerCase().includes(q)
        || (row.vehiclePlate ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, availabilityFilter]);

  const paginated = useMemo(() => paginateList(filtered, page), [filtered, page]);

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function changeAvailabilityFilter(value: DriverAvailabilityFilter) {
    setAvailabilityFilter(value);
    setPage(1);
  }

  function openCreate() {
    setEditing(false);
    setForm(emptyDriverForm());
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(row: DriverRow) {
    setEditing(true);
    setForm(driverFormFromRow(row));
    setFormError('');
    setModalOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editing && form.driverId) {
        await updateDriver({
          variables: {
            input: {
              driverId: form.driverId,
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              phone: form.phone.trim(),
              password: form.password.trim() || undefined,
              vehicleType: form.vehicleType.trim() || 'MOTO',
              vehiclePlate: form.vehiclePlate.trim() || undefined,
              isAvailable: form.isAvailable,
            },
          },
        });
      } else {
        await createDriver({
          variables: {
            input: {
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              phone: form.phone.trim(),
              password: form.password,
              vehicleType: form.vehicleType.trim() || 'MOTO',
              vehiclePlate: form.vehiclePlate.trim() || undefined,
              isAvailable: form.isAvailable,
            },
          },
        });
      }
      setModalOpen(false);
      await refetch();
    } catch (err) {
      setFormError(apolloErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(row: DriverRow) {
    setTogglingId(row.id);
    try {
      await setAvailability({
        variables: {
          input: { driverId: row.id, isAvailable: !row.isAvailable },
        },
      });
      await refetch();
    } catch {
      // ignore — UI stays unchanged
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Livreurs"
        subtitle="Gérez la flotte, la disponibilité et les comptes app livreur."
        action={
          <button type="button" className="btn" onClick={openCreate}>
            <Plus size={16} aria-hidden />
            Nouveau livreur
          </button>
        }
        badge={totalCount}
      />

      <QueryErrorBanner error={error} onRetry={() => refetch()} />

      <div className="stats-grid stats-grid--3">
        <StatCard
          icon={Radio}
          label="Flotte totale"
          value={totalCount}
          hint={`${rows.length} profil${rows.length > 1 ? 's' : ''} enregistré${rows.length > 1 ? 's' : ''}`}
          loading={loading}
        />
        <StatCard
          icon={CircleCheck}
          label="Disponibles"
          value={availableCount}
          hint={totalCount > 0 ? `${availabilityRate}% de la flotte` : undefined}
          tone="success"
          loading={loading}
        />
        <StatCard
          icon={WifiOff}
          label="Hors ligne"
          value={offlineCount}
          hint="Non assignables aux courses"
          tone="default"
          loading={loading}
        />
      </div>

      <SectionCard
        title="Flotte active"
        subtitle={
          filtered.length > 0
            ? `${filtered.length} livreur${filtered.length > 1 ? 's' : ''} affiché${filtered.length > 1 ? 's' : ''}`
            : 'Aucun livreur pour ces critères'
        }
      >
        <div className="drivers-toolbar">
          <FilterToolbar
            showPeriod={false}
            preset="all"
            customFrom=""
            customTo=""
            onPresetChange={() => {}}
            onFromChange={() => {}}
            onToChange={() => {}}
            statusFilter={availabilityFilter}
            statusOptions={DRIVER_AVAILABILITY_FILTERS}
            onStatusChange={(value) => changeAvailabilityFilter(value as DriverAvailabilityFilter)}
          />
          <SearchBar
            value={search}
            onChange={changeSearch}
            placeholder="Nom, téléphone, véhicule…"
          />
        </div>

        <EmptyState
          loading={loading && rows.length === 0}
          empty={!loading && filtered.length === 0}
          emptyTitle={rows.length === 0 ? 'Aucun livreur' : 'Aucun résultat'}
          emptyHint={
            rows.length === 0
              ? 'Créez un livreur pour qu’il puisse se connecter à l’app.'
              : 'Modifiez la recherche ou le filtre de disponibilité.'
          }
        />

        {!loading || rows.length > 0 ? (
          filtered.length > 0 ? (
            <>
            <div className="orders-table-wrap drivers-table-wrap">
              <table className="orders-table drivers-table">
                <thead>
                  <tr>
                    <th>Livreur</th>
                    <th>Véhicule</th>
                    <th>Note</th>
                    <th>Inscription</th>
                    <th>Disponibilité</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.items.map((row) => (
                    <tr key={row.id} className={row.isAvailable ? 'drivers-row--online' : 'drivers-row--offline'}>
                      <td>
                        <div className="driver-cell">
                          <span
                            className={`driver-avatar driver-avatar--table ${row.isAvailable ? 'driver-avatar--online' : 'driver-avatar--offline'}`}
                            aria-hidden
                          >
                            {driverInitials(row)}
                          </span>
                          <div className="driver-cell-info">
                            <strong>{driverDisplayName(row)}</strong>
                            <span className="muted">{row.user?.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="driver-vehicle">
                          <span className="vehicle-badge">
                            <VehicleIcon type={row.vehicleType} />
                            {row.vehicleType}
                          </span>
                          {row.vehiclePlate ? (
                            <span className="driver-plate muted">{row.vehiclePlate}</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className="driver-rating driver-rating--table">
                          <Star size={14} aria-hidden />
                          {row.rating.toFixed(1)}
                          <span className="muted">({row.reviewCount})</span>
                        </span>
                      </td>
                      <td className="muted">
                        {new Date(row.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <AvailabilityToggle
                          checked={row.isAvailable}
                          disabled={togglingId === row.id}
                          onChange={() => toggleAvailability(row)}
                        />
                      </td>
                      <td>
                        <button type="button" className="btn secondary btn-sm" onClick={() => openEdit(row)}>
                          Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar
              pageInfo={paginated.pageInfo}
              pageSize={PAGE_SIZE}
              loading={loading}
              onPageChange={setPage}
            />
            </>
          ) : null
        ) : null}

        {availableCount > 0 ? (
          <p className="drivers-footer-hint muted">
            Les livreurs disponibles apparaissent lors de l’assignation sur{' '}
            <Link to="/orders">Commandes</Link> et <Link to="/parcels">Colis</Link>.
            {' '}Suivez-les en direct sur <Link to="/tracking">Suivi GPS</Link>.
          </p>
        ) : null}
      </SectionCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier le livreur' : 'Nouveau livreur'}
        subtitle={editing ? 'Mettre à jour le compte et le véhicule.' : 'Compte app + profil livreur en une étape.'}
        footer={
          <ModalFormFooter
            formId={FORM_ID}
            onCancel={() => setModalOpen(false)}
            saving={saving}
            submitLabel={editing ? 'Enregistrer' : 'Créer le livreur'}
          />
        }
      >
        <form id={FORM_ID} className="modal-form" onSubmit={onSubmit}>
          {formError ? <p className="form-error">{formError}</p> : null}
          <FormSection title="Identité" description="Connexion à l’app livreur.">
            <div className="form-grid-2">
              <Field label="Prénom" required>
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </Field>
              <Field label="Nom" required>
                <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </Field>
            </div>
            <Field label="Téléphone" required>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </Field>
            <Field label="Mot de passe" required={!editing} hint={editing ? 'Laisser vide pour ne pas changer.' : undefined}>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={editing ? undefined : 6}
                required={!editing}
              />
            </Field>
          </FormSection>

          <FormSection title="Véhicule">
            <div className="form-grid-2">
              <Field label="Type">
                <select
                  value={form.vehicleType}
                  onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                >
                  {VEHICLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Immatriculation">
                <input
                  value={form.vehiclePlate}
                  onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
                  placeholder="Optionnel"
                />
              </Field>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
              />
              Disponible dès la création
            </label>
          </FormSection>
        </form>
      </Modal>
    </>
  );
}
