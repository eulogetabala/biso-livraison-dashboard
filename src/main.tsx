import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { initApolloClient } from './apollo';
import { bootstrapApiUrl } from './lib/api-config';
import { AuthProvider } from './auth';
import App from './App';
import './styles.css';

async function start() {
  const apiBase = await bootstrapApiUrl();
  const client = initApolloClient(apiBase);

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ApolloProvider client={client}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ApolloProvider>
    </React.StrictMode>,
  );
}

void start();
