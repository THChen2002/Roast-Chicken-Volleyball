// ============================================================
// Firestore 範例資料 seed 腳本（使用 firebase-admin）
//
// ⚠️ 依需求：此腳本「只建立、不自動執行」。要灌資料時自行執行：
//     node scripts/seed.mjs
//
// 需要 service account 金鑰（含私鑰，請勿進版控；已被 .gitignore 擋下）。
// 兩種提供方式擇一：
//   1. 設環境變數：GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/seed.mjs
//   2. 把金鑰檔放到專案根目錄並命名為 service-account.json（預設 fallback）
// 注意：金鑰所屬的 Firebase 專案需與 src/firebase.js 的 projectId 一致。
//
// 只寫入 config（跑馬燈／章程／報名設定／相關檔案）與 announcements（公告）。
// teams / results / roundResults / liveMatches 僅清空，不建立範例資料
// （隊伍改由後台「參賽名單」新增，再到「預賽分組」拖曳位置）。
// ============================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY_PATH =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  resolve(__dirname, '../service-account.json');

const serviceAccount = JSON.parse(readFileSync(KEY_PATH, 'utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function clearCollection(name) {
  const snap = await db.collection(name).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function seed() {
  console.log('開始寫入範例資料…');

  // --- config/marquee ---
  await db.collection('config').doc('marquee').set({
    text: '🏐 2026 第十三屆國北烤雞盃混合排球賽 8/1～8/2 熱血開打！報名至 6/28 止，歡迎以系為單位組隊參加！',
    visible: true,
  });

  // --- config/regulations（競賽章程，供「關於比賽」頁籤讀取）---
  // 內容依「2026 第十三屆國北烤雞盃混合排球比賽 競賽規章」逐條還原。
  await db.collection('config').doc('regulations').set({
    articles: [
      {
        title: '一、主旨',
        content:
          '推廣與提升國北教大排球運動之風氣，提高排球技術水準及增進在校生與校友之間的交流。',
      },
      {
        title: '二、主辦單位',
        content: '國立臺北教育大學體育系。',
      },
      {
        title: '三、比賽時間',
        content: '115 年 08 月 01 日（星期六）至 08 月 02 日（星期日）。',
      },
      {
        title: '四、比賽地點',
        content: '國立臺北教育大學體育館三樓。',
      },
      {
        title: '五、參加對象與資格',
        content:
          '1. 凡對排球有興趣之國北在校生以及畢業校友，皆可以系為單位自由組隊報名參加（以畢業系、所擇一報名，雙主修以原系所為主）。\n' +
          '2. 各系出賽隊伍不限，每位選手限報名一隊，每隊人數上限為 12 人（含自由球員）。\n' +
          '3. 曾為甲組球員（公開一二級、企業聯賽、國家代表隊）或以排球體育專長入學者不得報名，違者取消該隊參賽資格。\n' +
          '4. 若有資格疑慮者可另外詢問，依主辦單位判定為準。\n' +
          '5. 謝絕校外人士參加。',
      },
      {
        title: '六、比賽制度',
        content:
          '1. 六人制混排，網高 224 公分，場上至少四名女性球員（生理女）。\n' +
          '2. 本次賽事預計收 24 隊，賽程將於抽籤時公佈，若報名隊伍數不足 18 隊則取消本次比賽。\n' +
          '3. 均採三局二勝落地得分制，前兩局搶 25 分（無 Duece），第三局有 Duece 無上限；複、決賽每局 Duece 皆無上限（視參賽隊伍及時間做調整）。\n' +
          '4. 賽制依參賽隊數決定比賽階段數，採雙敗淘汰，預賽小組前二名進入勝者組，後二名進入敗者組。大會保留更改賽制之權利。\n' +
          '5. 初賽採循環賽制，每組循環取前兩名進入勝部，排名依以下順序判定之：\n' +
          '　(1) 勝場數較多者排名優先。\n' +
          '　(2) 若勝場數相同，則依雙方對戰結果勝者排名優先。\n' +
          '　(3) 若上述條件仍相同，則依總失局數較少者排名優先。\n' +
          '　(4) 若仍無法區分，則依總得失分比（得分 ÷ 失分）較高者排名優先。\n' +
          '　(5) 若以上條件皆無法區分，將依賽會決議進行抽籤或其他判定方式。\n' +
          '6. 複賽採雙敗淘汰制。循環賽晉級者為勝部、淘汰者為敗部，勝部對戰輸球則掉進敗部，敗部對戰輸球則淘汰。（詳細賽制將視參加隊伍數量訂定之，將另行公布）',
      },
      {
        title: '七、比賽規則',
        content:
          '1. 以 2021-2024 國際排球規則為準，若比賽進行中遇到爭議問題，以該場裁判判決為準。\n' +
          '2. 男生不可對女生的任何處理球進行封網，且在前排不得高過於網帶將球往下攻擊或是吊球（由第一裁判判定），唯獨對方男生送過網之球不在此限。\n' +
          '3. 隊伍球員在三次擊球中，必須至少要有一次為女性擊球，否則視為無效擊球過網，判對方得一分。\n' +
          '4. 不實施技術暫停，每隊每局有兩次暫停，每次 30 秒。\n' +
          '5. 既定比賽開始時間前三十分鐘請至該會場檢錄。\n' +
          '6. 若參賽隊伍於比賽開始後十分鐘未到，則直接判定對方以局數 2:0、比分皆為 25:0 獲勝。',
      },
      {
        title: '八、獎勵辦法',
        content:
          '凡參賽之隊伍均可獲得數隻烤雞（腿）作為參加獎，冠、亞、季軍隊伍可再額外獲得烤雞（腿）或等值獎品。',
      },
      {
        title: '九、報名費用',
        content:
          '每隊新台幣 5000 元整（包含三樓及四樓場地、空調費、工作費、保險費、裁判費、烤雞及獎盃（品）相關支出）。',
      },
      {
        title: '十、報名日期',
        content: '即日起至 115 年 06 月 28 日 23 時 59 分截止。',
      },
      {
        title: '十一、報名方式',
        content:
          '透過 Google 表單報名填寫報名資料並完成匯款，同時請告知 LINE 官方帳號，經主辦確認後報名成功，若超過隊伍數量上限，則依匯款先後順序錄取，未報名成功者會處理退款手續。',
      },
      {
        title: '十二、賽程公告及賽程抽籤',
        content:
          '報名結束後公布隊伍數與賽程，並擇日由大會進行賽程抽籤，並將過程錄影確保公正公開。',
      },
      {
        title: '十三、注意事項',
        content:
          '1. 比賽隊伍於既定比賽時間超過 5 分鐘未到齊者，比賽視為棄權。\n' +
          '2. 同隊球員球衣需同色系，且與其他球員不重複的號碼。\n' +
          '3. 比賽出席當日請記得攜帶學生證／身分證明（身分證、健保卡、駕照等有照片之證件）以示身分，如發現身份不符或槍手隊伍即取消該場比賽及所有比賽成績。\n' +
          '4. 請參賽各隊於比賽時各出一名紀錄，並配合大會裁判組安排裁判工作。\n' +
          '5. 體育館三樓請勿飲食（可喝水）、若有需求請至四樓看台。\n' +
          '6. 有任何疑問請私訊 LINE 官方帳號，或傳送電子郵件至 ntueroastchicken2026@gmail.com。\n' +
          '7. 本次比賽之冠軍隊伍需辦理下屆比賽。\n' +
          '8. 本規章如有未盡之事宜，主辦單位保有最終變更及解釋之權利。',
      },
    ],
  });

  // --- config/registration（首頁 Hero 比賽日期／「立即報名」按鈕，供後台「報名設定」讀寫）---
  await db.collection('config').doc('registration').set({
    eventDate: '2026/08/01 - 08/02',
    url: 'https://forms.gle/jMyKNJLYVvfnswqKA',
    isOpen: true,
    deadline: '2026-06-28',
  });

  // --- config/aboutFiles（「關於比賽」頁籤「相關檔案」，供後台「相關檔案」讀寫）---
  await db.collection('config').doc('aboutFiles').set({
    files: [
      {
        title: '競賽規章',
        desc: '包含報名資格、隊伍組成、比賽形式等基本規定',
        tag: 'PDF',
        color: 'red',
        href: 'https://drive.google.com/drive/u/0/folders/1eZV43vFEEKzBSwY7ldHkJBK0A1jQTcXY',
      },
      {
        title: '報名表範本',
        desc: '包含隊伍基本資料、球員名單及聯絡資訊',
        tag: 'DOCX',
        color: 'blue',
        href: 'https://docs.google.com/document/d/1rv3R5LZIXriqfJRmYGqblH9HsIFu-7AO/edit?usp=sharing',
      },
      {
        title: '賽程表',
        desc: '詳細的賽程安排及對戰組合',
        tag: 'PDF',
        color: 'red',
        href: 'https://drive.google.com/file/d/17wGTUUCHwTNrV-_IGrKCxbx3DF81gAfj/view?usp=drivesdk',
      },
    ],
  });

  // --- announcements ---
  await clearCollection('announcements');
  const announcements = [
    { type: '重要', title: '報名截止提醒', content: '報名即日起至 115/06/28 23:59 截止，請透過 Google 表單填寫並完成匯款，再告知 LINE 官方帳號確認。每隊報名費新台幣 5000 元整。', date: '2026/06/01' },
    { type: '提醒', title: '參賽資格說明', content: '以系為單位自由組隊，每隊上限 12 人（含自由球員）。曾為甲組球員或以排球專長入學者不得報名。', date: '2026/06/05' },
    { type: '提醒', title: '賽程公告及抽籤', content: '報名結束後公布隊伍數與賽程，並擇日由大會進行賽程抽籤，全程錄影確保公正公開。', date: '2026/06/29' },
    { type: '活動', title: '比賽日程與檢錄', content: '比賽於 8/1（六）至 8/2（日）在國北教大體育館三樓舉行。既定開賽時間前 30 分鐘請至會場檢錄。', date: '2026/07/15' },
  ];
  await Promise.all(
    announcements.map((a, i) =>
      db.collection('announcements').add({ ...a, order: i + 1 }),
    ),
  );

  // --- teams：清空、不建立範例隊（隊伍改由後台「參賽名單」自行新增）---
  await clearCollection('teams');

  // --- 成績／賽程／即時比分：先清空、暫不灌資料 ---
  await clearCollection('roundResults');
  await clearCollection('results');
  await clearCollection('liveMatches');

  console.log('✅ 範例資料寫入完成！（公告／章程／跑馬燈／報名設定／相關檔案；隊伍、賽程、成績皆清空）');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ seed 失敗:', err);
    process.exit(1);
  });
