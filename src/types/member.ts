import type { Timestamp } from 'firebase/firestore';

export type Member = {
  id: number; // データベースに合わせて数値型のidを追加
  uid: string;
  displayName: string;
  email: string;
  department?: string;
  role: 'admin' | 'executive' | 'manager' | 'employee';
  createdAt: Timestamp | Date;
};
