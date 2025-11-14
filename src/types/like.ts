import type { Timestamp } from 'firebase/firestore';

/**
 * Represents a 'like' action from a user on an item.
 * The document ID is the UID of the user who liked the item.
 */
export type Like = {
  id: string; // This will be the userId
  likedAt: Timestamp;
  // User info is often stored here to avoid extra lookups,
  // but we can also fetch it from the 'users' collection using the id.
  userName?: string;
  userAvatarUrl?: string;
};
