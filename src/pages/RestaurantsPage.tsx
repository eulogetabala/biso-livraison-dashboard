import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import Modal from '../components/Modal';
import Field from '../components/Field';
import FormSection from '../components/FormSection';
import ModalFormFooter from '../components/ModalFormFooter';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import PaginationBar from '../components/PaginationBar';
import RestaurantBrandingUpload from '../components/RestaurantBrandingUpload';
import CuisineTypePicker from '../components/CuisineTypePicker';
import {
  CREATE_RESTAURANT,
  ACTIVE_CUISINES_QUERY,
  CUISINES_QUERY,
  DELETE_RESTAURANT,
  RESTAURANTS_QUERY,
  UPDATE_RESTAURANT,
  emptyRestaurantForm,
  type RestaurantRow,
} from '../graphql/admin';
import { RESTAURANT_TYPES, EPICERIE_LABELS } from '../lib/constants';
import { formatCuisineTypes, parseCuisineTypes, serializeCuisineTypes } from '../lib/cuisine-types';
import { apolloErrorMessage } from '../lib/apollo-error';
import { assetUrl } from '../lib/api';
import { useAuth } from '../auth';
import { isAdmin, isPartner } from '../lib/roles';
import { PAGE_SIZE, paginateList } from '../lib/pagination';

const FORM_ID = 'restaurant-form';

export default function RestaurantsPage() {
  const { user } = useAuth();
  const adminUser = isAdmin(user?.role);
  const partnerUser = isPartner(user?.role);

  const { data, loading, refetch } = useQuery(RESTAURANTS_QUERY);
  const { data: cuisinesData, refetch: refetchCuisines } = useQuery(
    adminUser ? CUISINES_QUERY : ACTIVE_CUISINES_QUERY,
  );
  const [createRestaurant] = useMutation(CREATE_RESTAURANT);
  const [updateRestaurant] = useMutation(UPDATE_RESTAURANT);
  const [deleteRestaurant] = useMutation(DELETE_RESTAURANT);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyRestaurantForm());
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [openFilter, setOpenFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const rows: RestaurantRow[] = data?.restaurants?.items ?? [];
  const rawCuisines = adminUser
    ? (cuisinesData?.allCuisineTypes ?? [])
    : (cuisinesData?.activeCuisineTypes ?? []);
  const cuisines = rawCuisines.filter((c: { isActive: boolean }) => c.isActive);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return rows.filter((row) => {
      if (openFilter === 'open' && !row.isActive) return false;
      if (openFilter === 'closed' && row.isActive) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.city.toLowerCase().includes(q) ||
        row.cuisineType.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, openFilter]);

  const paginated = useMemo(() => paginateList(filtered, page), [filtered, page]);

  function changeFilter(value: string) {
    setFilter(value);
    setPage(1);
  }

  function changeOpenFilter(value: 'all' | 'open' | 'closed') {
    setOpenFilter(value);
    setPage(1);
  }

  function openCreate() {
    setForm(emptyRestaurantForm());
    setSelectedCuisines([]);
    setError('');
    setModalOpen(true);
  }

  function openEdit(row: RestaurantRow) {
    setForm({ ...row });
    setSelectedCuisines(parseCuisineTypes(row.cuisineType));
    setError('');
    setModalOpen(true);
  }

  function patchForm(patch: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (selectedCuisines.length === 0) {
      setError('Sélectionnez au moins un type de cuisine.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const input = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        address: form.address.trim(),
        city: form.city.trim(),
        zipCode: form.zipCode.trim(),
        phone: form.phone.trim(),
        cuisineType: serializeCuisineTypes(selectedCuisines),
        imageUrl: form.imageUrl || undefined,
        coverImageUrl: form.coverImageUrl || undefined,
        deliveryFee: Number(form.deliveryFee),
        estimatedDeliveryTime: Number(form.estimatedDeliveryTime),
        latitude: form.latitude != null ? Number(form.latitude) : undefined,
        longitude: form.longitude != null ? Number(form.longitude) : undefined,
        isActive: !!form.isActive,
        ...(adminUser
          ? {
              rating: Number(form.rating),
              type: form.type ?? 'RESTAURANT',
              isFeatured: !!form.isFeatured,
              sortOrder: Number(form.sortOrder ?? 0),
            }
          : {}),
      };

      if (form.id) {
        await updateRestaurant({ variables: { input: { id: form.id, ...input } } });
      } else {
        await createRestaurant({ variables: { input } });
      }
      setModalOpen(false);
      await refetch();
    } catch (err) {
      setError(apolloErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: RestaurantRow) {
    if (!window.confirm(`Supprimer « ${row.name} » ?`)) return;
    try {
      await deleteRestaurant({ variables: { id: row.id } });
      await refetch();
    } catch (err) {
      alert(apolloErrorMessage(err));
    }
  }

  async function toggleOpen(row: RestaurantRow) {
    setTogglingId(row.id);
    try {
      await updateRestaurant({
        variables: { input: { id: row.id, isActive: !row.isActive } },
      });
      await refetch();
    } catch (err) {
      alert(apolloErrorMessage(err, 'Impossible de changer le statut'));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Restaurants"
        subtitle={
          partnerUser
            ? 'Modifiez la fiche et l’identité visuelle de votre établissement.'
            : 'Identité visuelle : photo de couverture + logo. Les infos correspondent à la fiche restaurant dans l\'app.'
        }
        badge={filtered.length}
        action={
          adminUser ? (
            <button type="button" className="btn" onClick={openCreate}>
              + Nouveau restaurant
            </button>
          ) : undefined
        }
      />

      <SectionCard>
        <div className="status-filter-tabs">
          {[
            { value: 'all' as const, label: 'Tous' },
            { value: 'open' as const, label: 'Ouverts' },
            { value: 'closed' as const, label: 'Fermés' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={openFilter === tab.value ? 'active' : ''}
              onClick={() => changeOpenFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <SearchBar
          value={filter}
          onChange={changeFilter}
          placeholder="Rechercher par nom, ville ou cuisine…"
        />
      </SectionCard>

      <EmptyState
        loading={loading && rows.length === 0}
        empty={!loading && filtered.length === 0}
        emptyTitle="Aucun restaurant"
        emptyHint="Ajoutez votre premier établissement avec couverture et logo."
      />

      {!loading || rows.length > 0 ? (
        <>
        <div className="entity-grid entity-grid--restaurants">
          {paginated.items.map((row) => (
            <article key={row.id} className={`entity-card restaurant-card ${row.isActive ? '' : 'restaurant-card--closed'}`.trim()}>
              <div
                className="restaurant-card-cover"
                style={row.coverImageUrl ? { backgroundImage: `url(${assetUrl(row.coverImageUrl)})` } : undefined}
              >
                <div className="restaurant-card-cover-fade" />
                <div className="restaurant-card-badges">
                  <span className={`badge ${row.isActive ? 'open' : 'closed'}`}>
                    {row.isActive ? 'Ouvert' : 'Fermé'}
                  </span>
                  {row.isFeatured ? <span className="badge featured">À la une</span> : null}
                </div>
              </div>

              <div className="restaurant-card-body">
                <div className="restaurant-card-logo">
                  {row.imageUrl ? (
                    <img src={assetUrl(row.imageUrl)} alt="" />
                  ) : (
                    <span>{row.name.slice(0, 1)}</span>
                  )}
                </div>

                <div className="restaurant-card-content">
                  <h3 className="entity-card-title">{row.name}</h3>
                  <p className="entity-card-meta">{formatCuisineTypes(row.cuisineType, cuisines)}</p>
                  <p className="entity-card-meta muted">{row.city} · {row.deliveryFee} FCFA · {row.estimatedDeliveryTime} min</p>

                  <div className="entity-card-actions">
                    <button
                      type="button"
                      className={`btn btn-sm ${row.isActive ? 'secondary' : ''}`}
                      disabled={togglingId === row.id}
                      onClick={() => toggleOpen(row)}
                    >
                      {row.isActive ? 'Fermer' : 'Ouvrir'}
                    </button>
                    <button type="button" className="btn secondary btn-sm" onClick={() => openEdit(row)}>
                      Modifier
                    </button>
                    {adminUser ? (
                      <button type="button" className="btn danger btn-sm" onClick={() => onDelete(row)}>
                        Supprimer
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <PaginationBar
          pageInfo={paginated.pageInfo}
          pageSize={PAGE_SIZE}
          loading={loading}
          onPageChange={setPage}
        />
        </>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Modifier le restaurant' : 'Nouveau restaurant'}
        subtitle="Couverture en haut de la fiche · logo dans les listes."
        wide
        footer={
          <ModalFormFooter
            formId={FORM_ID}
            onCancel={() => setModalOpen(false)}
            saving={saving}
            submitLabel={form.id ? 'Enregistrer' : 'Créer le restaurant'}
          />
        }
      >
        <form id={FORM_ID} className="modal-form" onSubmit={onSubmit}>
          <FormSection title="Identité visuelle" description="Comme sur la fiche restaurant mobile : bannière + logo.">
            <RestaurantBrandingUpload
              name={form.name}
              coverUrl={form.coverImageUrl ?? ''}
              logoUrl={form.imageUrl ?? ''}
              onCoverChange={(url) => patchForm({ coverImageUrl: url })}
              onLogoChange={(url) => patchForm({ imageUrl: url })}
            />
          </FormSection>

          <FormSection title="Informations générales">
            <div className="form-grid form-grid-2">
              <Field label="Nom" required>
                <input value={form.name} onChange={(e) => patchForm({ name: e.target.value })} required />
              </Field>
              {adminUser ? (
                <Field label="Type d'établissement" hint={EPICERIE_LABELS.typeHint}>
                  <select value={form.type ?? 'RESTAURANT'} onChange={(e) => patchForm({ type: e.target.value })}>
                    {RESTAURANT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <div className="form-span-2">
                <Field label="Description">
                  <textarea rows={3} value={form.description ?? ''} onChange={(e) => patchForm({ description: e.target.value })} />
                </Field>
              </div>
              <div className="form-span-2">
                <Field label="Types de cuisine" required>
                  <CuisineTypePicker
                    cuisines={cuisines}
                    selected={selectedCuisines}
                    onChange={setSelectedCuisines}
                    onCuisinesUpdated={adminUser ? () => refetchCuisines() : undefined}
                  />
                </Field>
              </div>
            </div>
          </FormSection>

          <FormSection title="Adresse & contact">
            <div className="form-grid form-grid-2">
              <Field label="Adresse" required>
                <input value={form.address} onChange={(e) => patchForm({ address: e.target.value })} required />
              </Field>
              <Field label="Ville" required>
                <input value={form.city} onChange={(e) => patchForm({ city: e.target.value })} required />
              </Field>
              <Field label="Code postal" required>
                <input value={form.zipCode} onChange={(e) => patchForm({ zipCode: e.target.value })} required />
              </Field>
              <Field label="Téléphone" required hint="+242…">
                <input value={form.phone} onChange={(e) => patchForm({ phone: e.target.value })} required />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Livraison & visibilité">
            <div className="form-grid form-grid-2">
              <Field label="Frais de livraison (FCFA)">
                <input type="number" min={0} value={form.deliveryFee} onChange={(e) => patchForm({ deliveryFee: Number(e.target.value) })} />
              </Field>
              <Field label="Temps estimé (min)">
                <input type="number" min={5} max={180} value={form.estimatedDeliveryTime} onChange={(e) => patchForm({ estimatedDeliveryTime: Number(e.target.value) })} />
              </Field>
              {adminUser ? (
                <>
                  <Field label="Note (0–5)">
                    <input type="number" min={0} max={5} step={0.1} value={form.rating} onChange={(e) => patchForm({ rating: Number(e.target.value) })} />
                  </Field>
                  <Field label="Ordre d'affichage">
                    <input type="number" value={form.sortOrder ?? 0} onChange={(e) => patchForm({ sortOrder: Number(e.target.value) })} />
                  </Field>
                </>
              ) : null}
              <Field label="Latitude">
                <input type="number" step="any" value={form.latitude ?? ''} onChange={(e) => patchForm({ latitude: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </Field>
              <Field label="Longitude">
                <input type="number" step="any" value={form.longitude ?? ''} onChange={(e) => patchForm({ longitude: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </Field>
              <div className="form-span-2 restaurant-open-toggle">
                <label className="checkbox">
                  <input type="checkbox" checked={!!form.isActive} onChange={(e) => patchForm({ isActive: e.target.checked })} />
                  Restaurant ouvert — visible et commandable dans l’app
                </label>
                {adminUser ? (
                  <label className="checkbox">
                    <input type="checkbox" checked={!!form.isFeatured} onChange={(e) => patchForm({ isFeatured: e.target.checked })} />
                    Mis en avant sur l'accueil
                  </label>
                ) : null}
              </div>
            </div>
          </FormSection>

          {error ? <p className="field-error">{error}</p> : null}
        </form>
      </Modal>
    </div>
  );
}
