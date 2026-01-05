
import type { Timestamp } from 'firebase/firestore';

export type ExecutiveMessage = {
  id: string;
  authorId: string;
  creatorId: string;
  authorName: string;
  title: string;
  content: string;
  priority: 'normal' | 'high';
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
};
