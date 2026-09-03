import { ApolloError } from '@apollo/client';

function isNetworkError(error: ApolloError): boolean {
  return Boolean(
    error.networkError ||
      /failed to fetch|network error|load failed|502|503|504/i.test(error.message),
  );
}

export function apolloErrorMessage(error: unknown, fallback = 'Une erreur est survenue'): string {
  if (error instanceof ApolloError) {
    if (isNetworkError(error)) {
      return 'API injoignable (Render en veille ou redémarrage). Attendez 30 s puis cliquez Réessayer.';
    }
    return error.graphQLErrors[0]?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
