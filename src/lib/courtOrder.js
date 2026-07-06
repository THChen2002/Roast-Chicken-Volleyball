// 依「場地管理」（courts collection，已按 order 排序）決定場地顯示順序；
// 不在設定清單內的場地（如舊資料、已刪除場地）排到最後，並以名稱排序
export function courtRank(configCourts, field) {
  const i = configCourts.indexOf(field);
  return i < 0 ? configCourts.length : i;
}
