import { gql } from '@apollo/client';

export const DRIVERS_QUERY = gql`
  query AdminDrivers {
    drivers {
      id
      userId
      vehicleType
      vehiclePlate
      isAvailable
      rating
      reviewCount
      createdAt
      user {
        id
        firstName
        lastName
        phone
      }
    }
  }
`;

export const ADMIN_CREATE_DRIVER = gql`
  mutation AdminCreateDriver($input: AdminCreateDriverInput!) {
    adminCreateDriver(input: $input) {
      id
      isAvailable
      user {
        firstName
        lastName
        phone
      }
    }
  }
`;

export const ADMIN_SET_DRIVER_AVAILABILITY = gql`
  mutation AdminSetDriverAvailability($input: AdminSetDriverAvailabilityInput!) {
    adminSetDriverAvailability(input: $input) {
      id
      isAvailable
    }
  }
`;

export const ADMIN_UPDATE_DRIVER = gql`
  mutation AdminUpdateDriver($input: AdminUpdateDriverInput!) {
    adminUpdateDriver(input: $input) {
      id
      vehicleType
      vehiclePlate
      isAvailable
      user {
        id
        firstName
        lastName
        phone
      }
    }
  }
`;

export type DriverRow = {
  id: string;
  userId: string;
  vehicleType: string;
  vehiclePlate?: string | null;
  isAvailable: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
};

export function emptyDriverForm() {
  return {
    driverId: '' as string | undefined,
    firstName: '',
    lastName: '',
    phone: '+242',
    password: '',
    vehicleType: 'MOTO',
    vehiclePlate: '',
    isAvailable: false,
  };
}

export function driverFormFromRow(row: DriverRow) {
  return {
    driverId: row.id,
    firstName: row.user?.firstName ?? '',
    lastName: row.user?.lastName ?? '',
    phone: row.user?.phone ?? '+242',
    password: '',
    vehicleType: row.vehicleType || 'MOTO',
    vehiclePlate: row.vehiclePlate ?? '',
    isAvailable: row.isAvailable,
  };
}

export type DriverAvailabilityFilter = '' | 'available' | 'offline';

export const DRIVER_AVAILABILITY_FILTERS: { value: DriverAvailabilityFilter; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'available', label: 'Disponibles' },
  { value: 'offline', label: 'Hors ligne' },
];

export function driverInitials(row: DriverRow): string {
  const first = row.user?.firstName?.trim().charAt(0) ?? '';
  const last = row.user?.lastName?.trim().charAt(0) ?? '';
  return (first + last).toUpperCase() || '?';
}

export function driverDisplayName(row: DriverRow): string {
  return `${row.user?.firstName ?? ''} ${row.user?.lastName ?? ''}`.trim() || 'Livreur';
}
