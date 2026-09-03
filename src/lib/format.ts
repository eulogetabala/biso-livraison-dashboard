export function formatFcfa(value: number): string {
  return `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function lastNDaysRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export type DateRangePreset = 'all' | '7d' | '14d' | '30d' | 'month' | 'year' | 'custom';

export function currentYearRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export function rangeFromPreset(
  preset: DateRangePreset,
  custom?: { from: string; to: string },
): { from?: string; to?: string } {
  switch (preset) {
    case 'all':
      return {};
    case '7d':
      return lastNDaysRange(7);
    case '14d':
      return lastNDaysRange(14);
    case '30d':
      return lastNDaysRange(30);
    case 'month':
      return currentMonthRange();
    case 'year':
      return currentYearRange();
    case 'custom':
      return custom?.from && custom?.to ? custom : lastNDaysRange(14);
    default:
      return lastNDaysRange(14);
  }
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  IN_TRANSIT: 'En livraison',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};
