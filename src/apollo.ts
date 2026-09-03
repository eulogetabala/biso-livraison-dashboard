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

export let apolloClient!: ApolloClient;

const retryLink = new RetryLink({
  delay: {
    initial: 1500,
    max: 8000,
    jitter: true,
  },
  attempts: {
    max: 4,
    retryIf: (error) => {
      if (!error) return false;
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 429) return false;
      return !error.result;
    },
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

export function initApolloClient(apiBaseUrl: string): ApolloClient {
  const base = apiBaseUrl.replace(/\/$/, '');
  const httpLink = createHttpLink({
    uri: `${base}/graphql`,
  });

  apolloClient = new ApolloClient({
    link: from([errorLink, retryLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { errorPolicy: 'all' },
      query: { errorPolicy: 'all' },
    },
  });

  return apolloClient;
}

/** @deprecated Utiliser apiUrl depuis lib/api-config.ts */
export { apiUrl } from './lib/api-config';
