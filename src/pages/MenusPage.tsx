import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import Modal from '../components/Modal';
import Field from '../components/Field';
import FormSection from '../components/FormSection';
import ModalFormFooter from '../components/ModalFormFooter';
import EmptyState from '../components/EmptyState';
import PaginationBar from '../components/PaginationBar';
import ImageUpload from '../components/ImageUpload';
import {
  CREATE_MENU_ITEM,
  DELETE_MENU_ITEM,
  DELETE_MENU_SUPPLEMENT,
  MENU_ITEMS_QUERY,
  RESTAURANTS_QUERY,
  UPDATE_MENU_ITEM,
  UPSERT_MENU_SUPPLEMENT,
  emptyMenuForm,
  type MenuItemRow,
  type MenuSupplementRow,
} from '../graphql/admin';
import {
  EPICERIE_LABELS,
  MENU_ITEM_CATEGORIES,
  RESTAURANT_MENU_SECTIONS,
  menuCategoryLabel,
  sectionKeyForCategory,
} from '../lib/constants';
import { apolloErrorMessage } from '../lib/apollo-error';
import { assetUrl } from '../lib/api';
import { useAuth } from '../auth';
import { isPartner } from '../lib/roles';
import { PAGE_SIZE, paginateList } from '../lib/pagination';

const FORM_ID = 'menu-item-form';

export default function MenusPage() {
  const { user } = useAuth();
  const partnerUser = isPartner(user?.role);

  const { data: restaurantsData } = useQuery(RESTAURANTS_QUERY);
  const restaurants = (restaurantsData?.restaurants?.items ?? []).filter(
    (r: { type?: string | null }) => r.type !== 'MARKET',
  );

  const [restaurantId, setRestaurantId] = useState('');
  const partnerRestaurantId = user?.partnerRestaurantId ?? '';
  const selectedRestaurantId =
    partnerUser && partnerRestaurantId
      ? partnerRestaurantId
      : restaurantId || restaurants[0]?.id || '';
  const selectedRestaurant = restaurants.find((r: { id: string }) => r.id === selectedRestaurantId);
  const [activeSection, setActiveSection] = useState(RESTAURANT_MENU_SECTIONS[0].key);
  const [page, setPage] = useState(1);

  const { data, loading, refetch } = useQuery(MENU_ITEMS_QUERY, {
    skip: !selectedRestaurantId,
    variables: { restaurantId: selectedRestaurantId },
    fetchPolicy: 'network-only',
  });

  const [createMenuItem] = useMutation(CREATE_MENU_ITEM);
  const [updateMenuItem] = useMutation(UPDATE_MENU_ITEM);
  const [deleteMenuItem] = useMutation(DELETE_MENU_ITEM);
  const [upsertSupplement] = useMutation(UPSERT_MENU_SUPPLEMENT);
  const [deleteSupplement] = useMutation(DELETE_MENU_SUPPLEMENT);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<MenuItemRow>>({});
  const [supplementDraft, setSupplementDraft] = useState<Partial<MenuSupplementRow>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [supplementSaving, setSupplementSaving] = useState(false);

  const items: MenuItemRow[] = data?.searchMenuItems?.items ?? [];
  const section = RESTAURANT_MENU_SECTIONS.find((s) => s.key === activeSection) ?? RESTAURANT_MENU_SECTIONS[0];

  const sectionCategoryOptions = useMemo(
    () =>
      MENU_ITEM_CATEGORIES.filter((cat) =>
        (section.categories as readonly string[]).includes(cat.value),
      ),
    [section],
  );

  const filteredItems = useMemo(
    () =>
      [...items]
        .filter((item) => (section.categories as readonly string[]).includes(item.category))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    [items, section],
  );

  const paginated = useMemo(() => paginateList(filteredItems, page), [filteredItems, page]);

  const sectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of RESTAURANT_MENU_SECTIONS) {
      counts.set(
        s.key,
        items.filter((item) => (s.categories as readonly string[]).includes(item.category)).length,
      );
    }
    return counts;
  }, [items]);

  function openCreate() {
    if (!selectedRestaurantId) return;
    const defaultCategory = section.categories[0] ?? 'MAIN_COURSE';
    setForm({ ...emptyMenuForm(selectedRestaurantId), category: defaultCategory });
    setSupplementDraft({});
    setError('');
    setModalOpen(true);
  }

  function openEdit(row: MenuItemRow) {
    setActiveSection(sectionKeyForCategory(row.category));
    setForm({ ...row, supplements: row.supplements ?? [] });
    setSupplementDraft({});
    setError('');
    setModalOpen(true);
  }

  function patchForm(patch: Partial<MenuItemRow>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function saveSupplement(menuItemId: string) {
    if (!supplementDraft.name?.trim()) {
      setError('Indiquez un nom pour le supplément.');
      return;
    }
    setSupplementSaving(true);
    setError('');
    try {
      await upsertSupplement({
        variables: {
          input: {
            id: supplementDraft.id,
            menuItemId,
            name: supplementDraft.name.trim(),
            price: Number(supplementDraft.price ?? 0),
            isAvailable: supplementDraft.isAvailable !== false,
            sortOrder: Number(supplementDraft.sortOrder ?? 0),
          },
        },
      });
      setSupplementDraft({});
      const refreshed = (await refetch()).data?.searchMenuItems?.items ?? [];
      const updated = refreshed.find((item: MenuItemRow) => item.id === menuItemId);
      if (updated) setForm({ ...updated, supplements: updated.supplements ?? [] });
    } catch (err) {
      setError(apolloErrorMessage(err));
    } finally {
      setSupplementSaving(false);
    }
  }

  async function removeSupplement(id: string, menuItemId: string) {
    if (!window.confirm('Supprimer ce supplément ?')) return;
    setSupplementSaving(true);
    setError('');
    try {
      await deleteSupplement({ variables: { id } });
      const refreshed = (await refetch()).data?.searchMenuItems?.items ?? [];
      const updated = refreshed.find((item: MenuItemRow) => item.id === menuItemId);
      if (updated) setForm({ ...updated, supplements: updated.supplements ?? [] });
    } catch (err) {
      setError(apolloErrorMessage(err));
    } finally {
      setSupplementSaving(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedRestaurantId || !form.name) return;
    setSaving(true);
    setError('');

    const input = {
      kind: 'RESTAURANT_DISH',
      restaurantId: selectedRestaurantId,
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      price: Number(form.price),
      category: form.category ?? 'MAIN_COURSE',
      imageUrl: form.imageUrl || undefined,
      isAvailable: form.isAvailable !== false,
      isFeatured: !!form.isFeatured,
      sortOrder: Number(form.sortOrder ?? 0),
    };

    try {
      const category = input.category;
      setActiveSection(sectionKeyForCategory(category));

      if (form.id) {
        await updateMenuItem({ variables: { input: { id: form.id, ...input } } });
        await refetch();
        setModalOpen(false);
      } else {
        const { data: createData } = await createMenuItem({ variables: { input } });
        const created = createData?.createMenuItem as MenuItemRow | undefined;
        await refetch();
        if (created?.id) {
          setForm({ ...created, supplements: created.supplements ?? [] });
        } else {
          setModalOpen(false);
        }
      }
    } catch (err) {
      setError(apolloErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: MenuItemRow) {
    if (!window.confirm(`Supprimer « ${row.name} » ?`)) return;
    try {
      await deleteMenuItem({ variables: { id: row.id } });
      await refetch();
    } catch (err) {
      alert(apolloErrorMessage(err));
    }
  }

  const canHaveSupplements =
    form.category !== 'DRINK' &&
    form.category !== 'DESSERT' &&
    form.category !== 'FRUIT' &&
    form.category !== 'SNACK';

  return (
    <div className="page-content">
      <PageHeader
        title="Menus restaurant"
        subtitle={
          partnerUser && selectedRestaurant
            ? `Carte de ${selectedRestaurant.name}`
            : EPICERIE_LABELS.menusSubtitle
        }
        badge={items.length}
        action={
          <button type="button" className="btn" onClick={openCreate} disabled={!selectedRestaurantId}>
            + Ajouter un plat
          </button>
        }
      />

      {!partnerUser ? (
        <SectionCard title="Choisir un restaurant">
          <div className="restaurant-picker">
            {restaurants.map((restaurant: { id: string; name: string; imageUrl?: string | null; coverImageUrl?: string | null }) => (
              <button
                key={restaurant.id}
                type="button"
                className={`restaurant-picker-item ${selectedRestaurantId === restaurant.id ? 'active' : ''}`}
                onClick={() => {
                  setRestaurantId(restaurant.id);
                  setPage(1);
                }}
              >
                <div
                  className="restaurant-picker-cover"
                  style={restaurant.coverImageUrl ? { backgroundImage: `url(${assetUrl(restaurant.coverImageUrl)})` } : undefined}
                />
                <div className="restaurant-picker-logo">
                  {restaurant.imageUrl ? <img src={assetUrl(restaurant.imageUrl)} alt="" /> : <span>{restaurant.name.slice(0, 1)}</span>}
                </div>
                <span className="restaurant-picker-name">{restaurant.name}</span>
              </button>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {selectedRestaurant ? (
        <SectionCard title={`Menu · ${selectedRestaurant.name}`} className="section-spaced">
          <div className="chip-row chip-row--tabs">
            {RESTAURANT_MENU_SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`chip ${activeSection === s.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection(s.key);
                  setPage(1);
                }}
              >
                {s.label} <span className="chip-count">{sectionCounts.get(s.key) ?? 0}</span>
              </button>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <EmptyState loading={loading} empty={!loading && filteredItems.length === 0} emptyTitle={`Aucun plat dans « ${section.label} »`} emptyHint="Ajoutez un plat pour ce libellé." />

      {filteredItems.length > 0 ? (
        <>
        <div className="entity-grid entity-grid--products">
          {paginated.items.map((item) => (
            <article key={item.id} className="entity-card product-card">
              <div className="product-card-media">
                {item.imageUrl ? (
                  <img src={assetUrl(item.imageUrl)} alt="" />
                ) : (
                  <div className="product-card-placeholder">{item.name.slice(0, 1)}</div>
                )}
                <span className={`badge ${item.isAvailable ? 'open' : 'closed'}`}>
                  {item.isAvailable ? 'Dispo' : 'Off'}
                </span>
              </div>
              <div className="product-card-body">
                <h3 className="entity-card-title">{item.name}</h3>
                <p className="entity-card-meta">{menuCategoryLabel(item.category)} · {item.price} FCFA</p>
                {item.supplements?.length ? (
                  <p className="entity-card-meta muted">{item.supplements.length} supplément(s)</p>
                ) : null}
                <div className="entity-card-actions">
                  <button type="button" className="btn secondary btn-sm" onClick={() => openEdit(item)}>Modifier</button>
                  <button type="button" className="btn danger btn-sm" onClick={() => onDelete(item)}>Supprimer</button>
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
        title={form.id ? 'Modifier le plat' : 'Nouveau plat'}
        subtitle={selectedRestaurant?.name}
        wide
        footer={<ModalFormFooter formId={FORM_ID} onCancel={() => setModalOpen(false)} saving={saving} submitLabel={form.id ? 'Enregistrer' : 'Créer le plat'} />}
      >
        <form id={FORM_ID} className="modal-form" onSubmit={onSubmit}>
          <FormSection title="Plat">
            <div className="form-grid form-grid-2">
              <Field label="Nom" required>
                <input value={form.name ?? ''} onChange={(e) => patchForm({ name: e.target.value })} required />
              </Field>
              <Field label="Prix (FCFA)" required>
                <input type="number" min={0} value={form.price ?? 0} onChange={(e) => patchForm({ price: Number(e.target.value) })} required />
              </Field>
              <div className="form-span-2">
                <Field label="Description">
                  <textarea rows={3} value={form.description ?? ''} onChange={(e) => patchForm({ description: e.target.value })} />
                </Field>
              </div>
              <Field label="Libellé menu">
                <select value={form.category ?? section.categories[0] ?? 'MAIN_COURSE'} onChange={(e) => patchForm({ category: e.target.value })}>
                  {sectionCategoryOptions.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ordre">
                <input type="number" value={form.sortOrder ?? 0} onChange={(e) => patchForm({ sortOrder: Number(e.target.value) })} />
              </Field>
              <div className="form-span-2">
                <ImageUpload variant="product" label="Photo du plat" value={form.imageUrl ?? ''} onChange={(url) => patchForm({ imageUrl: url })} />
              </div>
              <div className="form-span-2 checkbox-row">
                <label className="checkbox">
                  <input type="checkbox" checked={form.isAvailable !== false} onChange={(e) => patchForm({ isAvailable: e.target.checked })} />
                  Disponible
                </label>
                <label className="checkbox">
                  <input type="checkbox" checked={!!form.isFeatured} onChange={(e) => patchForm({ isFeatured: e.target.checked })} />
                  Populaire
                </label>
              </div>
            </div>
          </FormSection>

          {form.id && canHaveSupplements ? (
            <FormSection title="Suppléments" description="Proposés dans le modal de commande mobile.">
              <ul className="supplement-list">
                {(form.supplements ?? []).map((sup) => (
                  <li key={sup.id}>
                    <span>{sup.name} — {sup.price} FCFA</span>
                    <div className="actions">
                      <button type="button" className="btn secondary btn-sm" onClick={() => setSupplementDraft(sup)}>Modifier</button>
                      <button type="button" className="btn danger btn-sm" onClick={() => removeSupplement(sup.id, form.id!)}>Supprimer</button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="form-grid form-grid-2 supplement-form">
                <Field label="Nom">
                  <input value={supplementDraft.name ?? ''} onChange={(e) => setSupplementDraft((s) => ({ ...s, name: e.target.value }))} />
                </Field>
                <Field label="Prix">
                  <input type="number" min={0} value={supplementDraft.price ?? 0} onChange={(e) => setSupplementDraft((s) => ({ ...s, price: Number(e.target.value) }))} />
                </Field>
                <div className="form-span-2">
                  <button
                    type="button"
                    className="btn secondary btn-sm"
                    disabled={supplementSaving}
                    onClick={() => saveSupplement(form.id!)}
                  >
                    {supplementSaving
                      ? 'Enregistrement…'
                      : supplementDraft.id
                        ? 'Mettre à jour le supplément'
                        : '+ Ajouter le supplément'}
                  </button>
                </div>
              </div>
            </FormSection>
          ) : null}

          {!form.id && canHaveSupplements ? (
            <p className="muted">
              Après « Créer le plat », ce formulaire reste ouvert pour ajouter des suppléments ci-dessous.
            </p>
          ) : null}

          {error ? <p className="field-error">{error}</p> : null}
        </form>
      </Modal>
    </div>
  );
}
