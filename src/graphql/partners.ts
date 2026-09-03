import { gql } from '@apollo/client';

export const PARTNERS_QUERY = gql`
  query Partners {
    partners {
      id
      firstName
      lastName
      phone
      isBlocked
      partnerRestaurantId
      partnerRestaurant {
        id
        name
        city
        isActive
      }
      createdAt
    }
  }
`;

export const ADMIN_CREATE_PARTNER = gql`
  mutation AdminCreatePartner($input: AdminCreatePartnerInput!) {
    adminCreatePartner(input: $input) {
      id
      firstName
      lastName
      phone
    }
  }
`;

export const ADMIN_UPDATE_PARTNER = gql`
  mutation AdminUpdatePartner($input: AdminUpdatePartnerInput!) {
    adminUpdatePartner(input: $input) {
      id
      firstName
      lastName
      phone
      isBlocked
      partnerRestaurantId
      partnerRestaurant {
        id
        name
      }
    }
  }
`;

export type PartnerRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  isBlocked: boolean;
  partnerRestaurantId?: string | null;
  partnerRestaurant?: {
    id: string;
    name: string;
    city: string;
    isActive: boolean;
  } | null;
  createdAt: string;
};

export type PartnerForm = {
  userId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  partnerRestaurantId: string;
  isBlocked: boolean;
};

export function emptyPartnerForm(restaurantId = ''): PartnerForm {
  return {
    firstName: '',
    lastName: '',
    phone: '+242',
    password: '',
    partnerRestaurantId: restaurantId,
    isBlocked: false,
  };
}

export function partnerFormFromRow(row: PartnerRow): PartnerForm {
  return {
    userId: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    password: '',
    partnerRestaurantId: row.partnerRestaurantId ?? row.partnerRestaurant?.id ?? '',
    isBlocked: row.isBlocked,
  };
}

export function partnerDisplayName(row: PartnerRow): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

export function partnerInitials(row: Pick<PartnerRow, 'firstName' | 'lastName'>): string {
  const first = row.firstName?.trim().charAt(0) ?? '';
  const last = row.lastName?.trim().charAt(0) ?? '';
  return `${first}${last}`.toUpperCase() || '?';
}
