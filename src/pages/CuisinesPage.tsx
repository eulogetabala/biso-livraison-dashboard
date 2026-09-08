import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Field from '../components/Field';
import FormSection from '../components/FormSection';
import ModalFormFooter from '../components/ModalFormFooter';
import EmptyState from '../components/EmptyState';
import ImageUpload from '../components/ImageUpload';
import { CUISINES_QUERY, DELETE_CUISINE, UPSERT_CUISINE } from '../graphql/admin';
import { apolloErrorMessage } from '../lib/apollo-error';
import { assetUrl } from '../lib/api';
import { slugCuisineValue } from '../lib/cuisine-types';

type CuisineRow = {
  id: string;
  value: string;
  label: string;
  emoji?: string | null;
  iconUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
};

const FORM_ID = 'cuisine-form';

function emptyCuisineForm(sortOrder: number): Partial<CuisineRow> {
  return { label: '', iconUrl: '', sortOrder, isActive: true };
}

export default function CuisinesPage() {
  const { data, loading, refetch } = useQuery(CUISINES_QUERY);
  const [upsertCuisine] = useMutation(UPSERT_CUISINE);
  const [deleteCuisine] = useMutation(DELETE_CUISINE);

  const rows: CuisineRow[] = data?.allCuisineTypes ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<CuisineRow>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm(emptyCuisineForm(rows.length + 1));
    setError('');
    setModalOpen(true);
  }

  function openEdit(row: CuisineRow) {
    setForm({ ...row });
    setError('');
    setModalOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const label = (form.label ?? '').trim();
    const iconUrl = (form.iconUrl ?? '').trim();

    if (!iconUrl) {
      setError('Ajoutez une icône PNG ou SVG.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const value = form.id ? (form.value ?? slugCuisineValue(label)) : slugCuisineValue(label);
      await upsertCuisine({
        variables: {
          input: {
            id: form.id,
            value,
            label,
            iconUrl,
            sortOrder: Number(form.sortOrder ?? 0),
            isActive: form.isActive !== false,
          },
        },
      });
      setModalOpen(false);
      await refetch();
    } catch (err) {
      setError(apolloErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Types de cuisine"
        subtitle="Filtres de l'accueil app. Un restaurant peut en avoir plusieurs."
        badge={rows.length}
        action={<button type="button" className="btn" onClick={openCreate}>+ Ajouter un type</button>}
      />

      <EmptyState loading={loading && rows.length === 0} empty={!loading && rows.length === 0} emptyTitle="Aucun type" emptyHint="Créez Africain, Pizza, Grillades…" />

      {rows.length > 0 ? (
        <div className="entity-grid entity-grid--cuisines">
          {rows.map((row) => (
            <article key={row.id} className={`entity-card cuisine-card ${row.isActive ? '' : 'is-off'}`.trim()}>
              <div className="cuisine-card-icon">
                {row.iconUrl ? (
                  <img src={assetUrl(row.iconUrl)} alt="" />
                ) : (
                  <span className="cuisine-card-icon-fallback">{row.label.charAt(0)}</span>
                )}
              </div>
              <div className="cuisine-card-body">
                <h3 className="entity-card-title">{row.label}</h3>
                <p className="entity-card-meta muted">Ordre d&apos;affichage : {row.sortOrder}</p>
                <p className="entity-card-meta muted">{row.isActive ? 'Visible dans l\'app' : 'Masqué'}</p>
                <div className="entity-card-actions">
                  <button type="button" className="btn secondary btn-sm" onClick={() => openEdit(row)}>Modifier</button>
                  <button type="button" className="btn secondary btn-sm" onClick={() => upsertCuisine({ variables: { input: { ...row, isActive: !row.isActive } } }).then(() => refetch())}>
                    {row.isActive ? 'Masquer' : 'Activer'}
                  </button>
                  <button type="button" className="btn danger btn-sm" onClick={() => deleteCuisine({ variables: { id: row.id } }).then(() => refetch())}>Supprimer</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Modifier le type' : 'Nouveau type de cuisine'}
        subtitle="Icône vectorielle affichée dans l'application mobile."
        footer={<ModalFormFooter formId={FORM_ID} onCancel={() => setModalOpen(false)} saving={saving} submitLabel={form.id ? 'Enregistrer' : 'Créer'} />}
      >
        <form id={FORM_ID} className="modal-form" onSubmit={onSubmit}>
          <FormSection title="Type de cuisine">
            <div className="form-grid form-grid-2">
              <Field label="Nom" required hint="Ex. Pizza, Africain, Grillades">
                <input value={form.label ?? ''} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
              </Field>
              <Field label="Ordre d'affichage" hint="Position dans la liste (1 = en premier)">
                <input type="number" min={1} value={form.sortOrder ?? 1} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </Field>
              <ImageUpload
                variant="logo"
                label="Icône (PNG ou SVG)"
                hint="64×64 px recommandé — fond transparent."
                value={form.iconUrl ?? ''}
                onChange={(url) => setForm({ ...form, iconUrl: url })}
              />
              <label className="checkbox form-span-2">
                <input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Visible dans l&apos;application
              </label>
            </div>
          </FormSection>
          {error ? <p className="field-error">{error}</p> : null}
        </form>
      </Modal>
    </div>
  );
}
