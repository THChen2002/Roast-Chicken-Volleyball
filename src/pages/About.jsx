// 關於比賽：側邊頁籤切換「比賽介紹 / 競賽章程 / 相關檔案」三區塊。
// 介紹與相關檔案為靜態 React 元件；「競賽章程」內容來自 Firebase（config/regulations）。
import { useEffect, useState } from 'react';
import TabbedMain from '../components/TabbedMain';
import AboutIntro from '../components/about/AboutIntro';
import AboutFiles from '../components/about/AboutFiles';
import { fetchRegulations } from '../services/firestore';
import { IconInfo, IconClipboard, IconFolder } from '../components/TabIcons';

const TABS = [
  { key: 'intro', label: '比賽介紹', icon: IconInfo },
  { key: 'rules', label: '競賽章程', icon: IconClipboard },
  { key: 'files', label: '相關檔案', icon: IconFolder },
];

export default function About() {
  const [active, setActive] = useState('intro');
  const [articles, setArticles] = useState(null); // null = 載入中

  // 競賽章程：自 Firebase 取得
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { articles } = await fetchRegulations();
        if (alive) setArticles(articles);
      } catch (err) {
        console.error('獲取競賽章程失敗:', err);
        if (alive) setArticles([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <TabbedMain id="aboutContainer" tabs={TABS} active={active} onChange={setActive}>
      {active === 'intro' && <AboutIntro />}
      {active === 'files' && <AboutFiles />}

      {/* 競賽章程：Firebase 動態內容 */}
      {active === 'rules' && (
        <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-6 sm:p-8">
          {/* 白底細邊框輕陰影卡片，標題運動字體 + 深海軍藍 */}
          <div className="flex items-center mb-6">
            <div className="bg-vbyellow-100 rounded-full p-3 mr-4 text-navy-700">{IconClipboard}</div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-wide text-navy-800">競賽章程</h2>
          </div>

          {articles === null ? (
            <p className="text-gray-500">載入中…</p>
          ) : articles.length === 0 ? (
            <p className="text-gray-500">競賽章程尚未公布，敬請期待。</p>
          ) : (
            <div className="space-y-4">
              {articles.map((article, idx) => (
                <div key={idx} className="bg-navy-50 p-4 rounded-lg border-l-4 border-vbyellow-400">{/* 條文：navy 淺底 + 黃色左邊條 */}
                  {article.title ? (
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{article.title}</h3>
                  ) : null}
                  {/* whitespace-pre-line 保留換行，純文字輸出避免 XSS */}
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{article.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </TabbedMain>
  );
}
