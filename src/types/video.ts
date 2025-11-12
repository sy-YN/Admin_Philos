
import type { Timestamp } from 'firebase/firestore';

export type Video = {
  id: string;
  title: string;
  description: string;
  src: string;
  thumbnailUrl: string;
  tags: string[];
  uploaderId?: string;
  uploadedAt: Timestamp | string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
};
