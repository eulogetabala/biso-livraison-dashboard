import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { apolloErrorMessage } from '../lib/apollo-error';
import { isUnauthorizedError } from '../lib/auth-session';

type Props = {
  error: unknown;
  onRetry?: () => void;
};

export default function QueryErrorBanner({ error, onRetry }: Props) {
  if (!error) return null;

  const unauthorized = isUnauthorizedError(error);

  return (
    <div className={`query-error-banner ${unauthorized ? 'query-error-banner--auth' : ''}`} role="alert">
      <AlertCircle size={18} aria-hidden />
      <div className="query-error-banner-body">
        <strong>{unauthorized ? 'Session expirée' : 'Données indisponibles'}</strong>
        <p>
          {unauthorized
            ? 'Votre session a expiré. Reconnectez-vous pour voir les ventes et statistiques.'
            : apolloErrorMessage(error, 'Impossible de charger les données. Vérifiez que le backend tourne.')}
        </p>
      </div>
      {unauthorized ? (
        <Link to="/login" className="btn btn-sm">
          Se reconnecter
        </Link>
      ) : onRetry ? (
        <button type="button" className="btn secondary btn-sm" onClick={onRetry}>
          Réessayer
        </button>
      ) : null}
    </div>
  );
}
