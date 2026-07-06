// 場次編號（數字 1–49：預賽 1–21、複賽 22–49），對應前台 bracket 的 data-match-no
export const MATCH_NUMBERS = Array.from({ length: 49 }, (_, i) => String(i + 1));

/** 取得 matchNo 的排序索引（1 起算；非數字排最後）。 */
export const matchNoIndex = (no) => {
  const s = String(no ?? '').trim();
  return /^\d+$/.test(s) ? Number(s) : 9999;
};

// 小組選項（A~F；可留空）
export const GROUP_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

// 輪次選項
export const ROUND_OPTIONS = [
  { value: 'prelim', label: '預賽（循環賽）' },
  { value: 'finals', label: '複賽（複決賽）' },
];

// 場次狀態
export const STATUS_OPTIONS = [
  { value: 'scheduled', label: '未開始' },
  { value: 'live', label: '進行中' },
  { value: 'done', label: '已完賽' },
];

export const STATUS_LABEL = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label]),
);
