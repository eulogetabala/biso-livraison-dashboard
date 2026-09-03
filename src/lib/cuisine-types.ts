export type CuisineOption = {
  value: string;
  label: string;
  emoji?: string | null;
};

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
      if (!match) return value;
      return match.emoji ? `${match.emoji} ${match.label}` : match.label;
    })
    .join(' · ');
}
