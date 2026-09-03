import { gql } from '@apollo/client';

export const STATISTICS_OVERVIEW_QUERY = gql`
  query StatisticsOverview($range: StatisticsRangeInput) {
    statisticsOverview(range: $range) {
      totalOrders
      totalRevenue
      averageOrderValue
      activeRestaurants
      activeDrivers
      pendingOrders
      totalDriverProfiles
      availableDriverProfiles
    }
  }
`;

export const DAILY_ORDERS_QUERY = gql`
  query DailyOrders($range: StatisticsRangeInput) {
    dailyOrders(range: $range) {
      date
      orders
      revenue
    }
  }
`;

export const ORDERS_BY_STATUS_QUERY = gql`
  query OrdersByStatus($range: StatisticsRangeInput) {
    ordersByStatus(range: $range) {
      status
      count
    }
  }
`;

export const TOP_RESTAURANTS_QUERY = gql`
  query TopRestaurants($input: TopRestaurantsInput) {
    topRestaurants(input: $input) {
      restaurantId
      restaurantName
      revenue
      orderCount
    }
  }
`;

export type StatisticsOverview = {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  activeRestaurants: number;
  activeDrivers: number;
  pendingOrders: number;
  totalDriverProfiles: number;
  availableDriverProfiles: number;
};

export type DailyOrderPoint = {
  date: string;
  orders: number;
  revenue: number;
};

export type OrderStatusRow = {
  status: string;
  count: number;
};

export type TopRestaurantRow = {
  restaurantId: string;
  restaurantName: string;
  revenue: number;
  orderCount: number;
};

export type StatisticsRange = {
  from?: string;
  to?: string;
};
