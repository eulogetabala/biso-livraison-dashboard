import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { notifyUnauthorized } from './lib/auth-session';

export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const httpLink = createHttpLink({
  uri: API_URL ? `${API_URL}/graphql` : '/graphql',
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
  link: from([errorLink, authLink, httpLink]),
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
