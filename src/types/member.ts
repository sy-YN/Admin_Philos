import type { Timestamp } from 'firebase/firestore';

export type Member = {
  uid: string;
  displayName: string;
  email: string;
  employeeId?: string;
  /** @deprecated Use organizationId instead */
  company?: string;
  /** @deprecated Use organizationId instead */
  department?: string;
  organizationId?: string | null;
  avatarUrl?: string;
  role: 'admin' | 'executive' | 'manager' | 'employee';
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
};
