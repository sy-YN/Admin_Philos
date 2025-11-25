
/**
 * 日本の会計年度（8月開始）に基づいて、特定の日付がどの年度に属するかを計算します。
 * @param year 年
 * @param month 月（1-12）
 * @returns 会計年度
 */
export const getFiscalYear = (year: number, month: number): number => {
  // 8月以降は、その年が会計年度の開始年です。
  // 1月～7月は、前年が会計年度の開始年です。
  return month >= 8 ? year : year - 1;
};

/**
 * 現在の日付に基づいて、現在の会計年度を計算します。
 * @returns 現在の会計年度
 */
export const getCurrentFiscalYear = (): number => {
  const now = new Date();
  return getFiscalYear(now.getFullYear(), now.getMonth() + 1);
};


/**
 * 過去5年から未来1年までの会計年度のリストを生成します。
 * @returns 会計年度の配列
 */
export const getFiscalYears = (): number[] => {
  const currentFY = getCurrentFiscalYear();
  const years: number[] = [];
  for (let i = -5; i <= 1; i++) {
    years.push(currentFY + i);
  }
  return years;
};
