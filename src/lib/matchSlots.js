import { PRELIM_SLOTS } from '../admin/lib/prelim';
import { FINALS_SLOTS } from '../admin/lib/finals';

// ============================================================
// matchSlots — 場次原始對戰位置標籤查詢（場次 1–49）
// 預賽：A1、A2…F4；複決賽：A冠、B亞、27敗、22勝、F季…
// 隊伍被實際隊名取代後，賽程表仍以小標呈現原始標籤。
// ============================================================
const ALL_SLOTS = { ...PRELIM_SLOTS, ...FINALS_SLOTS };

/**
 * 取得場次兩隊的原始位置標籤（如 ['A1', 'A2']）。
 * @param {string|number} matchNo 場次編號
 * @returns {string[]|null} 標籤陣列；查無此場次時回傳 null
 */
export function slotPair(matchNo) {
  return ALL_SLOTS[String(matchNo)] || null;
}

/**
 * 取得場次的原始位置標籤，優先讀場次文件的 seeds（預賽重編場次後標籤跟著對戰走），
 * 無 seeds 時（複賽）退回以 matchNo 查固定範本。
 * @param {object} match 場次資料（含 matchNo，預賽含 seeds）
 * @returns {string[]|null} 標籤陣列；查無時回傳 null
 */
export function slotPairOf(match) {
  const seeds = match?.seeds;
  if (Array.isArray(seeds) && seeds.length === 2) return seeds;
  return slotPair(match?.matchNo);
}

/**
 * 判斷場次兩隊是否皆已由實際隊名取代原始標籤。
 * 未完全取代前，大字直接顯示標籤即可，小標籤不需重複顯示。
 * @param {object} match 場次資料（含 matchNo、teams）
 * @returns {boolean} 兩隊皆已確定（隊名存在且不等於原始標籤）時回傳 true
 */
export function isSlotResolved(match) {
  const pair = slotPairOf(match);
  if (!pair) return false; // 查無標籤的場次沒有小標籤可顯示
  return pair.every((slot, i) => {
    const name = (match?.teams?.[i] || '').trim();
    return name && name !== '?' && name !== slot;
  });
}
