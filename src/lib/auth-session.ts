/** Callback enregistré par AuthProvider pour gérer les 401 GraphQL. */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function notifyUnauthorized() {
  onUnauthorized?.();
}

export function isUnauthorizedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const gqlErrors = (error as { graphQLErrors?: Array<{ message?: string; extensions?: { code?: string } }> }).graphQLErrors;
  if (gqlErrors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED' || /unauthorized/i.test(e.message ?? ''))) {
    return true;
  }
  const message = (error as { message?: string }).message ?? '';
  return /unauthorized/i.test(message);
}
