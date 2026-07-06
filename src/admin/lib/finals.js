// ============================================================
// 複賽（雙敗淘汰）固定 bracket 範本 — 依 2026 烤雞盃賽程表
// 6 組（A~E 各 3 隊、F 組 4 隊）。組別配對 (A,B)(C,D)(E,F)。
// 隊伍先以「佔位標籤」呈現（未抽籤）：
//   冠/亞/季/殿 = 各組名次；XX勝/XX敗 = 場次 XX 的勝/敗方；F季 = F組季軍（敗部種子）
// 各組名次由後台指派；XX勝/XX敗 於前一場標記完成時自動遞補（見 propagateFinals.js）。
// 日期／時間／場地一律由後台賽程頁指派並存入場次文件，此處不預設。
// 欄位：[場次, 隊A, 隊B]
// ============================================================

const TEMPLATE = [
  // 季軍組 + 冠亞交叉
  ['22', 'A季', 'B季'],
  ['23', 'C季', 'D季'],
  ['24', 'E季', 'F殿'],
  ['25', 'A冠', 'B亞'],
  ['26', 'C冠', 'D亞'],
  ['27', 'E冠', 'F亞'],
  ['28', 'A亞', 'B冠'],
  ['29', 'C亞', 'D冠'],
  ['30', 'E亞', 'F冠'],
  // 雙敗淘汰
  ['31', '27敗', '22勝'],
  ['32', '25敗', '23勝'],
  ['33', '26敗', '24勝'],
  ['34', '28敗', '30敗'],
  ['35', '29敗', 'F季'], // F季 = 敗部種子
  ['36', '25勝', '26勝'],
  ['37', '27勝', '28勝'],
  ['38', '29勝', '30勝'],
  ['39', '31勝', '36敗'],
  ['40', '32勝', '37敗'],
  ['41', '33勝', '38敗'],
  ['42', '34勝', '35勝'],
  ['43', '39勝', '40勝'],
  ['44', '41勝', '42勝'],
  ['45', '43勝', '44勝'],
  ['46', '45勝', '36勝'],
  ['47', '37勝', '38勝'],
  ['48', '46勝', '47勝'], // 冠軍戰
  ['49', '46敗', '47敗'], // 季軍戰
];

/** 場次 → 原始對戰位置標籤（如 ['A冠','B亞']、['27敗','22勝']），供前台賽程表小標顯示 */
export const FINALS_SLOTS = Object.fromEntries(
  TEMPLATE.map(([matchNo, a, b]) => [matchNo, [a, b]]),
);

/** 複賽所有佔位標籤集合（A冠、25勝、F季…）：隊名仍是佔位時不得向下遞補 */
export const FINALS_PLACEHOLDERS = new Set(TEMPLATE.flatMap(([, a, b]) => [a, b]));

/**
 * 查詢場次 matchNo 的勝／敗方會流向哪些後續場次。
 * @param {string|number} matchNo 已結束的場次
 * @returns {{matchNo: string, index: number, take: 'winner'|'loser'}[]}
 */
export function finalsPropagationTargets(matchNo) {
  const winRef = `${matchNo}勝`;
  const loseRef = `${matchNo}敗`;
  const targets = [];
  TEMPLATE.forEach(([no, a, b]) => {
    [a, b].forEach((slot, index) => {
      if (slot === winRef) targets.push({ matchNo: no, index, take: 'winner' });
      else if (slot === loseRef) targets.push({ matchNo: no, index, take: 'loser' });
    });
  });
  return targets;
}
