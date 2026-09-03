import { FormEvent, useState } from 'react';
import { ApolloError } from '@apollo/client';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import ApiTargetBadge from '../components/ApiTargetBadge';
import logo from '../../assets/logo.png';

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApolloError) {
    return error.graphQLErrors[0]?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Connexion impossible';
}

export default function LoginPage() {
  const { login, token } = useAuth();
  const [phone, setPhone] = useState('+242065644299');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(phone.trim(), password);
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="login-brand">
          <img src={logo} alt="Biso Express" className="login-logo" />
          <p className="login-tagline">Plus qu&apos;un service, une solution.</p>
        </div>
        <h2>Connexion Manager</h2>
        <p className="muted">Gérez restaurants, menus et contenu de l&apos;application.</p>
        <ApiTargetBadge />
        <form className="form-grid login-form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field-label">Téléphone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">Mot de passe</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error ? <p className="field-error">{error}</p> : null}
          <button className="btn login-submit" type="submit" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
