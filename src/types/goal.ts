
import type { Timestamp } from 'firebase/firestore';

export type Goal = {
  id: string;
  title: string;
  scope: 'company' | 'team' | 'personal';
  scopeId: string;
  authorId: string;
  status: 'active' | 'inactive';
  chartType: 'composed' | 'bar' | 'pie' | 'donut' | 'line';
  
  // Company-specific fields
  kpi?: string;
  fiscalYear?: number;
  fiscalYearStartMonth?: number;
  
  // Team-specific fields
  startDate?: Timestamp;
  endDate?: Timestamp;
  targetValue?: number;
  currentValue?: number;
  unit?: string;

  // Display settings
  defaultGranularity?: 'daily' | 'weekly' | 'monthly';
  defaultIsCumulative?: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
};
