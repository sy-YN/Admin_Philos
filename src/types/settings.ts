
'use client';

import type { Timestamp } from 'firebase/firestore';

/**
 * DEPRECATED: This type is no longer used for fixed content.
 * Fixed content is now managed in the 'fixedCalendarMessages' collection.
 * @deprecated
 */
export type FixedCalendarContent = {
  title: string;
  content: string;
  icon: string;
};

export type CalendarDisplaySettings = {
  id: 'calendarDisplay'; // Document ID is fixed
  /**
   * DEPRECATED: The mode is now determined implicitly. 
   * If an active fixed message exists, 'fixed' mode is used, otherwise 'daily'.
   * @deprecated
   */
  mode?: 'daily' | 'fixed';
  /**
   * DEPRECATED: Fixed content is now stored in the `fixedCalendarMessages` collection.
   * @deprecated
   */
  fixedContent?: FixedCalendarContent | null;
  /**
   * DEPRECATED: End date is now stored with each message in `fixedCalendarMessages`.
   * @deprecated
   */
  fixedEndDate?: Timestamp | null;
  /**
   * A counter to keep track of the current item in the 'daily' rotation.
   */
  dailyLoopCounter: number;
};
