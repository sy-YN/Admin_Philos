
export type SalesRecord = {
  id: string; // Composite ID, e.g., `${goalId}_${year}-${month}`
  goalId: string;
  year: number;
  month: number;
  salesTarget: number;
  salesActual: number;
  achievementRate: number;
};
