
import type { Timestamp } from 'firebase/firestore';

/**
 * Represents the status of a personal goal.
 */
export type GoalStatus = "進行中" | "達成済" | "未達成";

/**
 * Represents an individual user's personal goal document stored in Firestore.
 */
export type PersonalGoal = {
  id: string;
  /**
   * The title or description of the goal.
   */
  title: string;
  /**
   * The start date for the goal period.
   */
  startDate: Timestamp;
  /**
   * The end date for the goal period.
   */
  endDate: Timestamp;
  /**
   * The progress of the goal, represented as a number from 0 to 100.
   */
  progress: number;
  /**
   * Indicates whether the goal is visible to other users in the organization.
   */
  isPublic: boolean;
  /**
   * The current status of the goal.
   */
  status: GoalStatus;
  /**
   * Timestamp of when the goal was created.
   */
  createdAt: Timestamp;
  /**
   * Timestamp of when the goal was last updated.
   */
  updatedAt: Timestamp;
};
