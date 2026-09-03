import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Field from '../components/Field';
import FormSection from '../components/FormSection';
import ModalFormFooter from '../components/ModalFormFooter';
import EmptyState from '../components/EmptyState';
import { CUISINES_QUERY, DELETE_CUISINE, UPSERT_CUISINE } from '../graphql/admin';
import { apolloErrorMessage } from '../lib/apollo-error';

type CuisineRow = {
  id: string;
  value: string;
  label: string;
  emoji?: string | null;
  sortOrder: number;
  isActive: boolean;
};

const FORM_ID = 'cuisine-form';

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
    setForm({ value: '', label: '', emoji: '🍽️', sortOrder: rows.length + 1, isActive: true });
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
    setSaving(true);
    setError('');
    try {
      await upsertCuisine({
        variables: {
          input: {
            id: form.id,
            value: (form.value ?? '').trim().toUpperCase(),
            label: (form.label ?? '').trim(),
            emoji: form.emoji?.trim() || undefined,
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
              <div className="cuisine-card-emoji">{row.emoji ?? '🍽️'}</div>
              <div className="cuisine-card-body">
                <h3 className="entity-card-title">{row.label}</h3>
                <code className="cuisine-card-code">{row.value}</code>
                <p className="entity-card-meta muted">Ordre {row.sortOrder}</p>
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
        footer={<ModalFormFooter formId={FORM_ID} onCancel={() => setModalOpen(false)} saving={saving} />}
      >
        <form id={FORM_ID} className="modal-form" onSubmit={onSubmit}>
          <FormSection title="Type de cuisine">
            <div className="form-grid">
              <Field label="Code" required hint="Ex. PIZZA, AFRICAIN">
                <input value={form.value ?? ''} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
              </Field>
              <Field label="Label affiché" required>
                <input value={form.label ?? ''} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
              </Field>
              <Field label="Emoji">
                <input value={form.emoji ?? ''} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
              </Field>
              <Field label="Ordre">
                <input type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </Field>
            </div>
          </FormSection>
          {error ? <p className="field-error">{error}</p> : null}
        </form>
      </Modal>
    </div>
  );
}
