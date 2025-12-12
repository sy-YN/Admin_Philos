
export type ProjectComplianceRecord = {
  id: string; // e.g., `${year}-${month}`
  year: number;
  month: number;
  counts: {
    compliant: number;
    minor_delay: number;
    delayed: number;
    // This allows for future extensibility without changing the type.
    [key: string]: number;
  };
};
