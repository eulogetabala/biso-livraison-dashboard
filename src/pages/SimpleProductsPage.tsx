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
import QueryErrorBanner from '../components/QueryErrorBanner';
import PaginationBar from '../components/PaginationBar';
import ImageUpload from '../components/ImageUpload';
import {
  CREATE_MENU_ITEM,
  DELETE_MENU_ITEM,
  MARKET_CATEGORIES_QUERY,
  SIMPLE_PRODUCTS_QUERY,
  UPDATE_MENU_ITEM,
  emptySimpleProductForm,
  type MenuItemRow,
} from '../graphql/admin';
import { EPICERIE_LABELS } from '../lib/constants';
import { apolloErrorMessage } from '../lib/apollo-error';
import { assetUrl } from '../lib/api';
import { PAGE_SIZE, paginateList } from '../lib/pagination';

const FORM_ID = 'simple-product-form';

export default function SimpleProductsPage() {
  const { data: categoriesData } = useQuery(MARKET_CATEGORIES_QUERY);
  const { data, loading, error: queryError, refetch } = useQuery(SIMPLE_PRODUCTS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const [createMenuItem] = useMutation(CREATE_MENU_ITEM);
  const [updateMenuItem] = useMutation(UPDATE_MENU_ITEM);
  const [deleteMenuItem] = useMutation(DELETE_MENU_ITEM);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<MenuItemRow>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  const items: MenuItemRow[] = data?.searchMenuItems?.items ?? [];
  const categories = categoriesData?.allMarketCategories ?? [];

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.seller?.toLowerCase().includes(q) ||
        categories.find((c: { id: string }) => c.id === item.marketCategoryId)?.label.toLowerCase().includes(q),
    );
  }, [items, filter, categories]);

  const paginated = useMemo(() => paginateList(filtered, page), [filtered, page]);

  function changeFilter(value: string) {
    setFilter(value);
    setPage(1);
  }

  function openCreate() {
    setForm(emptySimpleProductForm());
    setError('');
    setModalOpen(true);
  }

  function openEdit(row: MenuItemRow) {
    setForm({ ...row });
    setError('');
    setModalOpen(true);
  }

  function patchForm(patch: Partial<MenuItemRow>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name || !form.seller?.trim() || !form.marketCategoryId) return;
    setSaving(true);
    setError('');

    const input = {
      kind: 'SIMPLE_PRODUCT',
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      price: Number(form.price),
      category: form.category ?? 'SNACK',
      imageUrl: form.imageUrl || undefined,
      isAvailable: form.isAvailable !== false,
      isFeatured: !!form.isFeatured,
      sortOrder: Number(form.sortOrder ?? 0),
      seller: form.seller.trim(),
      badge: form.badge?.trim() || undefined,
      marketCategoryId: form.marketCategoryId,
    };

    try {
      if (form.id) {
        await updateMenuItem({ variables: { input: { id: form.id, ...input } } });
      } else {
        await createMenuItem({ variables: { input } });
      }
      setModalOpen(false);
      await refetch();
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

  return (
    <div className="page-content">
      <PageHeader
        title="Produits simples"
        subtitle={EPICERIE_LABELS.simpleProductsSubtitle}
        badge={filtered.length}
        action={<button type="button" className="btn" onClick={openCreate}>+ Nouveau produit</button>}
      />

      <QueryErrorBanner error={queryError} onRetry={() => refetch()} />

      <SectionCard>
        <SearchBar value={filter} onChange={changeFilter} placeholder="Rechercher par nom, vendeur ou catégorie…" />
      </SectionCard>

      <EmptyState loading={loading && items.length === 0} empty={!loading && filtered.length === 0} emptyTitle="Aucun produit" emptyHint="Ajoutez un pain maison, des fruits, etc." />

      {filtered.length > 0 ? (
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
                {item.badge ? <span className="product-card-badge">{item.badge}</span> : null}
                <span className={`badge ${item.isAvailable ? 'open' : 'closed'}`}>
                  {item.isAvailable ? 'Dispo' : 'Off'}
                </span>
              </div>
              <div className="product-card-body">
                <h3 className="entity-card-title">{item.name}</h3>
                <p className="entity-card-meta">{item.seller}</p>
                <p className="entity-card-meta muted">
                  {categories.find((c: { id: string }) => c.id === item.marketCategoryId)?.label ?? '—'} · {item.price} FCFA
                </p>
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
        title={form.id ? 'Modifier le produit' : 'Nouveau produit simple'}
        subtitle="Vendu par un particulier — sans restaurant."
        wide
        footer={<ModalFormFooter formId={FORM_ID} onCancel={() => setModalOpen(false)} saving={saving} submitLabel={form.id ? 'Enregistrer' : 'Créer le produit'} />}
      >
        <form id={FORM_ID} className="modal-form" onSubmit={onSubmit}>
          <FormSection title="Produit">
            <div className="form-grid form-grid-2">
              <Field label="Nom" required>
                <input value={form.name ?? ''} onChange={(e) => patchForm({ name: e.target.value })} required />
              </Field>
              <Field label="Prix (FCFA)" required>
                <input type="number" min={0} value={form.price ?? 0} onChange={(e) => patchForm({ price: Number(e.target.value) })} required />
              </Field>
              <Field label="Vendeur" required>
                <input value={form.seller ?? ''} onChange={(e) => patchForm({ seller: e.target.value })} required />
              </Field>
              <Field label={EPICERIE_LABELS.fieldCategory} required>
                <select value={form.marketCategoryId ?? ''} onChange={(e) => patchForm({ marketCategoryId: e.target.value })} required>
                  <option value="">Choisir…</option>
                  {categories.map((cat: { id: string; label: string }) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </Field>
              <div className="form-span-2">
                <Field label="Description">
                  <textarea rows={3} value={form.description ?? ''} onChange={(e) => patchForm({ description: e.target.value })} />
                </Field>
              </div>
              <Field label="Badge">
                <input value={form.badge ?? ''} onChange={(e) => patchForm({ badge: e.target.value })} placeholder="Du jour, Fait maison…" />
              </Field>
              <Field label="Ordre">
                <input type="number" value={form.sortOrder ?? 0} onChange={(e) => patchForm({ sortOrder: Number(e.target.value) })} />
              </Field>
              <div className="form-span-2">
                <ImageUpload variant="product" label="Photo du produit" value={form.imageUrl ?? ''} onChange={(url) => patchForm({ imageUrl: url })} />
              </div>
              <div className="form-span-2 checkbox-row">
                <label className="checkbox">
                  <input type="checkbox" checked={form.isAvailable !== false} onChange={(e) => patchForm({ isAvailable: e.target.checked })} />
                  Disponible
                </label>
                <label className="checkbox">
                  <input type="checkbox" checked={!!form.isFeatured} onChange={(e) => patchForm({ isFeatured: e.target.checked })} />
                  Populaire (accueil)
                </label>
              </div>
            </div>
          </FormSection>
          {error ? <p className="field-error">{error}</p> : null}
        </form>
      </Modal>
    </div>
  );
}
