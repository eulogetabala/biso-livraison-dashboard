import { gql } from '@apollo/client';

export const ORDERS_QUERY = gql`
  query AdminOrders($page: Int = 1, $limit: Int = 20, $input: SearchOrdersInput) {
    orders(page: $page, limit: $limit, input: $input) {
      items {
        id
        status
        total
        grandTotal
        deliveryFee
        deliveryAddress
        deliveryCity
        deliveryZipCode
        createdAt
        restaurant {
          id
          name
          type
        }
        user {
          id
          firstName
          lastName
          phone
        }
        items {
          quantity
          unitPrice
          menuItem {
            id
            name
          }
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

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($input: UpdateOrderStatusInput!) {
    updateOrderStatus(input: $input) {
      id
      status
    }
  }
`;

export const CANCEL_ORDER = gql`
  mutation CancelOrder($id: ID!) {
    cancelOrder(id: $id) {
      id
      status
    }
  }
`;

export const ASSIGN_DRIVER = gql`
  mutation AssignDriver($input: AssignDriverInput!) {
    assignDriver(input: $input) {
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
`;

export const ASSIGN_AVAILABLE_DRIVER = gql`
  mutation AssignAvailableDriver($orderId: ID!) {
    assignAvailableDriver(orderId: $orderId) {
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
`;

export type OrderItemRow = {
  quantity: number;
  unitPrice: number;
  menuItem?: { id: string; name: string } | null;
};

export type OrderRow = {
  id: string;
  status: string;
  total: number;
  grandTotal: number;
  deliveryFee: number;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryZipCode: string;
  createdAt: string;
  restaurant?: { id: string; name: string; type: string } | null;
  user?: { id: string; firstName: string; lastName: string; phone: string } | null;
  items: OrderItemRow[];
  delivery?: {
    id: string;
    status: string;
    driver?: { id: string; firstName: string; lastName: string; phone: string } | null;
  } | null;
};

export const ORDER_STATUS_FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'CONFIRMED', label: 'Confirmées' },
  { value: 'PREPARING', label: 'En préparation' },
  { value: 'IN_TRANSIT', label: 'En livraison' },
  { value: 'DELIVERED', label: 'Livrées' },
  { value: 'CANCELLED', label: 'Annulées' },
] as const;

export const ORDER_TYPE_FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'RESTAURANT', label: 'Repas' },
  { value: 'MARKET', label: 'Produits' },
] as const;

const NEXT_ORDER_STATUS: Partial<Record<string, { status: string; label: string }>> = {
  PENDING: { status: 'CONFIRMED', label: 'Confirmer' },
  CONFIRMED: { status: 'PREPARING', label: 'En préparation' },
  PREPARING: { status: 'IN_TRANSIT', label: 'En livraison' },
  IN_TRANSIT: { status: 'DELIVERED', label: 'Marquer livré' },
};

export function nextOrderAction(status: string) {
  return NEXT_ORDER_STATUS[status] ?? null;
}
