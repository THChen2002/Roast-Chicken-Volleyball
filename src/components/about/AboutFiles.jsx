// 關於比賽 — 相關檔案下載清單
// 清單內容來自 Firebase（config/aboutFiles），由後台「相關檔案」管理頁維護。
import { useEffect, useState } from 'react';
import { subscribeAboutFiles } from '../../services/firestore';

// 檔案類型顏色（後台依「檔案類型」自動配色，這裡對應成卡片／標籤實際樣式）
const TAG_COLOR_MAP = {
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  orange: 'bg-orange-100 text-orange-800',
  gray: 'bg-gray-100 text-gray-800',
};

const CARD_COLOR_MAP = {
  red: 'border-red-400 bg-red-50',
  blue: 'border-blue-400 bg-blue-50',
  green: 'border-green-400 bg-green-50',
  orange: 'border-orange-400 bg-orange-50',
  gray: 'border-navy-400 bg-navy-50',
};

const ICON_COLOR_MAP = {
  red: 'text-red-600',
  blue: 'text-blue-600',
  green: 'text-green-600',
  orange: 'text-orange-600',
  gray: 'text-navy-600',
};

const DocIcon = ({ colorCls }) => (
  <svg className={`w-10 h-10 ${colorCls}`} fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
      clipRule="evenodd"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export default function AboutFiles() {
  const [files, setFiles] = useState(null); // null = 載入中

  useEffect(() => {
    const unsub = subscribeAboutFiles(
      (data) => setFiles(data),
      (err) => {
        console.error('獲取相關檔案失敗:', err);
        setFiles([]);
      },
    );
    return unsub;
  }, []);

  return (
    <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-wide text-navy-800 mb-2">相關檔案</h2>
        <p className="text-gray-600">請下載以下相關檔案，詳細了解比賽規則與相關規定</p>
      </div>

      {files === null ? (
        <p className="text-gray-500">載入中…</p>
      ) : files.length === 0 ? (
        <p className="text-gray-500">目前尚未提供相關檔案。</p>
      ) : (
        <div className="space-y-4">
          {files.map((f, i) => (
            <div
              key={i}
              className={`border-l-4 p-4 rounded-r-lg flex items-center justify-between ${CARD_COLOR_MAP[f.color] || CARD_COLOR_MAP.gray}`}
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <DocIcon colorCls={ICON_COLOR_MAP[f.color] || ICON_COLOR_MAP.gray} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-800">{f.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{f.desc}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${TAG_COLOR_MAP[f.color] || TAG_COLOR_MAP.gray}`}>
                      {f.tag}
                    </span>
                  </div>
                </div>
              </div>
              <a
                href={f.href}
                target="_blank"
                rel="noreferrer"
                className="flex-shrink-0 bg-navy-700 hover:bg-navy-800 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center"
              >
                <DownloadIcon />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
