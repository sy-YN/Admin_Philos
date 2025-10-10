import type { Timestamp } from 'firebase/firestore';

export type Member = {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  department?: string;
  role: 'admin' | 'executive' | 'manager' | 'employee';
  createdAt: Timestamp | Date;
};
