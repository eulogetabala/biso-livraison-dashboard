import { gql } from '@apollo/client';

export const ACTIVE_DELIVERIES_TRACKING_QUERY = gql`
  query ActiveDeliveriesTracking {
    activeDeliveriesTracking {
      deliveryId
      orderId
      deliveryStatus
      orderStatus
      driverId
      driverFirstName
      driverLastName
      driverPhone
      driverLatitude
      driverLongitude
      locationUpdatedAt
      restaurantName
      restaurantLatitude
      restaurantLongitude
      deliveryAddress
      deliveryCity
      deliveryLatitude
      deliveryLongitude
      clientFirstName
      clientLastName
    }
  }
`;

export const DRIVER_LOCATIONS_QUERY = gql`
  query AdminDriverLocations {
    driverLocations {
      id
      driverId
      latitude
      longitude
      deliveryId
      updatedAt
    }
  }
`;

export type ActiveDeliveryTracking = {
  deliveryId: string;
  orderId?: string | null;
  parcelId?: string | null;
  deliveryStatus: string;
  orderStatus: string;
  driverId: string;
  driverFirstName: string;
  driverLastName: string;
  driverPhone?: string | null;
  driverLatitude?: number | null;
  driverLongitude?: number | null;
  locationUpdatedAt?: string | null;
  restaurantName: string;
  restaurantLatitude?: number | null;
  restaurantLongitude?: number | null;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  clientFirstName: string;
  clientLastName: string;
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Assignée',
  PICKED_UP: 'Récupérée',
  IN_TRANSIT: 'En route',
  DELIVERED: 'Livrée',
};
