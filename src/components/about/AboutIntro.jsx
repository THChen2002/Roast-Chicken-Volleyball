// 關於比賽 — 比賽緣由與歷史沿革（原 raw/aboutMain.html 第一區塊的 React 版）

// 歷屆紀錄卡片色調
const TONE_CLS = {
  highlight: 'bg-vbyellow-50 border-l-4 border-vbyellow-400', // 本屆預告
  navy: 'bg-navy-50 border-l-4 border-navy-300', // 近兩屆
  alert: 'bg-red-50 border-l-4 border-red-400', // 停辦
  plain: 'bg-navy-50/50', // 更早屆次
};

// 歷史沿革（新到舊）。content 為該屆敘述（JSX）
const HISTORY = [
  {
    period: '114學年度下學期(2026夏)',
    tone: 'highlight',
    content: (
      <>
        <span className="text-navy-700 font-semibold">第十三屆烤雞盃即將展開！</span>
        <br />
        期待各隊伍的精彩表現，共同延續這項傳統盛事。
      </>
    ),
  },
  {
    period: '113學年度下學期(2025夏)',
    tone: 'navy',
    content: (
      <>
        由數資系主辦第十二屆烤雞盃（校友混排賽）。
        <br />
        <span className="text-navy-700 font-medium">本屆冠軍：數資系-好想畢業</span>
        <br />
        <span className="text-gray-600">本屆亞軍：特教系-Dr.黃🟨🟡</span>
        <br />
        <span className="text-gray-600">本屆季軍：藝設系-藝設老中青</span>
      </>
    ),
  },
  {
    period: '112學年度上學期(2024春)',
    tone: 'navy',
    content: (
      <>
        由自然系主辦第十一屆烤雞盃（校友混排賽）。
        <br />
        <span className="text-navy-700 font-medium">本屆冠軍：數資系-不小心報兩隊</span>
        <br />
        <span className="text-gray-600">本屆亞軍：數資系-數錢數到手軟</span>
        <br />
        <span className="text-gray-600">本屆季軍：幼教系-幼ㄎㄧˋ隊</span>
      </>
    ),
  },
  {
    period: '108～111學年度(2020-2023)',
    tone: 'alert',
    content: <span className="text-red-600">因疫情停辦</span>,
  },
  {
    period: '107學年度下學期(2019夏)',
    tone: 'plain',
    content: (
      <>
        由藝設系主辦第十屆烤雞盃（校友混排賽）。
        <br />
        <span className="text-navy-700 font-medium">本屆冠軍：特教系-特教椒麻雞</span>
        <br />
        <span className="text-gray-600">本屆亞軍：心諮系-丁丁與他的快樂夥伴們</span>
        <br />
        <span className="text-gray-600">本屆季軍：數資系-叔叔數數</span>
      </>
    ),
  },
  {
    period: '106學年度下學期(2018夏)',
    tone: 'plain',
    content: (
      <>
        由特教系主辦第九屆烤雞盃（校友混排賽）。
        <br />
        <span className="text-navy-700 font-medium">本屆冠軍：藝設系</span> /{' '}
        <span className="text-gray-600">亞軍：藝設系 / 季軍：社發系 / 殿軍：數資系</span>
      </>
    ),
  },
  {
    period: '105學年度下學期(2017夏)',
    tone: 'plain',
    content: (
      <>
        由藝設系主辦第八屆烤雞盃(校友混排賽)。
        <br />
        <span className="text-navy-700 font-medium">本屆冠軍：特教系</span> /{' '}
        <span className="text-gray-600">亞軍：數資系 / 季軍：社發系 / 殿軍：資科系</span>
      </>
    ),
  },
  {
    period: '104學年度下學期(2016夏)',
    tone: 'plain',
    content: (
      <>
        由資科系主辦、藝設系協辦第七屆烤雞盃(校友混排賽)。
        <br />
        <span className="text-navy-700 font-medium">本屆冠軍：藝設系</span> /{' '}
        <span className="text-gray-600">亞軍：特教系 / 季軍：資科系、教經系(並列)</span>
      </>
    ),
  },
  {
    period: '103學年度下學期(2015夏)',
    tone: 'plain',
    content: <>由藝設系與教經系共同舉辦第六屆烤雞盃(校友混排賽)。</>,
  },
  {
    period: '102學年度下學期(2014春)',
    tone: 'plain',
    content: (
      <>
        由資科系主辦、教經系協辦第五屆烤雞盃(校友混排賽)。
        <br />
        <span className="text-navy-700 font-medium">本屆冠軍：教經系、藝設系(並列)</span> /{' '}
        <span className="text-gray-600">季軍：幼教系</span>
      </>
    ),
  },
  {
    period: '101學年度下學期(2013春)',
    tone: 'plain',
    content: (
      <>
        由社發系與教育系主辦第四屆烤雞盃(校友混排賽)。
        <br />
        <span className="text-navy-700 font-medium">本屆冠軍：資科系</span> /{' '}
        <span className="text-gray-600">亞軍：教經系 / 季軍：數資系</span>
      </>
    ),
  },
  {
    period: '100學年度下學期(2012春)復辦',
    tone: 'plain',
    content: (
      <>
        由國北教大丙組排球隊主辦第三屆烤雞盃(開放校友)。
        <br />
        <span className="text-navy-700 font-medium">本屆冠軍：社發系、教育系(並列)</span>
      </>
    ),
  },
  {
    period: '99學年度下學期(2011夏)',
    tone: 'plain',
    content: <>礙於場地與日程困難而延期。</>,
  },
  {
    period: '98學年度下學期(2010夏)',
    tone: 'plain',
    content: <>由藝設系(第一屆冠軍)承辦第二屆烤雞盃(改為混合排球賽)。</>,
  },
  {
    period: '97學年度下學期(2009夏)',
    tone: 'plain',
    content: (
      <>
        由文產系發起第一屆烤雞盃女子排球比賽。
        <br />
        <span className="text-navy-700 font-medium">本屆冠軍：藝設系</span>
      </>
    ),
  },
];

export default function AboutIntro() {
  return (
    <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center mb-6">
        <div className="bg-vbyellow-100 rounded-full p-3 mr-4">
          <svg className="w-8 h-8 text-navy-700" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-wide text-navy-800">比賽緣由</h2>
      </div>
      <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed text-lg">
        <p className="mb-4">
          <strong>國立臺北教育大學 ─ 烤雞盃排球賽</strong>
          <br />
          由國北教大學生自主發起之排球比賽，自97學年度(2009年)始由文產系發起首屆之女子排球比賽，隔年98學年度(2010年)起改為男女混排賽，而後100學年度(2012年)復辦並擴大舉辦(開放校友資格)。
        </p>
        <p className="mb-4">
          歷屆舉辦單位皆由該上屆冠軍隊伍之學系承辦，希望帶起國立臺北教育大學排球運動風氣，並促進畢業校友以及在校生之情誼！
        </p>

        <h3 className="text-xl font-bold text-gray-800 mb-3 mt-6">歷史沿革</h3>

        <div className="space-y-3 text-base">
          {HISTORY.map((h) => (
            <div key={h.period} className={`p-3 rounded-lg ${TONE_CLS[h.tone]}`}>
              <p>
                <strong>{h.period}</strong>
                <br />
                {h.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
