import type { Timestamp } from 'firebase/firestore';

/**
 * Represents a 'view' action from a user on an item.
 * The document ID is the UID of the user who viewed the item.
 */
export type View = {
  id: string; // This will be the userId
  viewedAt: Timestamp;
};
