
import type { Timestamp } from 'firebase/firestore';

export type PhilosophyItem = {
  id: string;
  title: string;
  content: string;
  icon: string;
  category: 'mission_vision' | 'values';
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

    