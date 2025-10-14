import type { Timestamp } from 'firebase/firestore';

export type Member = {
  uid: string;
  displayName: string;
  email: string;
  department?: string;
  role: 'admin' | 'executive' | 'manager' | 'employee';
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
};
