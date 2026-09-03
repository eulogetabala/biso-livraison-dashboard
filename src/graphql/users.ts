import { gql } from '@apollo/client';

export const USERS_PAGINATED_QUERY = gql`
  query AdminUsersPaginated($page: Int, $limit: Int, $input: SearchUsersInput) {
    usersPaginated(page: $page, limit: $limit, input: $input) {
      items {
        id
        firstName
        lastName
        phone
        email
        role
        phoneVerified
        isBlocked
        createdAt
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

export const USER_STATISTICS_OVERVIEW_QUERY = gql`
  query UserStatisticsOverview($range: UserStatisticsRangeInput) {
    userStatisticsOverview(range: $range) {
      totalClients
      newRegistrations
      verifiedRegistrations
      pendingOtp
      blockedClients
    }
  }
`;

export const DAILY_USER_REGISTRATIONS_QUERY = gql`
  query DailyUserRegistrations($range: UserStatisticsRangeInput) {
    dailyUserRegistrations(range: $range) {
      date
      count
    }
  }
`;

export const ADMIN_SET_USER_BLOCKED = gql`
  mutation AdminSetUserBlocked($input: AdminSetUserBlockedInput!) {
    adminSetUserBlocked(input: $input) {
      id
      isBlocked
    }
  }
`;

export type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: string;
  phoneVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
};

export type UserStatisticsOverview = {
  totalClients: number;
  newRegistrations: number;
  verifiedRegistrations: number;
  pendingOtp: number;
  blockedClients: number;
};

export type DailyRegistrationPoint = {
  date: string;
  count: number;
};

export type UserStatisticsRange = {
  from?: string;
  to?: string;
};

export type UserStatusFilter = '' | 'verified' | 'pending' | 'blocked';

export const USER_STATUS_FILTERS: { value: UserStatusFilter; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'verified', label: 'Vérifiés' },
  { value: 'pending', label: 'OTP en attente' },
  { value: 'blocked', label: 'Bloqués' },
];

export function userDisplayName(user: UserRow): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function userInitials(user: Pick<UserRow, 'firstName' | 'lastName'>): string {
  const first = user.firstName?.trim().charAt(0) ?? '';
  const last = user.lastName?.trim().charAt(0) ?? '';
  return `${first}${last}`.toUpperCase() || '?';
}

export function userStatusLabel(user: UserRow): string {
  if (user.isBlocked) return 'Bloqué';
  if (user.phoneVerified) return 'Vérifié';
  return 'OTP en attente';
}

export function userStatusClass(user: UserRow): 'danger' | 'success' | 'warning' {
  if (user.isBlocked) return 'danger';
  if (user.phoneVerified) return 'success';
  return 'warning';
}

export function searchInputFromStatus(status: UserStatusFilter) {
  switch (status) {
    case 'verified':
      return { phoneVerified: true, isBlocked: false };
    case 'pending':
      return { phoneVerified: false, isBlocked: false };
    case 'blocked':
      return { isBlocked: true };
    default:
      return {};
  }
}
