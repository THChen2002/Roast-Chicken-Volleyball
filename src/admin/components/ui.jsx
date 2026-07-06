// 後台共用 UI 小元件與樣式常數（DRY：各管理頁共用）
// 視覺主題：延續前台「深海軍藍 navy × 排球黃 vbyellow」主題。

export const inputCls =
  'border border-navy-200 bg-white rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-vbyellow-400 focus:border-navy-300 transition-shadow';
export const btnPrimary =
  'inline-flex items-center justify-center gap-1 bg-vbyellow-400 hover:bg-vbyellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-navy-900 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors';
export const btnDanger =
  'text-sm text-red-500 hover:text-white hover:bg-red-500 px-3 py-1.5 rounded-lg transition-colors';

/** 卡片外框樣式（給內嵌編輯卡共用）：白底 + 1px 邊框 + 極輕陰影 */
export const cardCls =
  'bg-white rounded-xl shadow-sm border border-navy-100 p-5';

/** 直式標籤欄位 */
export function Field({ label, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="text-slate-500 font-medium">{label}</span>
      {children}
    </label>
  );
}

/** 頁首：左側排球黃粗邊條 + 標題 + 說明，右側動作 */
export function PageHeader({ title, desc, action }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div className="flex items-stretch gap-3">
        {/* 黃色左側粗邊條：記分板式點綴 */}
        <span className="w-1.5 rounded-full bg-vbyellow-400" />
        <div>
          <h1 className="text-2xl font-bold text-navy-800 font-display tracking-wide">{title}</h1>
          {desc && <p className="text-slate-500 text-sm mt-1">{desc}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** 錯誤提示列 */
export function ErrorBar({ message }) {
  if (!message) return null;
  return (
    <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-4">
      {message}
    </div>
  );
}

/** 白底卡片 */
export function Card({ children, className = '' }) {
  return <div className={`${cardCls} ${className}`}>{children}</div>;
}
