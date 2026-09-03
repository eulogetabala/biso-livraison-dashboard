import { getApiMode, getApiTarget, getApiUrl } from '../lib/api-config';

export default function ApiTargetBadge() {
  if (!import.meta.env.DEV) return null;

  const target = getApiTarget();
  const mode = getApiMode();
  const label = target === 'local' ? 'API locale' : 'API Render';
  const hint =
    mode === 'auto'
      ? 'Mode auto — bascule selon /health'
      : mode === 'local'
        ? 'Mode local forcé'
        : 'Mode Render forcé';

  return (
    <div
      className={`api-target-badge api-target-badge--${target}`}
      title={`${hint}\n${getApiUrl()}`}
    >
      <span className="api-target-badge-dot" aria-hidden />
      {label}
    </div>
  );
}
