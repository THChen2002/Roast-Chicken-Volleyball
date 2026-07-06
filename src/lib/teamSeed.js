// ============================================================
// teamSeed — 隊伍 seed 陣列工具
// teams.seed 以「陣列」儲存隊伍持有的各階段標籤（可多個）：
//   預賽分組位置：A1…F4（格式：組別字母＋數字）
//   循環賽名次標籤：A冠、B亞、F季…（格式：組別字母＋冠亞季殿）
//   複賽勝敗標籤：25勝、31敗…（格式：場次編號＋勝敗，場次結束自動寫入）
// 標籤以「格式」辨識型態，不依賴陣列索引順序。
// 依附鏈：名次依附「同組的預賽位置」；勝敗標籤依附名次、且須沿 bracket 連續可達。
// 場次文件（results）只存佔位標籤；顯示／取用時以本工具反查實際隊名，
// 排名異動只需改隊伍文件本身，不必把隊名另外複寫到各場次。
// ============================================================
import { FINALS_SLOTS } from '../admin/lib/finals';

/** 預賽位置標籤格式（A1…F4） */
export const PRELIM_SEED_RE = /^[A-Z]\d+$/;

/** 名次標籤格式（A冠、B亞、F殿…） */
export const RANK_SEED_RE = /^[A-Z][冠亞季殿]$/;

/**
 * 取得隊伍的 seed 陣列（相容舊資料：字串 'A1' 視為 ['A1']）。
 * @param {object} team 隊伍文件
 * @returns {string[]} seed 標籤陣列
 */
export function seedList(team) {
  const s = team?.seed;
  if (Array.isArray(s)) return s.filter(Boolean);
  return s ? [s] : [];
}

/**
 * 預賽分組位置標籤（如 'A1'），未指派回傳空字串。
 * @param {object} team 隊伍文件
 * @returns {string}
 */
export function prelimSeedOf(team) {
  return seedList(team).find((l) => PRELIM_SEED_RE.test(l)) || '';
}

/**
 * 循環賽結算後的名次標籤（如 'A冠'），未結算回傳空字串。
 * @param {object} team 隊伍文件
 * @returns {string}
 */
export function rankSeedOf(team) {
  return seedList(team).find((l) => RANK_SEED_RE.test(l)) || '';
}

/**
 * 建立「seed 標籤 → 隊名」對照表（涵蓋 seed 陣列的所有元素，
 * 所以 'A1' 與 'A冠' 都能直接查到同一隊的隊名）。
 * @param {object[]} teams 隊伍清單
 * @returns {Record<string, string>}
 */
export function teamNameBySeed(teams) {
  const map = {};
  (teams || []).forEach((t) => {
    seedList(t).forEach((label) => {
      if (label && t.team) map[label] = t.team;
    });
  });
  return map;
}

/**
 * 將 teams 欄位中的佔位標籤換成實際隊名（查無對照則原樣保留）。
 * @param {string[]} names 場次的 teams（隊名或佔位標籤）
 * @param {Record<string, string>} nameBySeed teamNameBySeed 的結果
 * @returns {string[]}
 */
export function resolveTeams(names, nameBySeed) {
  return (Array.isArray(names) ? names : []).map((n) => nameBySeed[n] || n || '');
}

/**
 * 回傳 teams 已解析為實際隊名的場次副本（供前台顯示）。
 * @param {object} match 場次資料
 * @param {Record<string, string>} nameBySeed teamNameBySeed 的結果
 * @returns {object}
 */
export function resolveMatch(match, nameBySeed) {
  return { ...match, teams: resolveTeams(match.teams, nameBySeed) };
}

// 佔位標籤 → 引用它的複賽場次（如 F冠 → '30'、'30勝' → '38'），供推算 bracket 動線
const SLOT_TO_MATCH = {};
Object.entries(FINALS_SLOTS).forEach(([no, pair]) => {
  pair.forEach((l) => {
    SLOT_TO_MATCH[l] = no;
  });
});

/**
 * 修剪 seed 標籤陣列，維持依附鏈完整：
 * 名次須依附同組的預賽位置；勝敗標籤須從名次沿 bracket 連續可達。
 * 失去依附的標籤（換組、上游標籤被移除、斷鏈）一律剔除。
 * @param {string[]} tags seed 標籤陣列
 * @returns {string[]} 修剪後的標籤陣列（順序：位置 → 名次 → 勝敗依場次）
 */
export function normalizeSeedTags(tags) {
  const list = (tags || []).filter(Boolean);
  const slot = list.find((l) => PRELIM_SEED_RE.test(l)) || '';
  const rank = (slot && list.find((l) => RANK_SEED_RE.test(l) && l[0] === slot[0])) || '';
  const kept = [slot, rank].filter(Boolean);
  // 從名次沿 bracket 逐場走，只保留連續可達的勝敗標籤
  let cur = rank;
  while (cur && SLOT_TO_MATCH[cur]) {
    const no = SLOT_TO_MATCH[cur];
    const held = list.find((l) => l === `${no}勝` || l === `${no}敗`);
    if (!held) break;
    kept.push(held);
    cur = held;
  }
  return kept;
}
