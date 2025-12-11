
export type SalesRecord = {
  id: string; // Composite ID, e.g., `${year}-${month}`
  year: number;
  month: number;
  salesTarget: number;
  salesActual: number;
  achievementRate: number;
};
