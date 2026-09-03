export type DashboardRole = 'ADMIN' | 'PARTNER';

/** Routes accessibles aux partenaires restaurant (aligné avec le backend). */
export const PARTNER_ROUTES: readonly string[] = [
  '/',
  '/orders',
  '/revenue',
  '/restaurants',
  '/menus',
];

export function isAdmin(role: string | undefined): role is 'ADMIN' {
  return role === 'ADMIN';
}

export function isPartner(role: string | undefined): role is 'PARTNER' {
  return role === 'PARTNER';
}

export function roleLabel(role: string | undefined): string {
  if (role === 'PARTNER') return 'Partenaire';
  if (role === 'ADMIN') return 'Administrateur';
  return '';
}

export function canAccessPath(role: string | undefined, pathname: string): boolean {
  if (!role) return false;
  if (isAdmin(role)) return true;
  if (isPartner(role)) {
    return PARTNER_ROUTES.includes(pathname);
  }
  return false;
}

export function filterByRole<T extends { adminOnly?: boolean }>(
  items: T[],
  role: string | undefined,
): T[] {
  if (isAdmin(role)) return items;
  return items.filter((item) => !item.adminOnly);
}
