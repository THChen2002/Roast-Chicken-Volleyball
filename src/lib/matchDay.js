// ============================================================
// matchDay — 比賽日判斷（以 date 欄位為準）
// 場次改存 date（YYYY-MM-DD），不再依賴 day 欄位：
// 全部場次中日期較小者即為 DAY1，依序推導 DAY2…。
// 舊資料可能只有 day（'day1'/'day2'），以固定對照表回填日期。
// ============================================================

/** 舊資料 day → 實際日期對照（2026 烤雞盃：8/1、8/2） */
export const LEGACY_DAY_DATES = { day1: '2026-08-01', day2: '2026-08-02' };

/**
 * 取得場次的比賽日期（YYYY-MM-DD）。
 * 優先讀 date 欄位；舊資料退回以 day 欄位對照。
 * @param {object} r 場次資料
 * @returns {string} 日期字串；無法判斷時回傳空字串
 */
export function matchDate(r) {
  return r?.date || LEGACY_DAY_DATES[r?.day || 'day1'] || '';
}

/**
 * 取得所有場次出現過的比賽日期（升冪；最小者即 DAY1）。
 * @param {object[]} results 場次列表
 * @returns {string[]} 排序後的日期字串陣列
 */
export function eventDates(results) {
  return [...new Set((results || []).map(matchDate).filter(Boolean))].sort();
}

/**
 * 比賽日顯示標籤（如「DAY 1（8/1）」）。
 * @param {string} date 日期字串（YYYY-MM-DD）
 * @param {number} index 於 eventDates 中的序位（0 起算）
 * @returns {string}
 */
export function dayLabel(date, index) {
  const [, m, d] = String(date).split('-');
  const md = m && d ? `（${Number(m)}/${Number(d)}）` : '';
  return `DAY ${index + 1}${md}`;
}
