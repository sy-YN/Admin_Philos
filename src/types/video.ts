
import type { Timestamp } from 'firebase/firestore';

export type Video = {
  id: string;
  title: string;
  description: string;
  src: string;
  thumbnailUrl: string;
  tags: string[];
  authorId: string;
  creatorId: string;
  uploadedAt: Timestamp;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
};
