
import type { Timestamp } from 'firebase/firestore';

export type Goal = {
  id: string;
  title: string;
  scope: 'company' | 'team' | 'personal';
  scopeId: string;
  kpi: string;
  chartType: 'composed' | 'bar' | 'pie' | 'donut' | 'line';
  status: 'active' | 'inactive';
  fiscalYear?: number;
  fiscalYearStartMonth?: number;
  authorId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
