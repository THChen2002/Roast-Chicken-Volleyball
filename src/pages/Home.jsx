import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeMarquee, subscribeAnnouncements, subscribeRegistration } from '../services/firestore';

// 公告類型 → 樣式對應（Court Night 主題：白底卡片 + 類型徽章與左側色條點綴）
// typeClass：類型徽章；bgClass：左側色條（卡片本體統一白底 navy 細框）
const ANNOUNCEMENT_TYPE_MAP = {
  重要: { typeClass: 'bg-red-500 text-white', bgClass: 'border-l-red-500' },
  一般: { typeClass: 'bg-navy-700 text-white', bgClass: 'border-l-navy-400' },
  賽程: { typeClass: 'bg-court text-white', bgClass: 'border-l-court' },
  結果: { typeClass: 'bg-vbyellow-400 text-navy-900', bgClass: 'border-l-vbyellow-400' },
};

// 首頁五個功能卡片
const FEATURE_CARDS = [
  {
    to: '/score',
    title: '即時比分',
    desc: '即時掌握比賽分數',
    icon: (
      <svg className="w-8 h-8 text-navy-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 15C8.68629 15 6 12.3137 6 9V3.44444C6 3.0306 6.06031 2.82367 6.06031 2.65798C6.16141 2.38021 6.38021 2.16141 6.65798 2.06031C6.82367 2 7.0306 2 7.44444 2H16.5556C16.9694 2 17.1763 2 17.342 2.06031C17.6198 2.16141 17.8386 2.38021 17.9397 2.65798C18 2.82367 18 3.0306 18 3.44444V9C18 12.3137 15.3137 15 12 15ZM12 15V18M18 4H20.5C20.9659 4 21.1989 4 21.3827 4.07612C21.6277 4.17761 21.8224 4.37229 21.9239 4.61732C22 4.80109 22 5.03406 22 5.5V6C22 6.92997 22 7.39496 21.8978 7.77646C21.6204 8.81173 20.8117 9.62038 19.7765 9.89778C19.395 10 18.93 10 18 10M6 4H3.5C3.03406 4 2.80109 4 2.61732 4.07612C2.37229 4.17761 2.17761 4.37229 2.07612 4.61732C2 4.80109 2 5.03406 2 5.5V6C2 6.92997 2 7.39496 2.10222 7.77646C2.37962 8.81173 3.18827 9.62038 4.22354 9.89778C4.60504 10 5.07003 10 6 10M7.44444 22H16.5556C16.801 22 17 21.801 17 21.5556C17 19.5919 15.4081 18 13.4444 18H10.5556C8.59188 18 7 19.5919 7 21.5556C7 21.801 7.19898 22 7.44444 22Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/schedule',
    title: '賽程表',
    desc: '查詢最新賽事與時間',
    icon: (
      <svg fill="#1B3A5C" xmlns="http://www.w3.org/2000/svg" width="28px" height="28px" viewBox="0 0 52 52">
        <path d="M23.1,23H10.8c-0.7,0-1.4,0.6-1.4,1.3v10.5H5.3c-0.7,0-1.4,0.7-1.4,1.4v10c0,0.7,0.7,1.4,1.4,1.4H19c0.7,0,1.4-0.7,1.4-1.4v-10c0-0.7-0.7-1.4-1.4-1.4h-4.1v-6.4h21.9v6.4h-4.1c-0.7,0-1.4,0.7-1.4,1.4v10c0,0.7,0.7,1.4,1.4,1.4h13.7c0.7,0,1.3-0.7,1.3-1.4v-10c0-0.7-0.6-1.4-1.3-1.4h-4.2V24.3c0-0.7-0.7-1.3-1.4-1.3H28.6v-6.4h4.1c0.7,0,1.3-0.7,1.3-1.4v-10c0-0.7-0.6-1.4-1.3-1.4H19c-0.7,0-1.4,0.7-1.4,1.4v10c0,0.7,0.7,1.4,1.4,1.4h4.2V23z" />
      </svg>
    ),
  },
  {
    to: '/results',
    title: '對戰成績',
    desc: '查看各隊對戰成績',
    icon: (
      <svg className="w-8 h-8 text-navy-700" fill="currentColor" viewBox="0 0 512 512">
        <path d="M469.973,75.985H353.357V50.769c0-11.605-9.408-21.013-21.013-21.013c-11.605,0-21.013,9.408-21.013,21.013v25.216H200.659V50.769c0-11.605-9.408-21.013-21.013-21.013c-11.605,0-21.013,9.408-21.013,21.013v25.216H42.027C18.853,75.985,0,94.838,0,118.012c0,11.55,0,297.873,0,322.206c0,23.174,18.853,42.027,42.027,42.027c18.793,0,409.188,0,427.946,0c23.174,0,42.027-18.853,42.027-42.027c0-24.441,0-310.739,0-322.206C512,94.838,493.147,75.985,469.973,75.985z M42.027,190.858v-72.847h0l116.607-0.007v19.62c0,11.605,9.408,21.013,21.013,21.013c11.605,0,21.013-9.408,21.013-21.013v-19.621l110.671-0.006v19.627c0,11.605,9.408,21.013,21.013,21.013c11.605,0,21.013-9.408,21.013-21.013v-19.629l116.615-0.007c0,0,0,0.008,0,0.024v72.847C451.18,190.858,60.785,190.858,42.027,190.858z M234.987,440.218H42.027V232.885h192.96V440.218z M469.973,440.218h-192.96V232.885h192.96V440.218z" />
      </svg>
    ),
  },
  {
    to: '/teams',
    title: '參賽名單',
    desc: '查看各隊參賽名單',
    icon: (
      <svg className="w-8 h-8 text-navy-700" fill="currentColor" viewBox="0 0 297 297">
        <path d="M62.691,173.816c8.795,19.75,24.211,35.883,43.415,45.644v8.03c0,0-59.418,16.422-78.758,23.324c-14.835,5.294-23.906,20.22-23.906,35.971c0,5.641,4.574,10.215,10.215,10.215s10.215-4.574,10.215-10.215c0-7.503,4.47-14.229,11.388-17.135l6.489-2.725v18.631c0,5.641,4.574,10.215,10.215,10.215s10.215-4.574,10.215-10.215V259.53l19.149-4.787l62.603,31.301c1.438,0.719,3.003,1.078,4.568,1.078s3.13-0.359,4.568-1.078l62.603-31.301l19.149,4.787v26.025c0,5.641,4.574,10.215,10.215,10.215s10.215-4.574,10.215-10.215v-18.631l6.488,2.725c6.918,2.906,11.389,9.632,11.389,17.135c0,5.641,4.574,10.215,10.215,10.215s10.215-4.574,10.215-10.215c0-15.751-9.072-30.677-23.907-35.971c-19.34-6.902-78.757-23.324-78.757-23.324v-8.03c19.204-9.761,34.621-25.894,43.415-45.644c21.459,0,38.916-24.118,38.916-44.865c0-14.621-7.312-25.049-21.55-29.266V55.368c0-5.641-4.574-10.215-10.215-10.215h-10.1C216.403,18.255,187.715,0,154.816,0h-12.632C109.285,0,80.597,18.255,65.64,45.152h-10.1c-5.641,0-10.215,4.574-10.215,10.215v44.317c-14.238,4.216-21.55,14.644-21.55,29.266C23.774,149.698,41.231,173.816,62.691,173.816z M65.755,84.992V65.583h165.49v19.409H65.755z M241.056,151.434c0.866-5.114,1.324-10.365,1.324-15.722v-17.103c10.409,1.868,10.415,7.84,10.415,10.342C252.795,137.031,247.563,147.231,241.056,151.434z M142.184,20.431h12.632c20.942,0,39.665,9.647,51.985,24.721H90.199C102.519,30.077,121.242,20.431,142.184,20.431z M44.205,128.951c0-2.502,0.006-8.474,10.415-10.342v17.103c0,5.357,0.458,10.608,1.324,15.722C49.437,147.231,44.205,137.031,44.205,128.951z M75.051,135.712v-30.289h146.898v30.289c0,40.5-32.949,73.448-73.449,73.448S75.051,176.212,75.051,135.712z M148.5,265.486l-36.715-18.357l7.014-1.754c4.547-1.136,7.737-5.222,7.737-9.91v-8.475c7.049,1.696,14.402,2.601,21.963,2.601s14.915-0.905,21.963-2.601v8.475c0,4.688,3.19,8.774,7.737,9.91l7.014,1.754L148.5,265.486z" />
      </svg>
    ),
  },
  {
    to: '/about',
    title: '關於比賽',
    desc: '查看比賽相關資訊',
    icon: (
      <svg className="w-8 h-8 text-navy-700" fill="currentColor" viewBox="0 0 512 512">
        <path d="M213.333333,3.55271368e-14 C95.51296,3.55271368e-14 3.55271368e-14,95.51168 3.55271368e-14,213.333333 C3.55271368e-14,331.153707 95.51296,426.666667 213.333333,426.666667 C331.154987,426.666667 426.666667,331.153707 426.666667,213.333333 C426.666667,95.51168 331.154987,3.55271368e-14 213.333333,3.55271368e-14 Z M213.333333,384 C119.227947,384 42.6666667,307.43872 42.6666667,213.333333 C42.6666667,119.227947 119.227947,42.6666667 213.333333,42.6666667 C307.44,42.6666667 384,119.227947 384,213.333333 C384,307.43872 307.44,384 213.333333,384 Z M240.04672,128 C240.04672,143.46752 228.785067,154.666667 213.55008,154.666667 C197.698773,154.666667 186.713387,143.46752 186.713387,127.704107 C186.713387,112.5536 197.99616,101.333333 213.55008,101.333333 C228.785067,101.333333 240.04672,112.5536 240.04672,128 Z M192.04672,192 L234.713387,192 L234.713387,320 L192.04672,320 L192.04672,192 Z" transform="translate(42.666667, 42.666667)" />
      </svg>
    ),
  },
];

export default function Home() {
  const [marquee, setMarquee] = useState({ text: '', visible: false });
  const [registration, setRegistration] = useState({ url: '', isOpen: false, deadline: '', eventDate: '' });
  const [announcements, setAnnouncements] = useState([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [annError, setAnnError] = useState(false);

  useEffect(() => {
    const unsubMarquee = subscribeMarquee(
      (data) => setMarquee(data),
      (err) => console.error('獲取跑馬燈資料失敗:', err),
    );
    const unsubRegistration = subscribeRegistration(
      (data) => setRegistration(data),
      (err) => console.error('獲取報名設定失敗:', err),
    );
    const unsubAnn = subscribeAnnouncements(
      (data) => {
        setAnnouncements(
          data.map((item) => {
            const cfg = ANNOUNCEMENT_TYPE_MAP[item.type] || ANNOUNCEMENT_TYPE_MAP['一般'];
            return { ...item, ...cfg };
          }),
        );
        setAnnLoading(false);
        setAnnError(false);
      },
      (err) => {
        console.error('獲取公告資料失敗:', err);
        setAnnLoading(false);
        setAnnError(true);
      },
    );
    return () => {
      unsubMarquee();
      unsubRegistration();
      unsubAnn();
    };
  }, []);

  // 未開放時，依截止日期區分「尚未開放」與「已截止」兩種顯示文字（不影響開放狀態本身，仍完全由後台勾選框控制）
  const isPastDeadline = registration.deadline ? new Date(`${registration.deadline}T23:59:59`) < new Date() : false;

  return (
    <main>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center my-10">
          {/* 跑馬燈模組：賽事快訊 Ticker（深色轉播條，呼應記分板風格） */}
          {marquee.text ? (
            <div className="marquee-bar">
              <div className="marquee-tag">
                <span className="marquee-tag-dot"></span>
                <span className="announcementText">重要公告</span>
              </div>
              <div className="marquee-icon">
                {/* 喇叭 icon：單色版，深底可見 */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 10v4a1 1 0 0 0 1 1h2.6l4.7 3.9A1 1 0 0 0 13 18V6a1 1 0 0 0-1.7-.8L6.6 9H4a1 1 0 0 0-1 1Z" />
                  <path d="M16 8.5a4 4 0 0 1 0 7 1 1 0 0 1-.5-1.86 2 2 0 0 0 0-3.28A1 1 0 0 1 16 8.5Z" />
                </svg>
              </div>
              <div className="marquee-container">
                <div className="marquee-text">{marquee.text}</div>
              </div>
            </div>
          ) : null}

          {/* Hero 標題 */}
          <div className="flex justify-center mb-4">
            {/* 排球 icon：排球黃 */}
            <svg fill="#FFC53D" width="150px" height="150px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1">
              <path d="M20.59,6.9a0,0,0,0,1,0,0,.86.86,0,0,0-.07-.1A10,10,0,0,0,7.6,3l0,0h0l-.07,0a10,10,0,0,0-1,17.19h0l.33.2.1.07h0A9.93,9.93,0,0,0,12,22h.21A10,10,0,0,0,20.59,6.9ZM19,8.06a7.64,7.64,0,0,1,.65,1.46,10,10,0,0,0-3-.49.81.81,0,0,0-.31,0,9.78,9.78,0,0,0-3.58.73,7.85,7.85,0,0,1-1.84-1.6A8.16,8.16,0,0,1,19,8.06ZM12,4a7.86,7.86,0,0,1,4,1.07A7.77,7.77,0,0,0,15,5,10,10,0,0,0,9.8,6.47a8,8,0,0,1-.64-1.94A7.92,7.92,0,0,1,12,4ZM6,6.71A8.26,8.26,0,0,1,7.33,5.52,9.9,9.9,0,0,0,12,11.61a7.89,7.89,0,0,1-.77,2.88A8,8,0,0,1,6,7C6,6.9,6,6.81,6,6.71ZM4,12a8.1,8.1,0,0,1,.36-2.37,10,10,0,0,0,5.7,6.56,7.84,7.84,0,0,1-2.93,2.14A8,8,0,0,1,4,12Zm7.86,8a7.8,7.8,0,0,1-2.61-.49,9.94,9.94,0,0,0,3.23-3.22l0,0A10,10,0,0,0,14,11.41a7.71,7.71,0,0,1,1.78-.36A8,8,0,0,1,11.86,20Zm4.22-1.12A9.94,9.94,0,0,0,18,13a10.69,10.69,0,0,0-.18-1.88,8.34,8.34,0,0,1,2.17.7c0,.06,0,.12,0,.18A8,8,0,0,1,16.08,18.87Z" />
            </svg>
          </div>
          {/* 主標題：運動字體 + 深海軍藍，下方黃色短底線裝飾 */}
          <h1 className="text-3xl md:text-4xl font-bold font-display tracking-wide text-navy-800 mb-2">2026第十三屆國北烤雞盃混合排球賽</h1>
          <div className="h-1 w-16 bg-vbyellow-400 rounded-full mx-auto"></div>
          {/* 比賽日期：後台「報名設定」手動填寫（config/registration.eventDate） */}
          {registration.eventDate && (
            <div className="flex items-center gap-2 justify-center mt-6">
              <svg fill="#000000" width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="icon line-color">
                <rect x="3" y="4" width="18" height="17" rx="1" style={{ fill: 'none', stroke: 'rgb(0, 0, 0)', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2 }} />
                {/* 日曆 icon：排球黃強調 */}
                <path d="M20,4H4A1,1,0,0,0,3,5V9H21V5A1,1,0,0,0,20,4ZM17,3V5M12,3V5M7,3V5" style={{ fill: 'none', stroke: '#FFC53D', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2 }} />
              </svg>
              <p className="text-lg text-navy-700 font-bold">{registration.eventDate}</p>
            </div>
          )}

          {/* 立即報名：連結與開放狀態由後台「報名設定」(config/registration) 控制 */}
          {/* CTA：開放時黃底深藍字；未開放/已截止時灰底不可點擊 */}
          <div className="flex flex-col items-center gap-2 mt-6">
            {registration.isOpen ? (
              <a
                href={registration.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-vbyellow-400 text-navy-900 font-bold shadow-sm hover:bg-vbyellow-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                立即報名
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-200 text-gray-400 font-bold cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                {isPastDeadline ? '報名已截止' : '尚未開放報名'}
              </button>
            )}
            {registration.deadline && (
              <p className="text-sm text-gray-500">報名截止日期：{registration.deadline.replaceAll('-', '/')}</p>
            )}
          </div>
        </div>
      </div>

      {/* 功能卡片 */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 白底細邊框輕陰影卡片，hover 顯示黃色邊框 */}
          {FEATURE_CARDS.map((card) => (
            <div key={card.to} className="bg-white rounded-xl border border-navy-100 shadow-sm hover:border-vbyellow-400 transition-colors cursor-pointer p-6 flex flex-col items-center">
              <div className="bg-vbyellow-100 rounded-full p-3 mb-4">{card.icon}</div>
              <h2 className="text-xl font-semibold text-navy-800 mb-2">{card.title}</h2>
              <p className="text-gray-500 mb-4 text-center">{card.desc}</p>
              <Link to={card.to} className="text-court font-medium hover:underline">
                前往查看 →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* 最新公告 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 公告卡片：白底細邊框輕陰影 */}
        <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-4 sm:p-6 lg:p-8 mt-10 w-full">
          <div>
            <div className="flex items-center mb-6">
              <div className="bg-vbyellow-100 rounded-full p-3 mr-4">
                <svg fill="#1B3A5C" xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 52 52">
                  <g>
                    <path d="M22.7,45.4l-1.3-1c-1.4-1-1.4-3-1.4-4v-2.9c0-0.8-0.7-1.5-1.5-1.5h-6c-0.8,0-1.5,0.7-1.5,1.5v7.7c0,2.7,1.6,4.8,4.1,4.8H20c2.9,0,3.1-2,3.1-2l0,0C23.1,48,23.6,46.2,22.7,45.4z" />
                    <path d="M45,18V4.4c0,0,0,0,0-0.1c0-2.4-3-3.1-4.6-1.5l-8.9,8.4c-1.4,1.2-3.2,1.7-5,1.7H11.3C6.1,13,2,17.5,2,22.7v0.2c0,5.2,4.1,9.1,9.3,9.1h15.2c1.9,0,3.7,0.8,5.1,2l8.8,8.6c1.6,1.6,4.6,1,4.6-1.4c0,0,0,0,0-0.1V27.6c3,0,4.8-2.1,4.8-4.8C49.8,20.1,48,18,45,18z" />
                  </g>
                </svg>
              </div>
              <h2 className="text-xl sm:text-3xl font-bold font-display tracking-wide text-navy-800">最新公告</h2>
            </div>

            <div className="space-y-3 sm:space-y-4 w-full">
              {annLoading ? (
                <div className="w-full flex flex-col items-center justify-center py-8">
                  <div className="relative">
                    {/* 載入 spinner：navy 系 */}
                    <div className="w-8 h-8 border-2 border-navy-100 rounded-full animate-spin"></div>
                    <div className="w-8 h-8 border-2 border-navy-700 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">載入公告中...</div>
                </div>
              ) : annError ? (
                <div className="text-red-500 text-center p-4 w-full break-words">無法獲取公告資料，請稍後再試。</div>
              ) : announcements.length === 0 ? (
                <div className="text-gray-500 text-center p-8 w-full">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-4.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
                  </svg>
                  <p className="text-lg font-medium mb-2">暫無公告</p>
                  <p className="text-sm">目前沒有新的公告資訊</p>
                </div>
              ) : (
                announcements.map((a, i) => (
                  <div
                    key={i}
                    className={`bg-white border border-navy-100 border-l-4 ${a.bgClass} rounded-r-xl rounded-l-md shadow-sm hover:border-navy-200 transition-colors p-3 sm:p-4 w-full`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                          <span className={`${a.typeClass} text-xs font-semibold px-2.5 py-0.5 rounded-full self-start`}>{a.type}</span>
                          <span className="text-slate-400 text-xs sm:text-sm tabular-nums">{a.date}</span>
                        </div>
                        <h4 className="font-semibold text-navy-800 mb-1 text-sm sm:text-base break-words">{a.title}</h4>
                        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed break-words">{a.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
