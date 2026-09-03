import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { notifyUnauthorized } from './lib/auth-session';

export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const httpLink = createHttpLink({
  uri: API_URL ? `${API_URL}/graphql` : '/graphql',
});

const retryLink = new RetryLink({
  delay: {
    initial: 1500,
    max: 8000,
    jitter: true,
  },
  attempts: {
    max: 4,
    retryIf: (error) => Boolean(error && !error.result),
  },
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('biso_admin_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const errorLink = onError(({ graphQLErrors }) => {
  const unauthorized = graphQLErrors?.some(
    (err) =>
      err.extensions?.code === 'UNAUTHENTICATED' ||
      /unauthorized/i.test(err.message),
  );
  if (unauthorized) {
    notifyUnauthorized();
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, retryLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { errorPolicy: 'all' },
    query: { errorPolicy: 'all' },
  },
});

export function apiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return API_URL ? `${API_URL}${normalized}` : normalized;
}
