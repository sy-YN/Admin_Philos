import type { Timestamp } from 'firebase/firestore';

export type ExecutiveMessage = {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  priority: 'normal' | 'high';
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
