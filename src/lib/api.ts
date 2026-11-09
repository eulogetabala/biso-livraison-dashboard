import { apiUrl } from './api-config';

/** Formats acceptés par le backend (uploads.service.ts). */
export const UPLOAD_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

/** Doit rester aligné avec MAX_UPLOAD_SIZE côté backend. */
const MAX_UPLOAD_MB = 10;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** Au-delà, l'image est redimensionnée/compressée avant l'envoi. */
const COMPRESS_THRESHOLD = 1.5 * 1024 * 1024;
const MAX_DIMENSION = 1920;

async function readErrorMessage(res: Response): Promise<string> {
  if (res.status === 413) {
    return `Image trop lourde (max ${MAX_UPLOAD_MB} Mo).`;
  }

  try {
    const data: unknown = await res.json();
    if (data && typeof data === 'object') {
      const message = (data as { message?: unknown }).message;
      if (Array.isArray(message)) {
        const joined = message.filter((m): m is string => typeof m === 'string').join(' · ');
        if (joined) return joined;
      }
      if (typeof message === 'string' && message.trim()) return message;
    }
  } catch {
    // Réponse non JSON : on retombe sur le message générique.
  }

  if (res.status === 401 || res.status === 403) {
    return 'Session expirée : reconnectez-vous puis réessayez.';
  }
  return `Upload échoué (erreur ${res.status}).`;
}

/**
 * Redimensionne + compresse les images lourdes (photos de téléphone) pour
 * rester sous la limite du serveur. En cas d'échec, le fichier d'origine est
 * renvoyé tel quel.
 */
async function optimizeImage(file: File): Promise<File> {
  if (file.type === 'image/gif' || file.size <= COMPRESS_THRESHOLD) return file;
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const largestSide = Math.max(bitmap.width, bitmap.height);
    const scale = largestSide > MAX_DIMENSION ? MAX_DIMENSION / largestSide : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    if (scale === 1 && file.size <= MAX_UPLOAD_BYTES) {
      bitmap.close?.();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.85),
    );
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  }
}

export async function uploadImage(file: File, token: string): Promise<string> {
  if (/\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif') {
    throw new Error(
      'Format HEIC (iPhone) non pris en charge. Exportez la photo en JPG/PNG ou activez « Formats les plus compatibles » sur iPhone.',
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(
      `Format non pris en charge${file.type ? ` (${file.type})` : ''}. Utilisez JPG, PNG, WebP ou GIF.`,
    );
  }

  const optimized = await optimizeImage(file);

  if (optimized.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Image trop lourde (max ${MAX_UPLOAD_MB} Mo).`);
  }

  const form = new FormData();
  form.append('file', optimized);

  const res = await fetch(apiUrl('/uploads/image'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  const data = (await res.json()) as { url: string };
  return data.url.startsWith('http') ? data.url : apiUrl(data.url);
}

export function assetUrl(path?: string | null): string {
  if (!path) return '';
  return apiUrl(path);
}
