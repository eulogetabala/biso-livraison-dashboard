export type CuisineOption = {
  value: string;
  label: string;
  emoji?: string | null;
  iconUrl?: string | null;
};

export function slugCuisineValue(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function parseCuisineTypes(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw.split(/[,|]/).map((part) => part.trim()).filter(Boolean);
}

export function serializeCuisineTypes(types: string[]): string {
  return types.join(',');
}

export function formatCuisineTypes(raw: string, cuisines: CuisineOption[]): string {
  const map = new Map(cuisines.map((c) => [c.value.toUpperCase(), c]));
  return parseCuisineTypes(raw)
    .map((value) => {
      const match = map.get(value.toUpperCase());
      return match?.label ?? value;
    })
    .join(' · ');
}
