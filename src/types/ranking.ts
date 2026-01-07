
import type { Timestamp } from 'firebase/firestore';

/**
 * Stores the configuration for calculating and displaying rankings.
 * This will be stored as a single document at `/settings/ranking`.
 */
export type RankingSettings = {
  id: 'ranking'; // Fixed document ID
  /**
   * The aggregation period for rankings.
   */
  period: 'monthly' | 'quarterly' | 'yearly';
  /**
   * Points awarded for different activities in the overall ranking.
   */
  weights: {
    likes: number;
    comments: number;
    goal_progress: number;
  };
  updatedAt: Timestamp | ReturnType<typeof serverTimestamp>;
  /**
   * UID of the admin who last updated the settings.
   */
  updatedBy: string;
};

/**
 * Represents a single user's rank in a specific category.
 */
type RankEntry = {
  userId: string;
  rank: number;
  score: number;
  userName: string; // denormalized for easy display
  avatarUrl?: string; // denormalized
};

/**
 * Stores the calculated ranking data for a specific period and scope.
 */
export type RankingResult = {
  id: string; // e.g., '2024-Q3_all_overall'
  /**
   * Identifier for the period, e.g., '2024-08' for monthly, '2024-Q3' for quarterly.
   */
  periodId: string;
  /**
   * The scope of the ranking.
   */
  scope: 'all' | 'department';
  /**
   * ID of the scope (e.g., companyId for 'all', departmentId for 'department').
   */
  scopeId: string;
  /**
   * The category of the ranking.
   */
  category: 'overall' | 'likes' | 'comments' | 'goal_progress';
  /**
   * An array of users and their ranks for this category.
   */
  ranks: RankEntry[];
  /**
   * Timestamp of when this ranking was calculated.
   */
  calculatedAt: Timestamp;
};
