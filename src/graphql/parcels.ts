import { gql } from '@apollo/client';

export const PARCELS_QUERY = gql`
  query AdminParcels($page: Int = 1, $limit: Int = 20, $input: SearchParcelsInput) {
    parcels(page: $page, limit: $limit, input: $input) {
      items {
        id
        status
        receiverName
        receiverPhone
        receiverAddress
        description
        weight
        createdAt
        updatedAt
        deliveredAt
        sender {
          id
          firstName
          lastName
          phone
        }
        delivery {
          id
          status
          driver {
            id
            firstName
            lastName
            phone
          }
        }
      }
      pageInfo {
        totalItems
        totalPages
        currentPage
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const UPDATE_PARCEL_STATUS = gql`
  mutation UpdateParcelStatus($input: UpdateParcelStatusInput!) {
    updateParcelStatus(input: $input) {
      id
      status
      deliveredAt
    }
  }
`;

export const ASSIGN_DRIVER_TO_PARCEL = gql`
  mutation AssignDriverToParcel($input: AssignDriverToParcelInput!) {
    assignDriverToParcel(input: $input) {
      id
      delivery {
        id
        status
        driver {
          id
          firstName
          lastName
          phone
        }
      }
    }
  }
`;

export const ASSIGN_AVAILABLE_DRIVER_TO_PARCEL = gql`
  mutation AssignAvailableDriverToParcel($parcelId: ID!) {
    assignAvailableDriverToParcel(parcelId: $parcelId) {
      id
      delivery {
        id
        status
        driver {
          id
          firstName
          lastName
          phone
        }
      }
    }
  }
`;

export type ParcelRow = {
  id: string;
  status: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  description?: string | null;
  weight: number;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string | null;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  delivery?: {
    id: string;
    status: string;
    driver?: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
    } | null;
  } | null;
};

export const PARCEL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  PICKED_UP: 'Récupéré',
  IN_TRANSIT: 'En transit',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulé',
};

export const PARCEL_STATUS_FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'PICKED_UP', label: 'Récupérés' },
  { value: 'IN_TRANSIT', label: 'En transit' },
  { value: 'DELIVERED', label: 'Livrés' },
  { value: 'CANCELLED', label: 'Annulés' },
] as const;

const NEXT_STATUS: Partial<Record<string, { status: string; label: string }>> = {
  PENDING: { status: 'PICKED_UP', label: 'Marquer récupéré' },
  PICKED_UP: { status: 'IN_TRANSIT', label: 'En transit' },
  IN_TRANSIT: { status: 'DELIVERED', label: 'Marquer livré' },
};

export function nextParcelAction(status: string) {
  return NEXT_STATUS[status] ?? null;
}
