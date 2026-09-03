import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { apolloClient } from './apollo';
import { setUnauthorizedHandler } from './lib/auth-session';

const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        firstName
        lastName
        role
        phone
        partnerRestaurantId
      }
    }
  }
`;

type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string;
  partnerRestaurantId?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('biso_admin_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('biso_admin_user');
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      localStorage.removeItem('biso_admin_user');
      return null;
    }
  });
  const [loginMutation] = useMutation(LOGIN);

  const logout = useMemo(
    () => () => {
      localStorage.removeItem('biso_admin_token');
      localStorage.removeItem('biso_admin_user');
      setToken(null);
      setUser(null);
      apolloClient.clearStore().catch(() => undefined);
    },
    [],
  );

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      async login(phone, password) {
        const normalizedPhone = phone.trim().replace(/\s+/g, '');
        const { data, errors } = await loginMutation({
          variables: { input: { phone: normalizedPhone, password } },
        });
        if (errors?.length || !data?.login) {
          throw new Error(errors?.[0]?.message ?? 'Connexion impossible');
        }
        const result = data.login;
        if (result.user.role !== 'ADMIN' && result.user.role !== 'PARTNER') {
          throw new Error('Accès réservé aux administrateurs et partenaires.');
        }
        localStorage.setItem('biso_admin_token', result.accessToken);
        localStorage.setItem('biso_admin_user', JSON.stringify(result.user));
        setToken(result.accessToken);
        setUser(result.user);
      },
      logout,
    }),
    [loginMutation, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
