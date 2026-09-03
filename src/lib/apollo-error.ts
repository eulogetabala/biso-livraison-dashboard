import { ApolloError } from '@apollo/client';

export function apolloErrorMessage(error: unknown, fallback = 'Une erreur est survenue'): string {
  if (error instanceof ApolloError) {
    return error.graphQLErrors[0]?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
