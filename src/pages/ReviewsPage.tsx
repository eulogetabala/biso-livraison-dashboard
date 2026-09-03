import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Star } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import Modal from '../components/Modal';
import Field from '../components/Field';
import FormSection from '../components/FormSection';
import ModalFormFooter from '../components/ModalFormFooter';
import EmptyState from '../components/EmptyState';
import QueryErrorBanner from '../components/QueryErrorBanner';
import SearchBar from '../components/SearchBar';
import FilterToolbar from '../components/FilterToolbar';
import {
  DELETE_REVIEW,
  RATING_FILTERS,
  REVIEWS_QUERY,
  UPDATE_REVIEW,
  type ReviewRow,
} from '../graphql/reviews';
import { apolloErrorMessage } from '../lib/apollo-error';
import PaginationBar from '../components/PaginationBar';
import { PAGE_SIZE } from '../lib/pagination';

const FORM_ID = 'review-form';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="review-stars" aria-label={`${rating} sur 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={14}
          aria-hidden
          className={index < rating ? 'review-star review-star--filled' : 'review-star'}
        />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{ id: string; rating: number; comment: string }>({
    id: '',
    rating: 5,
    comment: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, loading, error: queryError, refetch } = useQuery(REVIEWS_QUERY, {
    variables: { page, limit: PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
  });

  const [updateReview] = useMutation(UPDATE_REVIEW);
  const [deleteReview] = useMutation(DELETE_REVIEW);

  const rows: ReviewRow[] = data?.reviews?.items ?? [];
  const pageInfo = data?.reviews?.pageInfo;
  const total = pageInfo?.totalItems ?? 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rating = ratingFilter ? Number(ratingFilter) : null;
    return rows.filter((row) => {
      if (rating != null && row.rating !== rating) return false;
      if (!q) return true;
      const author = `${row.author?.firstName ?? ''} ${row.author?.lastName ?? ''}`.toLowerCase();
      return (
        author.includes(q)
        || (row.author?.phone ?? '').includes(q)
        || (row.restaurant?.name ?? '').toLowerCase().includes(q)
        || (row.comment ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, ratingFilter]);

  function openEdit(row: ReviewRow) {
    setForm({
      id: row.id,
      rating: row.rating,
      comment: row.comment ?? '',
    });
    setError('');
    setModalOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.id) return;
    setSaving(true);
    setError('');
    try {
      await updateReview({
        variables: {
          input: {
            id: form.id,
            rating: form.rating,
            comment: form.comment.trim() || undefined,
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

  async function onDelete(row: ReviewRow) {
    const author = row.author ? `${row.author.firstName} ${row.author.lastName}` : 'Client';
    if (!window.confirm(`Supprimer l'avis de ${author} ? Les notes restaurant/livreur seront recalculées.`)) return;
    try {
      await deleteReview({ variables: { id: row.id } });
      await refetch();
    } catch (err) {
      alert(apolloErrorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Avis clients"
        subtitle="Modérez les notes laissées après livraison — impact sur les étoiles restaurant et livreur."
        badge={total}
      />

      <QueryErrorBanner error={queryError} onRetry={() => refetch()} />

      <SectionCard
        title="Liste des avis"
        subtitle={total > 0 ? `${total} avis au total` : 'Aucun avis pour le moment'}
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
            statusFilter={ratingFilter}
            statusOptions={RATING_FILTERS}
            onStatusChange={(value) => { setRatingFilter(value); setPage(1); }}
          />
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Client, restaurant, commentaire…"
          />
        </div>

        <EmptyState
          loading={loading && rows.length === 0}
          empty={!loading && filtered.length === 0}
          emptyTitle="Aucun avis"
          emptyHint="Les clients peuvent noter après une commande livrée."
        />

        {!loading || rows.length > 0 ? (
          filtered.length > 0 ? (
            <>
              <div className="orders-table-wrap">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Client</th>
                      <th>Note</th>
                      <th>Commentaire</th>
                      <th>Restaurant</th>
                      <th>Livreur</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {new Date(row.createdAt).toLocaleString('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td>
                          {row.author ? `${row.author.firstName} ${row.author.lastName}` : '—'}
                          {row.author?.phone ? (
                            <span className="muted orders-sub">{row.author.phone}</span>
                          ) : null}
                        </td>
                        <td>
                          <Stars rating={row.rating} />
                        </td>
                        <td className="review-comment-cell">
                          {row.comment?.trim() ? row.comment : <span className="muted">—</span>}
                        </td>
                        <td>{row.restaurant?.name ?? '—'}</td>
                        <td>
                          {row.driver
                            ? `${row.driver.firstName} ${row.driver.lastName}`
                            : '—'}
                        </td>
                        <td>
                          <div className="orders-actions">
                            <button type="button" className="btn secondary btn-sm" onClick={() => openEdit(row)}>
                              Modifier
                            </button>
                            <button type="button" className="btn danger btn-sm" onClick={() => onDelete(row)}>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pageInfo ? (
                <PaginationBar
                  pageInfo={pageInfo}
                  pageSize={PAGE_SIZE}
                  loading={loading}
                  onPageChange={setPage}
                />
              ) : null}
            </>
          ) : null
        ) : null}
      </SectionCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Modifier l'avis"
        subtitle="La note recalcule automatiquement le restaurant et le livreur concernés."
        footer={
          <ModalFormFooter
            formId={FORM_ID}
            onCancel={() => setModalOpen(false)}
            saving={saving}
            submitLabel="Enregistrer"
          />
        }
      >
        <form id={FORM_ID} className="modal-form" onSubmit={onSubmit}>
          <FormSection title="Avis">
            <Field label="Note (1 à 5)" required>
              <select
                value={form.rating}
                onChange={(e) => setForm((current) => ({ ...current, rating: Number(e.target.value) }))}
                required
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>{value} étoile{value > 1 ? 's' : ''}</option>
                ))}
              </select>
            </Field>
            <Field label="Commentaire">
              <textarea
                rows={4}
                value={form.comment}
                onChange={(e) => setForm((current) => ({ ...current, comment: e.target.value }))}
                placeholder="Texte laissé par le client"
              />
            </Field>
          </FormSection>
          {error ? <p className="field-error">{error}</p> : null}
        </form>
      </Modal>
    </>
  );
}
