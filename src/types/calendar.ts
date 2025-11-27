
import type { Timestamp } from 'firebase/firestore';

/**
 * Represents a single message item for the 'daily' calendar rotation.
 */
export type CalendarMessage = {
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
   * A number to determine the display order in the daily loop.
   */
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
