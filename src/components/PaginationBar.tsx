import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationInfo } from '../lib/pagination';

export type { PaginationInfo };

type Props = {
  pageInfo: PaginationInfo;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
  loading?: boolean;
};

export default function PaginationBar({
  pageInfo,
  pageSize,
  onPageChange,
  className,
  loading = false,
}: Props) {
  const { totalItems, totalPages, currentPage, hasNextPage, hasPreviousPage } = pageInfo;

  if (totalItems === 0) return null;

  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);
  const multiPage = totalPages > 1;

  return (
    <nav
      className={['pagination-bar', className].filter(Boolean).join(' ')}
      aria-label="Pagination"
    >
      <p className="pagination-summary muted">
        {rangeStart}–{rangeEnd} sur {totalItems}
      </p>

      {multiPage ? (
        <div className="pagination-controls">
          <button
            type="button"
            className="btn secondary btn-sm pagination-btn"
            disabled={!hasPreviousPage || loading}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            aria-label="Page précédente"
          >
            <ChevronLeft size={16} aria-hidden />
            Précédent
          </button>
          <span className="pagination-page-label">
            Page {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            className="btn secondary btn-sm pagination-btn"
            disabled={!hasNextPage || loading}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Page suivante"
          >
            Suivant
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
