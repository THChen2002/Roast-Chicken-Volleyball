// 全螢幕載入動畫
export default function LoadingOverlay({ title = '載入比賽資料中...', subtitle = '請稍候' }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* 扁平卡片（rounded-xl + 1px 邊框 + 輕陰影） */}
      <div className="bg-white rounded-xl border border-navy-100 p-8 shadow-sm flex flex-col items-center">
        <div className="relative">
          {/* 載入環：navy 淺底 + 排球黃旋轉弧 */}
          <div className="w-16 h-16 border-4 border-navy-100 rounded-full animate-spin"></div>
          <div className="w-16 h-16 border-4 border-vbyellow-400 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <div className="mt-4 text-xl font-semibold text-gray-700">{title}</div>
        <div className="mt-2 text-sm text-gray-500">{subtitle}</div>
      </div>
    </div>
  );
}
