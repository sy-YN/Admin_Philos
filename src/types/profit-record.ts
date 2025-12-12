
export type ProfitRecord = {
  id: string; // Composite ID, e.g., `${year}-${month}`
  year: number;
  month: number;
  operatingProfit: number;
  salesRevenue: number;
  profitMargin: number;
};
