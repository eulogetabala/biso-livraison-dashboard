import { apiUrl } from '../apollo';

export async function uploadImage(file: File, token: string): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(apiUrl('/uploads/image'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error('Upload échoué');
  const data = (await res.json()) as { url: string };
  return data.url.startsWith('http') ? data.url : apiUrl(data.url);
}

export function assetUrl(path?: string | null): string {
  if (!path) return '';
  return apiUrl(path);
}
