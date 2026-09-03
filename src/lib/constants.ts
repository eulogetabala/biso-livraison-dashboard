export const RESTAURANT_MENU_SECTIONS = [
  { key: 'repas', label: 'Repas', categories: ['MAIN_COURSE'] },
  { key: 'dejeuner', label: 'Déjeuner', categories: ['LUNCH'] },
  { key: 'entrees', label: 'Entrées', categories: ['APPETIZER'] },
  { key: 'boissons', label: 'Boissons', categories: ['DRINK'] },
  { key: 'desserts', label: 'Desserts', categories: ['DESSERT'] },
  { key: 'fruits', label: 'Fruits', categories: ['FRUIT'] },
  { key: 'snacks', label: 'Snacks', categories: ['SNACK'] },
] as const;

export const RESTAURANT_TYPES = [
  { value: 'RESTAURANT', label: 'Restaurant (repas)' },
] as const;

/** Libellés affichés dans le dashboard — le code technique reste MARKET côté API. */
export const EPICERIE_LABELS = {
  name: 'Épicerie Biso',
  short: 'Épicerie',
  defaultSeller: 'Épicerie Biso',
  navCategories: 'Catégories produits',
  pageCategoriesTitle: 'Catégories produits',
  pageCategoriesSubtitle:
    "Nom + icône PNG/SVG pour l'accueil, image de fond pour l'écran « Catégories ». Réservé aux produits de l'épicerie.",
  fieldCategory: 'Catégorie produit',
  fieldCategoryHint: "Affichée sur l'accueil et l'écran Catégories de l'app.",
  menusSubtitle:
    'Plats par restaurant, regroupés par libellé (Déjeuner, Repas, Boisson…). Les suppléments se gèrent plat par plat.',
  simpleProductsSubtitle:
    'Produits vendus par des particuliers (pain maison, fruits…) — sans lien avec un restaurant.',
  typeBadge: '(Épicerie)',
  typeHint:
    "Choisis « Restaurant » pour un resto classique, « Épicerie / Produits » pour le catalogue courses (pain, fruits, épicerie…).",
} as const;

export function isEpicerieType(type?: string | null): boolean {
  return type === 'MARKET';
}

export function commerceTypeLabel(type?: string | null): string {
  if (isEpicerieType(type)) return EPICERIE_LABELS.short;
  return 'Restaurant';
}

export const MENU_ITEM_CATEGORIES = [
  { value: 'APPETIZER', label: 'Entrée' },
  { value: 'MAIN_COURSE', label: 'Plat principal' },
  { value: 'DESSERT', label: 'Dessert' },
  { value: 'DRINK', label: 'Boisson' },
  { value: 'SNACK', label: 'Snack' },
  { value: 'SIDE', label: 'Accompagnement' },
  { value: 'LUNCH', label: 'Déjeuner' },
  { value: 'FRUIT', label: 'Fruit' },
] as const;

export const BANNER_LINK_TYPES = [
  { value: 'RESTAURANTS', label: 'Liste restaurants' },
  { value: 'PRODUCTS', label: 'Produits & épicerie' },
  { value: 'PARCEL', label: 'Expédition colis' },
  { value: 'NONE', label: 'Aucune action' },
  { value: 'URL', label: 'Lien personnalisé' },
] as const;

export const DEFAULT_CITY = 'Brazzaville';

export function menuCategoryLabel(value: string): string {
  return MENU_ITEM_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}

export function menuSectionForCategory(category: string): string {
  const section = RESTAURANT_MENU_SECTIONS.find((s) =>
    (s.categories as readonly string[]).includes(category),
  );
  return section?.label ?? menuCategoryLabel(category);
}
