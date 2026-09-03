const PROD_API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ??
  'https://biso-api.onrender.com';

const LOCAL_API_URL =
  import.meta.env.VITE_API_LOCAL_URL?.replace(/\/$/, '') ??
  'http://localhost:3001';

export type ApiMode = 'auto' | 'local' | 'prod';
export type ApiTarget = 'local' | 'prod';

export function getApiMode(): ApiMode {
  const mode = import.meta.env.VITE_API_MODE;
  if (mode === 'local' || mode === 'prod') return mode;
  return 'auto';
}

let activeApiUrl = PROD_API_URL;
let activeApiTarget: ApiTarget = 'prod';

export function getApiUrl(): string {
  return activeApiUrl;
}

export function getApiTarget(): ApiTarget {
  return activeApiTarget;
}

export function getProdApiUrl(): string {
  return PROD_API_URL;
}

export function getLocalApiUrl(): string {
  return LOCAL_API_URL;
}

async function isApiReachable(baseUrl: string, timeoutMs = 2500): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Dev + mode auto : backend local s'il répond sur /health, sinon Render.
 * Build prod (Netlify) : toujours VITE_API_URL.
 */
export async function bootstrapApiUrl(): Promise<string> {
  const localUrl = LOCAL_API_URL;
  const prodUrl = PROD_API_URL;
  const mode = getApiMode();

  if (import.meta.env.PROD) {
    activeApiUrl = prodUrl;
    activeApiTarget = 'prod';
    return activeApiUrl;
  }

  if (mode === 'local') {
    activeApiUrl = localUrl;
    activeApiTarget = 'local';
    return activeApiUrl;
  }

  if (mode === 'prod') {
    activeApiUrl = prodUrl;
    activeApiTarget = 'prod';
    return activeApiUrl;
  }

  if (await isApiReachable(localUrl)) {
    activeApiUrl = localUrl;
    activeApiTarget = 'local';
  } else {
    activeApiUrl = prodUrl;
    activeApiTarget = 'prod';
  }

  if (import.meta.env.DEV) {
    console.info(`[dashboard] API ${activeApiTarget} → ${activeApiUrl}`);
  }

  return activeApiUrl;
}

export function apiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getApiUrl()}${normalized}`;
}
