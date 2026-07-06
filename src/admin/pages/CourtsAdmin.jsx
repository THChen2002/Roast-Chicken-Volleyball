import { useEffect, useRef, useState } from 'react';
import { subscribeCourts, replaceCourts, DEFAULT_COURTS } from '../../services/firestore';
import { PageHeader, ErrorBar, Card, inputCls } from '../components/ui';

// ============================================================
// CourtsAdmin — 場地管理頁（courts collection）
// 維護場地名稱清單；賽程表欄位與場次「場地」下拉選項皆依此清單產生。
// 編輯即自動儲存（debounce），不需手動按「儲存」。
// ============================================================
export default function CourtsAdmin() {
  const [courts, setCourts] = useState(DEFAULT_COURTS);
  const [error, setError] = useState('');
  const initialized = useRef(false); // 僅以第一筆遠端資料初始化，避免覆寫編輯中的草稿
  const saveTimer = useRef(null);
  const skipNextSave = useRef(true); // 遠端初始化那次不觸發自動儲存

  useEffect(() => {
    const unsub = subscribeCourts(
      (list) => {
        if (initialized.current) return;
        initialized.current = true;
        skipNextSave.current = true; // 遠端資料進來這次也不要觸發自動儲存（避免尚未編輯就把預設值寫回去）
        setCourts(list.length ? list : DEFAULT_COURTS); // 尚無資料時帶入預設，僅供編輯起手，不會自動存檔
      },
      (err) => setError(err.message),
    );
    return unsub;
  }, []);

  // 編輯後 debounce 自動儲存；驗證不通過（如打到一半的空白列）先不寫入，等修正後會自動重試
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const clean = courts.map((c) => c.trim()).filter(Boolean);
      if (!clean.length) return setError('至少需要一個場地');
      if (new Set(clean).size !== clean.length) return setError('場地名稱不可重複');
      try {
        await replaceCourts(clean);
        setError('');
      } catch (err) {
        setError(err.message || '儲存失敗');
      }
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [courts]);

  const setAt = (i, v) => setCourts((cs) => cs.map((c, j) => (j === i ? v : c)));
  const add = () => setCourts((cs) => [...cs, '']); // 新增場地固定加在最後面
  const removeAt = (i) => setCourts((cs) => cs.filter((_, j) => j !== i));

  // 即時預覽（去空白、去空值）：讓管理者先看到最終欄位
  const preview = courts.map((c) => c.trim()).filter(Boolean);

  return (
    <>
      <PageHeader title="場地管理" desc="這裡設定的場地，會成為賽程表的欄位與新增場次時「場地」的下拉選項" />
      <ErrorBar message={error} />

      <Card className="flex flex-col gap-4">
        {/* 操作說明 */}
        <p className="text-sm text-slate-500 bg-navy-50 rounded-lg px-3 py-2">
          輸入場地名稱（例：甲、乙、丙），修改後會自動儲存；
          <span className="font-medium text-slate-600">刪除</span> 移除、「新增場地」固定加在最後面。
        </p>

        {/* 場地清單（橫式單一 row） */}
        <div className="flex flex-wrap items-center gap-3">
          {courts.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg border border-navy-100 bg-white px-2 py-1.5">
              <span className="w-6 h-6 shrink-0 rounded-full bg-navy-100 text-navy-600 text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <input
                className={`${inputCls} w-24`}
                value={c}
                onChange={(e) => setAt(i, e.target.value)}
                placeholder="場地"
              />
              {/* 刪除 */}
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`刪除場地 ${c || i + 1}`}
                title="刪除"
                className="shrink-0 text-red-400 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 rounded-md p-1.5 transition-colors leading-none"
              >
                <i className="fa-solid fa-trash-can text-xs" aria-hidden="true"></i>
              </button>
            </div>
          ))}

          {courts.length === 0 && (
            <p className="text-sm text-slate-400 py-2">目前沒有場地，請按下方「新增場地」。</p>
          )}
        </div>

        <button
          type="button"
          onClick={add}
          className="self-start inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-800 border border-dashed border-navy-300 hover:border-navy-400 rounded-lg px-3 py-2"
        >
          ＋ 新增場地
        </button>

        {/* 預覽：最終呈現的欄位 */}
        <div className="text-sm text-slate-500 border-t border-navy-100 pt-3">
          賽程表欄位預覽：
          {preview.length ? (
            <span className="ml-1 inline-flex flex-wrap gap-1.5 align-middle">
              {preview.map((c, i) => (
                <span key={i} className="rounded-md bg-vbyellow-100 text-navy-800 font-medium px-2 py-0.5">
                  {c} 場
                </span>
              ))}
            </span>
          ) : (
            <span className="ml-1 text-slate-400">（尚無場地）</span>
          )}
        </div>
      </Card>
    </>
  );
}
