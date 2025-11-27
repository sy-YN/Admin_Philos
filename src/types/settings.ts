'use client';

import type { Timestamp } from 'firebase/firestore';

export type CalendarDisplaySettings = {
  id: 'calendarDisplay'; // Document ID is fixed
  mode: 'daily' | 'fixed';
  activeContentId: string | null;
  fixedEndDate: Timestamp | null;
  dailyLoopCounter: number;
};
