import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Field from '../components/Field';
import FormSection from '../components/FormSection';
import ModalFormFooter from '../components/ModalFormFooter';
import EmptyState from '../components/EmptyState';
import ImageUpload from '../components/ImageUpload';
import {
  DELETE_MARKET_CATEGORY,
  MARKET_CATEGORIES_QUERY,
  UPSERT_MARKET_CATEGORY,
  emptyCategoryForm,
  type MarketCategoryRow,
} from '../graphql/admin';
import { EPICERIE_LABELS } from '../lib/constants';
import { apolloErrorMessage } from '../lib/apollo-error';
import { assetUrl } from '../lib/api';

const FORM_ID = 'category-form';

export default function CategoriesPage() {
  const { data, loading, refetch } = useQuery(MARKET_CATEGORIES_QUERY);
  const [upsertCategory] = useMutation(UPSERT_MARKET_CATEGORY);
  const [deleteCategory] = useMutation(DELETE_MARKET_CATEGORY);

  const rows: MarketCategoryRow[] = data?.allMarketCategories ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyCategoryForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm({ ...emptyCategoryForm(), sortOrder: rows.length + 1 });
    setError('');
    setModalOpen(true);
  }

  function openEdit(row: MarketCategoryRow) {
    setForm({ ...row, iconLib: row.iconLib ?? (row.icon?.startsWith('/') || row.icon?.startsWith('http') ? 'image' : 'ionicons') });
    setError('');
    setModalOpen(true);
  }

  function patchForm(patch: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const iconUrl = form.icon?.trim() ?? '';
    const input = {
      id: form.id,
      label: form.label.trim(),
      subtitle: form.subtitle?.trim() || 'Produits disponibles',
      imageUrl: form.imageUrl || undefined,
      icon: iconUrl,
      iconLib: iconUrl ? 'image' : 'ionicons',
      tint: form.tint || '#F4F6FB',
      iconColor: form.iconColor || '#FE6400',
      sortOrder: Number(form.sortOrder ?? 0),
      isActive: form.isActive !== false,
    };

    try {
      await upsertCategory({ variables: { input } });
      setModalOpen(false);
      await refetch();
    } catch (err) {
      setError(apolloErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: MarketCategoryRow) {
    if (!window.confirm(`Supprimer la catégorie « ${row.label} » ?`)) return;
    try {
      await deleteCategory({ variables: { id: row.id } });
      await refetch();
    } catch (err) {
      alert(apolloErrorMessage(err));
    }
  }

  async function toggleActive(row: MarketCategoryRow) {
    try {
      await upsertCategory({ variables: { input: { ...row, isActive: !row.isActive } } });
      await refetch();
    } catch (err) {
      alert(apolloErrorMessage(err));
    }
  }

  return (
    <div className="page-content">
      <PageHeader
        title={EPICERIE_LABELS.pageCategoriesTitle}
        subtitle={EPICERIE_LABELS.pageCategoriesSubtitle}
        badge={rows.length}
        action={
          <button type="button" className="btn" onClick={openCreate}>
            + Nouvelle catégorie
          </button>
        }
      />

      <EmptyState loading={loading && rows.length === 0} empty={!loading && rows.length === 0} emptyTitle="Aucune catégorie" emptyHint="Créez Boulangerie, Fruits, Boissons…" />

      {rows.length > 0 ? (
        <div className="category-grid">
          {rows.map((row) => (
            <article key={row.id} className={`category-card ${row.isActive ? '' : 'category-card-off'}`.trim()}>
              <div className="category-card-visual" style={{ backgroundImage: row.imageUrl ? `url(${assetUrl(row.imageUrl)})` : undefined }}>
                <div className="category-card-icon" style={{ backgroundColor: row.tint ?? '#F4F6FB' }}>
                  {row.icon && (row.iconLib === 'image' || row.icon.startsWith('/') || row.icon.startsWith('http')) ? (
                    <img src={assetUrl(row.icon)} alt="" className="category-icon-img" />
                  ) : (
                    <span className="category-icon-fallback">{row.label.slice(0, 1)}</span>
                  )}
                </div>
              </div>
              <div className="category-card-body">
                <strong>{row.label}</strong>
                <p className="muted">{row.subtitle}</p>
                <div className="actions">
                  <button type="button" className="btn secondary" onClick={() => openEdit(row)}>Modifier</button>
                  <button type="button" className="btn secondary" onClick={() => toggleActive(row)}>
                    {row.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                  <button type="button" className="btn danger" onClick={() => onDelete(row)}>Supprimer</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        subtitle="Icône accueil + image écran Catégories."
        wide
        footer={<ModalFormFooter formId={FORM_ID} onCancel={() => setModalOpen(false)} saving={saving} submitLabel={form.id ? 'Enregistrer' : 'Créer'} />}
      >
        <form id={FORM_ID} className="modal-form" onSubmit={onSubmit}>
          <FormSection title="Identité">
            <div className="form-grid form-grid-2">
              <Field label="Nom" required>
                <input value={form.label} onChange={(e) => patchForm({ label: e.target.value })} required />
              </Field>
              <Field label="Sous-titre">
                <input value={form.subtitle ?? ''} onChange={(e) => patchForm({ subtitle: e.target.value })} />
              </Field>
              <ImageUpload variant="logo" label="Icône (PNG/SVG)" hint="64×64 px recommandé." value={form.icon ?? ''} onChange={(url) => patchForm({ icon: url, iconLib: 'image' })} />
              <ImageUpload variant="cover" label="Image de fond" hint="Écran Catégories plein écran." value={form.imageUrl ?? ''} onChange={(url) => patchForm({ imageUrl: url })} />
              <Field label="Couleur fond icône">
                <input type="color" value={form.tint ?? '#F4F6FB'} onChange={(e) => patchForm({ tint: e.target.value })} />
              </Field>
              <Field label="Ordre">
                <input type="number" value={form.sortOrder ?? 0} onChange={(e) => patchForm({ sortOrder: Number(e.target.value) })} />
              </Field>
              <label className="checkbox form-span-2">
                <input type="checkbox" checked={form.isActive !== false} onChange={(e) => patchForm({ isActive: e.target.checked })} />
                Visible dans l'application
              </label>
            </div>
          </FormSection>
          {error ? <p className="field-error">{error}</p> : null}
        </form>
      </Modal>
    </div>
  );
}
