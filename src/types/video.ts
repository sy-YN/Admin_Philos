
import type { Timestamp } from 'firebase/firestore';

export type Video = {
  id: string;
  title: string;
  description: string;
  src: string;
  thumbnailUrl: string;
  priority: 'normal' | 'high';
  tags: string[];
  authorId: string;
  authorName: string;
  creatorId: string;
  uploadedAt: Timestamp;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
};
