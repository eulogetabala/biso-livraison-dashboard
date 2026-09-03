import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Field from '../components/Field';
import FormSection from '../components/FormSection';
import ModalFormFooter from '../components/ModalFormFooter';
import EmptyState from '../components/EmptyState';
import ImageUpload from '../components/ImageUpload';
import { BANNERS_QUERY, DELETE_BANNER, UPSERT_BANNER } from '../graphql/admin';
import { BANNER_LINK_TYPES } from '../lib/constants';
import { apolloErrorMessage } from '../lib/apollo-error';
import { assetUrl } from '../lib/api';

type BannerRow = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  ctaLabel?: string | null;
  linkType: string;
  linkValue?: string | null;
  sortOrder: number;
  isActive: boolean;
};

const FORM_ID = 'banner-form';

const emptyBanner = (): Omit<BannerRow, 'id'> & { id?: string } => ({
  title: '',
  subtitle: '',
  imageUrl: '',
  ctaLabel: 'Découvrir',
  linkType: 'RESTAURANTS',
  linkValue: '',
  sortOrder: 1,
  isActive: true,
});

export default function BannersPage() {
  const { data, loading, refetch } = useQuery(BANNERS_QUERY);
  const [upsertBanner] = useMutation(UPSERT_BANNER);
  const [deleteBanner] = useMutation(DELETE_BANNER);

  const rows: BannerRow[] = data?.allHomeBanners ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyBanner());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm({ ...emptyBanner(), sortOrder: rows.length + 1 });
    setError('');
    setModalOpen(true);
  }

  function openEdit(row: BannerRow) {
    setForm({ ...row });
    setError('');
    setModalOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.imageUrl) {
      setError('L\'image du slider est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await upsertBanner({
        variables: {
          input: {
            id: form.id,
            title: form.title.trim(),
            subtitle: form.subtitle?.trim() || undefined,
            imageUrl: form.imageUrl,
            ctaLabel: form.ctaLabel?.trim() || 'Découvrir',
            linkType: form.linkType,
            linkValue: form.linkType === 'URL' ? form.linkValue?.trim() || undefined : undefined,
            sortOrder: Number(form.sortOrder),
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
        title="Bannières accueil"
        subtitle="Slider hero mobile : image plein écran, titre et action."
        badge={rows.length}
        action={<button type="button" className="btn" onClick={openCreate}>+ Nouvelle bannière</button>}
      />

      <EmptyState loading={loading && rows.length === 0} empty={!loading && rows.length === 0} emptyTitle="Aucune bannière" emptyHint="Créez le premier slide de l'accueil." />

      {rows.length > 0 ? (
        <div className="banner-grid">
          {rows.map((row) => (
            <article key={row.id} className={`banner-card entity-card ${row.isActive ? '' : 'banner-card-off'}`.trim()}>
              <div className="banner-card-hero">
                <img src={assetUrl(row.imageUrl)} alt="" className="banner-card-image" />
                <div className="banner-card-overlay">
                  <strong>{row.title}</strong>
                  {row.subtitle ? <p>{row.subtitle}</p> : null}
                  <span className="banner-card-cta">{row.ctaLabel} →</span>
                </div>
              </div>
              <div className="banner-card-body">
                <p className="entity-card-meta muted">Destination : {row.linkType} · Ordre {row.sortOrder}</p>
                <div className="entity-card-actions">
                  <button type="button" className="btn secondary btn-sm" onClick={() => openEdit(row)}>Modifier</button>
                  <button type="button" className="btn secondary btn-sm" onClick={() => upsertBanner({ variables: { input: { ...row, isActive: !row.isActive } } }).then(() => refetch())}>
                    {row.isActive ? 'Masquer' : 'Activer'}
                  </button>
                  <button type="button" className="btn danger btn-sm" onClick={() => deleteBanner({ variables: { id: row.id } }).then(() => refetch())}>Supprimer</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Modifier la bannière' : 'Nouvelle bannière'}
        subtitle="Aperçu tel qu'affiché dans le slider."
        wide
        footer={<ModalFormFooter formId={FORM_ID} onCancel={() => setModalOpen(false)} saving={saving} />}
      >
        <form id={FORM_ID} className="modal-form" onSubmit={onSubmit}>
          <FormSection title="Visuel">
            <ImageUpload variant="banner" label="Image du slide" value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
          </FormSection>
          <FormSection title="Contenu & action">
            <div className="form-grid form-grid-2">
              <Field label="Titre" required>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </Field>
              <Field label="Texte du bouton">
                <input value={form.ctaLabel ?? ''} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
              </Field>
              <div className="form-span-2">
                <Field label="Sous-titre">
                  <textarea rows={2} value={form.subtitle ?? ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
                </Field>
              </div>
              <Field label="Destination">
                <select value={form.linkType} onChange={(e) => setForm({ ...form, linkType: e.target.value })}>
                  {BANNER_LINK_TYPES.map((link) => (
                    <option key={link.value} value={link.value}>{link.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ordre">
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </Field>
              {form.linkType === 'URL' ? (
                <div className="form-span-2">
                  <Field label="Lien personnalisé">
                    <input value={form.linkValue ?? ''} onChange={(e) => setForm({ ...form, linkValue: e.target.value })} />
                  </Field>
                </div>
              ) : null}
              <label className="checkbox form-span-2">
                <input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Visible dans le slider
              </label>
            </div>
          </FormSection>
          {error ? <p className="field-error">{error}</p> : null}
        </form>
      </Modal>
    </div>
  );
}
