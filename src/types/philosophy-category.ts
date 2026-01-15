
import type { Timestamp } from 'firebase/firestore';

/**
 * A category for grouping philosophy items.
 */
export type PhilosophyCategory = {
  id: string;
  name: string;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
