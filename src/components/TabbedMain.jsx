import TabNav from './TabNav';

// 帶內部頁籤的頁面版型外殼：
// 電腦版頁籤在內容左側（垂直），手機版自動回到上方（水平）。
// 內容由 children 提供（可為注入的靜態 HTML 或 React 區塊），
// 統一套用 .page-main 固定主內容寬度，使各頁尺寸一致。

/**
 * @param {{ id?: string, tabs: {key: string, label: string, icon?: import('react').ReactNode}[], active: string, onChange: (key: string) => void, children: import('react').ReactNode }} props
 */
export default function TabbedMain({ id, tabs, active, onChange, children }) {
  return (
    <main id={id} className="page-main">
      <div className="flex flex-col md:flex-row gap-6">
        <aside className="md:w-44 md:flex-shrink-0">
          <TabNav
            tabs={tabs}
            active={active}
            onChange={onChange}
            orientation="vertical"
            className="md:sticky md:top-24"
          />
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </main>
  );
}
