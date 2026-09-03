import { Inbox } from 'lucide-react';

type Props = {
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
};

export default function EmptyState({
  loading,
  empty,
  emptyTitle = 'Aucun élément',
  emptyHint = 'Commencez par en ajouter un.',
}: Props) {
  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-spinner" />
        <p>Chargement…</p>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" aria-hidden>
          <Inbox size={28} strokeWidth={1.75} />
        </div>
        <strong>{emptyTitle}</strong>
        <p className="muted">{emptyHint}</p>
      </div>
    );
  }
  return null;
}
