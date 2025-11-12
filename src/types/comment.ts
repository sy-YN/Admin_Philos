
import type { Timestamp } from 'firebase/firestore';

/**
 * A comment on a post, message, or video.
 */
export type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  content: string;
  /**
   * ID of the parent comment if this is a reply.
   * Null for top-level comments.
   */
  parentCommentId: string | null;
  createdAt: Timestamp;
};
