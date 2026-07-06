// 內部頁籤切換列。
// - horizontal：水平排列（置頂）。
// - vertical：響應式——手機（< md）水平置頂、電腦（md+）垂直置於側邊。
// 每個頁籤可帶 icon（顯示於文字左側）。

/**
 * 頁籤切換列。
 * @param {{ tabs: {key: string, label: string, icon?: import('react').ReactNode}[], active: string, onChange: (key: string) => void, orientation?: 'horizontal' | 'vertical', className?: string }} props
 */
export default function TabNav({ tabs, active, onChange, orientation = 'horizontal', className = '' }) {
  const isVertical = orientation === 'vertical';

  return (
    <div
      role="tablist"
      aria-orientation={orientation}
      // vertical 模式採響應式：手機橫向換行、電腦垂直堆疊
      className={`flex gap-2 ${isVertical ? 'flex-row flex-wrap md:flex-col' : 'flex-row flex-wrap'} ${className}`}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={[
              // 簡約風格：active 用黃色底線 + navy 文字；vertical 於 md+ 用黃色左邊條
              'inline-flex items-center gap-2 px-5 py-2.5 font-semibold transition-colors duration-200 whitespace-nowrap',
              isVertical ? 'md:w-full md:text-left border-b-2 md:border-b-0 md:border-l-4' : 'border-b-2',
              selected
                ? 'border-vbyellow-400 text-navy-900'
                : 'border-transparent text-navy-400 hover:text-navy-700 hover:border-navy-200',
            ].join(' ')}
          >
            {tab.icon ? <span className="flex-shrink-0">{tab.icon}</span> : null}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
