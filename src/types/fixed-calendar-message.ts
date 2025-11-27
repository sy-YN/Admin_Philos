
import type { Timestamp } from 'firebase/firestore';

/**
 * Represents a single message item scheduled for a specific date range.
 */
export type FixedCalendarMessage = {
  id: string;
  title: string;
  /**
   * The content of the message. Can contain simple HTML from the rich text editor.
   */
  content: string;
  /**
   * The name of the Lucide icon to display.
   */
  icon: string;
  /**
   * The start date for the display period.
   */
  startDate: Timestamp;
  /**
   * The end date for the display period.
   */
  endDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
