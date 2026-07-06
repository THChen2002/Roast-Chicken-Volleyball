// ============================================================
// 人氣投票 cookie 工具
// 以「場次（matchNo）」為單位記錄使用者投給哪一隊：一場一個 cookie。
//   名稱：rcv_<matchNo>   值：0 或 1（隊伍索引）
// 設計理由：
//   · 以 matchNo 命名 → 對應場次判斷是否投過、投給誰（可改票）。
//   · 場次結束時主動刪除該 cookie（clearVoteCookie），釋放後同場地下一場即可重投。
//   · 保留 max-age 作為保險（避免瀏覽器一直留著），但正常流程靠結束時清除。
// 注意：cookie 屬前端限制，無痕／換裝置仍可再投，非嚴格一人一票。
// ============================================================

const PREFIX = 'rcv_'; // roast-chicken vote
const MAX_AGE = 60 * 60 * 6; // 6 小時保險，場次結束會主動清除

/**
 * 讀取目前所有投票 cookie。
 * @returns {Record<string, number>} { matchNo: teamIndex }
 */
export function readVoteCookies() {
  const out = {};
  if (typeof document === 'undefined' || !document.cookie) return out;
  for (const part of document.cookie.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (!name.startsWith(PREFIX)) continue;
    const matchNo = decodeURIComponent(name.slice(PREFIX.length));
    const team = Number(decodeURIComponent(part.slice(eq + 1).trim()));
    if (matchNo && (team === 0 || team === 1)) out[matchNo] = team;
  }
  return out;
}

/**
 * 記錄某場次投給哪一隊（改票時覆寫同一個 cookie）。
 * @param {string} matchNo
 * @param {number} teamIndex 0 或 1
 */
export function setVoteCookie(matchNo, teamIndex) {
  document.cookie = `${PREFIX}${encodeURIComponent(matchNo)}=${teamIndex}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}

/**
 * 移除某場次的投票 cookie（場次結束或換場時呼叫）。
 * @param {string} matchNo
 */
export function clearVoteCookie(matchNo) {
  document.cookie = `${PREFIX}${encodeURIComponent(matchNo)}=; path=/; max-age=0; samesite=lax`;
}
