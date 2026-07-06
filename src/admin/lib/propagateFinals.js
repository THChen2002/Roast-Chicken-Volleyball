import { updateTeam } from '../../services/firestore';
import { seedList } from '../../lib/teamSeed';
import { finalsPropagationTargets } from './finals';

// ============================================================
// propagateFinals — 複賽勝敗標籤自動寫入
// 場次結束後，自動把「X勝／X敗」標籤寫入勝敗兩隊的 seed 陣列；
// 後續引用「X勝／X敗」佔位的場次由 seed 反查隊名自動顯示對戰隊伍，
// 場次文件不需寫入隊名。重判結果時會先移除本場舊標籤再重寫。
// ============================================================

/**
 * 將 matchNo 的勝敗結果以標籤（X勝／X敗）寫入兩隊的 seed 陣列。
 * winner／loser 必須是實際隊名；佔位標籤在隊伍清單中比對不到，自然不會寫入。
 * @param {string|number} matchNo 已結束的場次
 * @param {string} winner 勝方隊名
 * @param {string} loser 敗方隊名
 * @param {object[]} teams 隊伍文件清單（含 id）
 */
export async function propagateFinalsResult(matchNo, winner, loser, teams) {
  if (!finalsPropagationTargets(matchNo).length) return; // 預賽或無後續場次：不需標籤

  const tagRe = new RegExp(`^${matchNo}[勝敗]$`);
  const ops = [];
  (teams || []).forEach((t) => {
    const tags = seedList(t);
    const kept = tags.filter((l) => !tagRe.test(l)); // 重判時先移除本場舊標籤
    let next = kept;
    if (t.team && t.team === winner) next = [...kept, `${matchNo}勝`];
    else if (t.team && t.team === loser) next = [...kept, `${matchNo}敗`];
    // 內容無變動就不寫，避免多餘的寫入
    if (next.length !== tags.length || next.some((l, i) => l !== tags[i])) {
      ops.push(updateTeam(t.id, { seed: next }));
    }
  });
  await Promise.all(ops);
}
