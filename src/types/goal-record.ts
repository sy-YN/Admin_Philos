
import type { Timestamp } from 'firebase/firestore';

/**
 * Represents a single time-series data point for a team goal.
 */
export type GoalRecord = {
  id: string;
  /**
   * The specific date this record applies to.
   */
  date: Timestamp;
  /**
   * The target value for this specific date/period.
   */
  targetValue: number;
  /**
   * The actual achieved value for this specific date/period.
   */
  actualValue: number;
  /**
   * UID of the user who last updated this record.
   */
  authorId: string;
  /**
   * Timestamp of the last update.
   */
  updatedAt: Timestamp;
};
