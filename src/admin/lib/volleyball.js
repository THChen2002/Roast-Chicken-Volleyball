// ============================================================
// 排球計分規則（烤雞盃，三戰兩勝）
//   第 1、2 局：硬性搶 25（先到 25 分即勝，25:24 也算贏）
//   第 3 局   ：15 分，超過 14 平後需領先 2 分，無上限 deuce
// ============================================================

export const BEST_OF = 3; // 三戰兩勝
export const SETS_TO_WIN = 2;

/** 該局目標分數 */
export const setTarget = (setNo) => (setNo >= 3 ? 15 : 25);

/** 解析 "a:b" 字串為 [a, b] 數字 */
export function parseScore(str) {
  const [a, b] = String(str || '0:0')
    .split(':')
    .map((n) => Number(n) || 0);
  return [a, b];
}

/** 由各局比分推算大比分（勝局數），與目標分數無關，純比較每局左右大小 */
export function gameScoreFromSets(setScores) {
  let a = 0;
  let b = 0;
  (setScores || []).forEach((s) => {
    const [l, r] = parseScore(s);
    if (l > r) a += 1;
    else if (r > l) b += 1;
  });
  return `${a}:${b}`;
}

/** 該局是否已分出勝負 */
export function isSetWon(a, b, setNo) {
  const t = setTarget(setNo);
  if (setNo >= 3) return Math.max(a, b) >= t && Math.abs(a - b) >= 2; // 第三局需領先 2 分
  return Math.max(a, b) >= t; // 前兩局先到即勝
}

/** 替 team（0/1）加 1 分後是否由該隊贏得本局 → 局末點／賽末點判斷 */
export function isSetPoint(a, b, setNo, team) {
  if (isSetWon(a, b, setNo)) return false; // 本局已分勝負，不再有局末點
  const na = team === 0 ? a + 1 : a;
  const nb = team === 1 ? b + 1 : b;
  return isSetWon(na, nb, setNo);
}

/**
 * 由 setScores 陣列推導整場比賽狀態。
 * 約定：陣列最後一筆為「進行中／最新」的一局，前面為已打完的局。
 * @param {string[]} setScores
 */
export function computeMatch(setScores) {
  const raw =
    Array.isArray(setScores) && setScores.length ? setScores : ['0:0'];
  const wins = [0, 0];

  const setInfos = raw.map((s, i) => {
    const [a, b] = parseScore(s);
    const setNo = i + 1;
    const won = isSetWon(a, b, setNo);
    const winner = won ? (a > b ? 0 : 1) : -1;
    if (winner >= 0) wins[winner] += 1;
    return { a, b, setNo, won, winner };
  });

  const curIdx = raw.length - 1;
  const current = setInfos[curIdx];
  const matchWinner = wins[0] >= SETS_TO_WIN ? 0 : wins[1] >= SETS_TO_WIN ? 1 : -1;
  // 可進入下一局：本局已分勝負、比賽未結束、且尚未達最多局數
  const canAdvance = current.won && matchWinner < 0 && raw.length < BEST_OF;

  return {
    raw,
    setInfos,
    wins,
    gameScore: `${wins[0]}:${wins[1]}`,
    curIdx,
    current,
    setNo: raw.length,
    matchWinner,
    canAdvance,
  };
}
