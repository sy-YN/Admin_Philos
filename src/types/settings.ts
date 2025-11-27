
'use client';

import type { Timestamp } from 'firebase/firestore';

/**
 * Represents the content to be displayed in a fixed mode on the calendar.
 * This is stored as a nested object within CalendarDisplaySettings.
 */
export type FixedCalendarContent = {
  title: string;
  content: string; // Can contain HTML from the rich text editor
  icon: string;
};

export type CalendarDisplaySettings = {
  id: 'calendarDisplay'; // Document ID is fixed
  mode: 'daily' | 'fixed';
  /**
   * The content to display when mode is 'fixed'.
   * Null if mode is 'daily'.
   */
  fixedContent: FixedCalendarContent | null;
  /**
   * The end date for the 'fixed' mode display.
   * Null if mode is 'daily'.
   */
  fixedEndDate: Timestamp | null;
  /**
   * A counter to keep track of the current item in the 'daily' rotation.
   */
  dailyLoopCounter: number;
};
