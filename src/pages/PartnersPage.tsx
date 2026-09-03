import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Handshake,
  KeyRound,
  Lock,
  Phone,
  Plus,
  Search,
  ShieldBan,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import Field from '../components/Field';
import EmptyState from '../components/EmptyState';
import QueryErrorBanner from '../components/QueryErrorBanner';
import PaginationBar from '../components/PaginationBar';
import { RESTAURANTS_QUERY } from '../graphql/admin';
import {
  ADMIN_CREATE_PARTNER,
  ADMIN_UPDATE_PARTNER,
  emptyPartnerForm,
  PARTNERS_QUERY,
  partnerDisplayName,
  partnerFormFromRow,
  partnerInitials,
  type PartnerRow,
} from '../graphql/partners';
import { apolloErrorMessage } from '../lib/apollo-error';
import { assetUrl } from '../lib/api';
import { PAGE_SIZE, paginateList } from '../lib/pagination';

const FORM_ID = 'partner-form';

type RestaurantOption = {
  id: string;
  name: string;
  city: string;
  isActive?: boolean;
  imageUrl?: string | null;
  coverImageUrl?: string | null;
};

export default function PartnersPage() {
  const { data, loading, error, refetch } = useQuery(PARTNERS_QUERY, {
    fetchPolicy: 'network-only',
  });
  const { data: restaurantsData } = useQuery(RESTAURANTS_QUERY);
  const [createPartner] = useMutation(ADMIN_CREATE_PARTNER);
  const [updatePartner] = useMutation(ADMIN_UPDATE_PARTNER);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyPartnerForm());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const rows: PartnerRow[] = data?.partners ?? [];
  const restaurants: RestaurantOption[] = (restaurantsData?.restaurants?.items ?? []).filter(
    (r: { type?: string | null }) => r.type !== 'MARKET',
  );

  const assignedRestaurantIds = useMemo(
    () => new Set(rows.map((row) => row.partnerRestaurantId).filter(Boolean)),
    [rows],
  );

  const activeCount = rows.filter((row) => !row.isBlocked).length;
  const blockedCount = rows.filter((row) => row.isBlocked).length;
  const unassignedRestaurants = restaurants.filter((r) => !assignedRestaurantIds.has(r.id));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!q) return true;
      const name = partnerDisplayName(row).toLowerCase();
      const restaurant = row.partnerRestaurant?.name?.toLowerCase() ?? '';
      return name.includes(q) || row.phone.includes(q) || restaurant.includes(q);
    });
  }, [rows, search]);

  const paginated = useMemo(() => paginateList(filtered, page), [filtered, page]);

  const selectedRestaurant = restaurants.find((r) => r.id === form.partnerRestaurantId);
  const previewName =
    [form.firstName, form.lastName].filter(Boolean).join(' ').trim() || 'Nouveau partenaire';

  function openCreate(preselectedRestaurantId?: string) {
    setEditing(false);
    setForm(emptyPartnerForm(preselectedRestaurantId ?? restaurants[0]?.id ?? ''));
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(row: PartnerRow) {
    setEditing(true);
    setForm(partnerFormFromRow(row));
    setFormError('');
    setModalOpen(true);
  }

  function patchForm(patch: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.partnerRestaurantId) {
      setFormError('Sélectionnez un restaurant.');
      return;
    }
    if (!editing && !form.password.trim()) {
      setFormError('Le mot de passe est obligatoire.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editing && form.userId) {
        await updatePartner({
          variables: {
            input: {
              userId: form.userId,
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              phone: form.phone.trim(),
              partnerRestaurantId: form.partnerRestaurantId,
              isBlocked: form.isBlocked,
              ...(form.password.trim() ? { password: form.password } : {}),
            },
          },
        });
      } else {
        await createPartner({
          variables: {
            input: {
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              phone: form.phone.trim(),
              password: form.password,
              partnerRestaurantId: form.partnerRestaurantId,
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

  async function toggleBlocked(row: PartnerRow) {
    setTogglingId(row.id);
    try {
      await updatePartner({
        variables: {
          input: {
            userId: row.id,
            isBlocked: !row.isBlocked,
          },
        },
      });
      await refetch();
    } catch (err) {
      alert(apolloErrorMessage(err, 'Action impossible'));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="page-content partners-page">
      <PageHeader
        title="Comptes partenaires"
        subtitle="Chaque gérant accède uniquement à son restaurant — commandes, menus et revenus isolés."
        badge={rows.length}
        action={
          <button type="button" className="btn partners-page-cta" onClick={() => openCreate()}>
            <Plus size={16} aria-hidden />
            Nouveau partenaire
          </button>
        }
      />

      <QueryErrorBanner error={error} onRetry={() => refetch()} />

      <div className="stats-grid stats-grid--3">
        <StatCard
          icon={Handshake}
          label="Comptes actifs"
          value={activeCount}
          hint={`${rows.length} partenaire${rows.length > 1 ? 's' : ''} au total`}
          tone="success"
          loading={loading}
        />
        <StatCard
          icon={ShieldBan}
          label="Comptes bloqués"
          value={blockedCount}
          hint={blockedCount > 0 ? 'Accès dashboard révoqué' : 'Aucun blocage'}
          tone={blockedCount > 0 ? 'warning' : 'default'}
          loading={loading}
        />
        <StatCard
          icon={Store}
          label="Sans compte"
          value={unassignedRestaurants.length}
          hint="Restaurants à équiper"
          tone="accent"
          loading={loading}
        />
      </div>

      {unassignedRestaurants.length > 0 ? (
        <section className="partners-unassigned">
          <div className="partners-unassigned-head">
            <span className="partners-unassigned-icon" aria-hidden>
              <Sparkles size={18} />
            </span>
            <div>
              <h2>Restaurants en attente d&apos;accès</h2>
              <p className="muted">
                Créez un login manager pour ouvrir l&apos;espace partenaire en un clic.
              </p>
            </div>
          </div>
          <div className="partners-unassigned-grid">
            {unassignedRestaurants.map((restaurant) => (
              <button
                key={restaurant.id}
                type="button"
                className="partners-unassigned-card"
                onClick={() => openCreate(restaurant.id)}
              >
                <div
                  className="partners-unassigned-cover"
                  style={
                    restaurant.coverImageUrl
                      ? { backgroundImage: `url(${assetUrl(restaurant.coverImageUrl)})` }
                      : undefined
                  }
                >
                  <div className="partners-unassigned-cover-fade" />
                  <span className="partners-unassigned-plus">
                    <Plus size={16} aria-hidden />
                    Créer accès
                  </span>
                </div>
                <div className="partners-unassigned-body">
                  <div className="partners-unassigned-logo">
                    {restaurant.imageUrl ? (
                      <img src={assetUrl(restaurant.imageUrl)} alt="" />
                    ) : (
                      <span>{restaurant.name.slice(0, 1)}</span>
                    )}
                  </div>
                  <div>
                    <strong>{restaurant.name}</strong>
                    <p className="muted">{restaurant.city}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="card partners-toolbar-card">
        <div className="partners-toolbar">
          <label className="partners-search">
            <Search size={18} aria-hidden className="partners-search-icon" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Nom, téléphone ou restaurant…"
              aria-label="Rechercher un partenaire"
            />
          </label>
          <p className="partners-toolbar-meta muted">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            {search.trim() ? ` pour « ${search.trim()} »` : ''}
          </p>
        </div>
      </div>

      <EmptyState
        loading={loading && rows.length === 0}
        empty={!loading && filtered.length === 0}
        emptyTitle="Aucun compte partenaire"
        emptyHint="Créez un compte et liez-le à un restaurant pour lui ouvrir son espace manager."
      />

      {!loading || rows.length > 0 ? (
        <>
        <div className="partners-grid">
          {paginated.items.map((row) => {
            const restaurant = row.partnerRestaurant;
            const cover =
              restaurants.find((r) => r.id === row.partnerRestaurantId)?.coverImageUrl ??
              null;

            return (
              <article
                key={row.id}
                className={`partner-card ${row.isBlocked ? 'partner-card--blocked' : ''}`.trim()}
              >
                <div
                  className="partner-card-cover"
                  style={cover ? { backgroundImage: `url(${assetUrl(cover)})` } : undefined}
                >
                  <div className="partner-card-cover-fade" />
                  <span className={`partner-card-status ${row.isBlocked ? 'is-blocked' : 'is-active'}`}>
                    {row.isBlocked ? 'Bloqué' : 'Actif'}
                  </span>
                </div>

                <div className="partner-card-body">
                  <div className="partner-card-avatar" aria-hidden>
                    {partnerInitials(row)}
                  </div>

                  <div className="partner-card-main">
                    <h3 className="partner-card-name">{partnerDisplayName(row)}</h3>
                    <p className="partner-card-phone">
                      <Phone size={13} aria-hidden />
                      {row.phone}
                    </p>
                  </div>

                  <div className="partner-card-restaurant">
                    <Store size={15} aria-hidden />
                    <div>
                      <span className="partner-card-restaurant-label">Restaurant lié</span>
                      <strong>{restaurant?.name ?? 'Non assigné'}</strong>
                      {restaurant?.city ? <span className="muted">{restaurant.city}</span> : null}
                    </div>
                  </div>

                  <div className="partner-card-actions">
                    <button type="button" className="btn secondary btn-sm" onClick={() => openEdit(row)}>
                      Modifier
                    </button>
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
                </div>
              </article>
            );
          })}
        </div>
        <PaginationBar
          className="users-pagination"
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
        wide
        title={editing ? 'Modifier le partenaire' : 'Nouveau compte partenaire'}
        subtitle={
          editing
            ? 'Mettez à jour les accès ou réassignez le restaurant.'
            : 'Le gérant se connecte avec son téléphone — il ne verra que son restaurant.'
        }
        footer={
          <div className="partner-modal-footer">
            <button type="button" className="btn secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </button>
            <button type="submit" form={FORM_ID} className="btn" disabled={saving}>
              {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer le compte'}
            </button>
          </div>
        }
      >
        <form id={FORM_ID} className="partner-modal-form" onSubmit={onSubmit}>
          <div
            className="partner-modal-preview"
            style={
              selectedRestaurant?.coverImageUrl
                ? { backgroundImage: `url(${assetUrl(selectedRestaurant.coverImageUrl)})` }
                : undefined
            }
          >
            <div className="partner-modal-preview-fade" />
            <div className="partner-modal-preview-content">
              <div className="partner-modal-preview-avatar" aria-hidden>
                {partnerInitials({ firstName: form.firstName, lastName: form.lastName } as PartnerRow)}
              </div>
              <div>
                <p className="partner-modal-preview-eyebrow">
                  {editing ? 'Compte partenaire' : 'Aperçu du compte'}
                </p>
                <strong>{previewName}</strong>
                <p className="partner-modal-preview-restaurant">
                  <Store size={14} aria-hidden />
                  {selectedRestaurant?.name ?? 'Sélectionnez un restaurant'}
                </p>
              </div>
            </div>
          </div>

          <div className="partner-modal-steps" aria-hidden>
            <span className="partner-modal-step is-active">
              <UserRound size={14} />
              Identité
            </span>
            <span className="partner-modal-step-divider" />
            <span className={`partner-modal-step ${form.partnerRestaurantId ? 'is-active' : ''}`}>
              <Store size={14} />
              Restaurant
            </span>
            {editing ? (
              <>
                <span className="partner-modal-step-divider" />
                <span className="partner-modal-step is-active">
                  <Lock size={14} />
                  Accès
                </span>
              </>
            ) : null}
          </div>

          <div className="partner-modal-section">
            <h4 className="partner-modal-section-title">Identité du gérant</h4>
            <div className="form-grid form-grid-2">
              <Field label="Prénom" required>
                <input
                  className="partner-input"
                  value={form.firstName}
                  onChange={(e) => patchForm({ firstName: e.target.value })}
                  placeholder="Ex. Jean"
                  required
                />
              </Field>
              <Field label="Nom" required>
                <input
                  className="partner-input"
                  value={form.lastName}
                  onChange={(e) => patchForm({ lastName: e.target.value })}
                  placeholder="Ex. Makaya"
                  required
                />
              </Field>
              <Field label="Téléphone de connexion" required hint="Format +242…">
                <div className="partner-input-wrap">
                  <Phone size={16} aria-hidden />
                  <input
                    value={form.phone}
                    onChange={(e) => patchForm({ phone: e.target.value })}
                    placeholder="+24206…"
                    required
                  />
                </div>
              </Field>
              <Field
                label={editing ? 'Nouveau mot de passe' : 'Mot de passe'}
                required={!editing}
                hint={editing ? 'Laisser vide pour conserver l’actuel' : 'Minimum 6 caractères'}
              >
                <div className="partner-input-wrap">
                  <KeyRound size={16} aria-hidden />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => patchForm({ password: e.target.value })}
                    placeholder="••••••••"
                    required={!editing}
                    minLength={6}
                  />
                </div>
              </Field>
            </div>
          </div>

          <div className="partner-modal-section">
            <div className="partner-modal-section-head">
              <h4 className="partner-modal-section-title">Restaurant assigné</h4>
              <p className="muted">Un seul restaurant par compte — isolation garantie côté API.</p>
            </div>

            <div className="partner-restaurant-picker">
              {restaurants.map((restaurant) => {
                const selected = form.partnerRestaurantId === restaurant.id;
                return (
                  <button
                    key={restaurant.id}
                    type="button"
                    className={`partner-restaurant-option ${selected ? 'is-selected' : ''}`}
                    onClick={() => patchForm({ partnerRestaurantId: restaurant.id })}
                    aria-pressed={selected}
                  >
                    <div
                      className="partner-restaurant-option-cover"
                      style={
                        restaurant.coverImageUrl
                          ? { backgroundImage: `url(${assetUrl(restaurant.coverImageUrl)})` }
                          : undefined
                      }
                    >
                      <div className="partner-restaurant-option-fade" />
                      {selected ? <span className="partner-restaurant-option-check">✓</span> : null}
                    </div>
                    <div className="partner-restaurant-option-body">
                      <strong>{restaurant.name}</strong>
                      <span className="muted">{restaurant.city}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="partner-modal-info">
            <Lock size={18} aria-hidden />
            <p>
              Le partenaire accède uniquement à <strong>son restaurant</strong> : commandes, menus,
              revenus et fiche établissement. Aucun accès aux autres restos, au CMS ou à la flotte.
            </p>
          </div>

          {editing ? (
            <label className={`partner-block-toggle ${form.isBlocked ? 'is-blocked' : ''}`}>
              <input
                type="checkbox"
                checked={form.isBlocked}
                onChange={(e) => patchForm({ isBlocked: e.target.checked })}
              />
              <span className="partner-block-toggle-copy">
                <strong>{form.isBlocked ? 'Compte bloqué' : 'Compte actif'}</strong>
                <span className="muted">
                  {form.isBlocked
                    ? 'La connexion au dashboard est désactivée.'
                    : 'Le partenaire peut se connecter normalement.'}
                </span>
              </span>
            </label>
          ) : null}

          {formError ? <p className="field-error partner-modal-error">{formError}</p> : null}
        </form>
      </Modal>
    </div>
  );
}
