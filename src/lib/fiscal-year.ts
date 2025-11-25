
/**
 * 日本の会計年度に基づいて、特定の日付がどの年度に属するかを計算します。
 * @param year 年
 * @param month 月（1-12）
 * @param startMonth 会計年度の開始月 (1-12)
 * @returns 会計年度
 */
export const getFiscalYear = (year: number, month: number, startMonth: number): number => {
  // 月が会計年度の開始月以降であれば、その年が会計年度の開始年です。
  // そうでなければ、前年が会計年度の開始年です。
  return month >= startMonth ? year : year - 1;
};

/**
 * 現在の日付に基づいて、現在の会計年度を計算します。
 * @param startMonth 会計年度の開始月 (デフォルトは8月)
 * @returns 現在の会計年度
 */
export const getCurrentFiscalYear = (startMonth: number = 8): number => {
  const now = new Date();
  return getFiscalYear(now.getFullYear(), now.getMonth() + 1, startMonth);
};


/**
 * 過去5年から未来1年までの会計年度のリストを生成します。
 * @param startMonth 会計年度の開始月
 * @returns 会計年度の配列
 */
export const getFiscalYears = (startMonth: number = 8): number[] => {
  const currentFY = getCurrentFiscalYear(startMonth);
  const years: number[] = [];
  for (let i = -5; i <= 1; i++) {
    years.push(currentFY + i);
  }
  return years;
};
