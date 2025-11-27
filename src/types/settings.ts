
'use client';

import type { Timestamp } from 'firebase/firestore';

/**
 * Stores the display settings for the user-facing calendar,
 * controlling the logic for the daily message rotation.
 */
export type CalendarDisplaySettings = {
  id: 'calendarDisplay'; // Document ID is fixed
  
  /**
   * A counter to keep track of the current item in the 'daily' rotation.
   * This number corresponds to the 'order' field in the 'calendarMessages' collection.
   */
  dailyLoopCounter: number;

  /**
   * The last date the dailyLoopCounter was incremented.
   * This is crucial to ensure the counter is updated only once per day,
   * regardless of how many users view the calendar.
   */
  lastUpdatedDate: Timestamp;
};
