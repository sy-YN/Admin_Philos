import type { Timestamp } from 'firebase/firestore';

/**
 * Stores the predefined list of tags for content.
 * This is stored as a single document at /settings/contentTags.
 */
export type ContentTagSettings = {
  id: 'contentTags';
  tags: string[];
  updatedAt: Timestamp;
};
