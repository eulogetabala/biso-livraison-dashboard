import { gql } from '@apollo/client';

export const CATALOG_STATS_QUERY = gql`
  query CatalogStats {
    catalogStats {
      restaurants
      menuDishes
      simpleProducts
      supplements
    }
  }
`;

export const RESTAURANTS_QUERY = gql`
  query AdminRestaurants($page: Int = 1, $limit: Int = 100) {
    searchRestaurants(page: $page, limit: $limit, input: { onlyActive: false }) {
      items {
        id
        name
        description
        address
        city
        zipCode
        phone
        cuisineType
        imageUrl
        coverImageUrl
        rating
        deliveryFee
        estimatedDeliveryTime
        latitude
        longitude
        type
        isActive
        isFeatured
        sortOrder
      }
    }
  }
`;

export const CUISINES_QUERY = gql`
  query AdminCuisineTypes {
    allCuisineTypes {
      id
      value
      label
      emoji
      isActive
    }
  }
`;

export const CREATE_RESTAURANT = gql`
  mutation CreateRestaurant($input: CreateRestaurantInput!) {
    createRestaurant(input: $input) {
      id
      name
    }
  }
`;

export const UPDATE_RESTAURANT = gql`
  mutation UpdateRestaurant($input: UpdateRestaurantInput!) {
    updateRestaurant(input: $input) {
      id
      name
    }
  }
`;

export const DELETE_RESTAURANT = gql`
  mutation DeleteRestaurant($id: ID!) {
    deleteRestaurant(id: $id) {
      id
    }
  }
`;

export const MARKET_CATEGORIES_QUERY = gql`
  query AdminMarketCategories {
    allMarketCategories {
      id
      label
      subtitle
      imageUrl
      icon
      iconLib
      tint
      iconColor
      sortOrder
      isActive
    }
  }
`;

export const UPSERT_MARKET_CATEGORY = gql`
  mutation UpsertMarketCategory($input: UpsertMarketCategoryInput!) {
    upsertMarketCategory(input: $input) {
      id
      label
    }
  }
`;

export const DELETE_MARKET_CATEGORY = gql`
  mutation DeleteMarketCategory($id: ID!) {
    deleteMarketCategory(id: $id) {
      id
    }
  }
`;

export const MENU_ITEMS_QUERY = gql`
  query AdminMenuItems($restaurantId: ID!) {
    searchMenuItems(page: 1, limit: 100, input: { restaurantId: $restaurantId, restaurantDishesOnly: true }) {
      items {
        id
        name
        description
        price
        category
        imageUrl
        isAvailable
        isFeatured
        sortOrder
        restaurantId
        kind
        supplements {
          id
          name
          price
          isAvailable
          sortOrder
        }
      }
    }
  }
`;

export const SIMPLE_PRODUCTS_QUERY = gql`
  query AdminSimpleProducts {
    searchMenuItems(page: 1, limit: 100, input: { simpleProductsOnly: true, onlyAvailable: false }) {
      items {
        id
        name
        description
        price
        category
        imageUrl
        isAvailable
        seller
        badge
        isFeatured
        sortOrder
        marketCategoryId
        kind
      }
    }
  }
`;

export const CREATE_MENU_ITEM = gql`
  mutation CreateMenuItem($input: CreateMenuItemInput!) {
    createMenuItem(input: $input) {
      id
    }
  }
`;

export const UPDATE_MENU_ITEM = gql`
  mutation UpdateMenuItem($input: UpdateMenuItemInput!) {
    updateMenuItem(input: $input) {
      id
    }
  }
`;

export const DELETE_MENU_ITEM = gql`
  mutation DeleteMenuItem($id: ID!) {
    deleteMenuItem(id: $id) {
      id
    }
  }
`;

export const UPSERT_MENU_SUPPLEMENT = gql`
  mutation UpsertMenuItemSupplement($input: UpsertMenuItemSupplementInput!) {
    upsertMenuItemSupplement(input: $input) {
      id
    }
  }
`;

export const DELETE_MENU_SUPPLEMENT = gql`
  mutation DeleteMenuItemSupplement($id: ID!) {
    deleteMenuItemSupplement(id: $id) {
      id
    }
  }
`;

export const BANNERS_QUERY = gql`
  query AdminBanners {
    allHomeBanners {
      id
      title
      subtitle
      imageUrl
      ctaLabel
      linkType
      linkValue
      sortOrder
      isActive
    }
  }
`;

export const UPSERT_BANNER = gql`
  mutation UpsertHomeBanner($input: UpsertHomeBannerInput!) {
    upsertHomeBanner(input: $input) {
      id
    }
  }
`;

export const DELETE_BANNER = gql`
  mutation DeleteHomeBanner($id: ID!) {
    deleteHomeBanner(id: $id) {
      id
    }
  }
`;

export const UPSERT_CUISINE = gql`
  mutation UpsertCuisineType($input: UpsertCuisineTypeInput!) {
    upsertCuisineType(input: $input) {
      id
    }
  }
`;

export const DELETE_CUISINE = gql`
  mutation DeleteCuisineType($id: ID!) {
    deleteCuisineType(id: $id) {
      id
    }
  }
`;

export type RestaurantRow = {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  cuisineType: string;
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  rating: number;
  deliveryFee: number;
  estimatedDeliveryTime: number;
  latitude?: number | null;
  longitude?: number | null;
  type?: string | null;
  isActive: boolean;
  isFeatured?: boolean | null;
  sortOrder?: number | null;
};

export type MarketCategoryRow = {
  id: string;
  label: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
  iconLib?: string | null;
  tint?: string | null;
  iconColor?: string | null;
  sortOrder?: number | null;
  isActive: boolean;
};

export type MenuSupplementRow = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
};

export type MenuItemRow = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  imageUrl?: string | null;
  isAvailable: boolean;
  seller?: string | null;
  badge?: string | null;
  isFeatured?: boolean | null;
  sortOrder?: number | null;
  marketCategoryId?: string | null;
  restaurantId?: string | null;
  kind?: string | null;
  supplements?: MenuSupplementRow[];
};

export const emptyRestaurantForm = (): Omit<RestaurantRow, 'id'> & { id?: string } => ({
  name: '',
  description: '',
  address: '',
  city: 'Brazzaville',
  zipCode: '0000',
  phone: '+242',
  cuisineType: 'AFRICAIN',
  imageUrl: '',
  coverImageUrl: '',
  rating: 4.5,
  deliveryFee: 1000,
  estimatedDeliveryTime: 30,
  latitude: -4.2634,
  longitude: 15.2429,
  type: 'RESTAURANT',
  isActive: true,
  isFeatured: false,
  sortOrder: 0,
});

export const emptyMenuForm = (restaurantId: string): Partial<MenuItemRow> => ({
  restaurantId,
  name: '',
  description: '',
  price: 2500,
  category: 'MAIN_COURSE',
  imageUrl: '',
  isAvailable: true,
  isFeatured: false,
  sortOrder: 0,
  supplements: [],
});

export const emptySimpleProductForm = (): Partial<MenuItemRow> => ({
  name: '',
  description: '',
  price: 2500,
  category: 'SNACK',
  imageUrl: '',
  isAvailable: true,
  seller: '',
  badge: '',
  isFeatured: false,
  sortOrder: 0,
  marketCategoryId: '',
});

export const emptyCategoryForm = (): Omit<MarketCategoryRow, 'id'> & { id?: string } => ({
  label: '',
  subtitle: 'Produits disponibles',
  imageUrl: '',
  icon: '',
  iconLib: 'image',
  tint: '#F4F6FB',
  iconColor: '#FE6400',
  sortOrder: 0,
  isActive: true,
});
