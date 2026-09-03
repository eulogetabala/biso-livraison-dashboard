import { gql } from '@apollo/client';

export const REVIEWS_QUERY = gql`
  query AdminReviews($page: Int = 1, $limit: Int = 20) {
    reviews(page: $page, limit: $limit) {
      items {
        id
        rating
        comment
        createdAt
        orderId
        author {
          id
          firstName
          lastName
          phone
        }
        restaurant {
          id
          name
        }
        driver {
          id
          firstName
          lastName
          phone
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

export const UPDATE_REVIEW = gql`
  mutation UpdateReview($input: UpdateReviewInput!) {
    updateReview(input: $input) {
      id
      rating
      comment
    }
  }
`;

export const DELETE_REVIEW = gql`
  mutation DeleteReview($id: ID!) {
    deleteReview(id: $id) {
      id
    }
  }
`;

export type ReviewRow = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  orderId: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  restaurant?: {
    id: string;
    name: string;
  } | null;
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
};

export const RATING_FILTERS = [
  { value: '', label: 'Toutes notes' },
  { value: '5', label: '5 étoiles' },
  { value: '4', label: '4 étoiles' },
  { value: '3', label: '3 étoiles' },
  { value: '2', label: '2 étoiles' },
  { value: '1', label: '1 étoile' },
] as const;
