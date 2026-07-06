import { useEffect, useState } from 'react';
import { fetchTeams } from '../services/firestore';
import LoadingOverlay from '../components/LoadingOverlay';

function MemberItem({ member }) {
  const isMale = member.gender === 'M';
  const genderClass = isMale ? 'member-male' : 'member-female';
  const statusClass = member.status === '在校' ? 'status-studying' : 'status-working';
  return (
    <div className={`member-item ${genderClass}`}>
      <span className="member-number">
        {/* 沒有背號時以性別圖示替代，避免出現空白圓圈 */}
        {member.number || (
          <i className={isMale ? 'fas fa-mars' : 'fas fa-venus'} aria-hidden="true" />
        )}
      </span>
      <span className="member-name">{member.name}</span>
      <span className={`member-status ${statusClass}`}>{member.status}</span>
    </div>
  );
}

function TeamCard({ team }) {
  const captain = team.members?.[0]?.name || '';
  return (
    <div className="team-card">
      <div className="team-header">
        <h2 className="team-name">{team.team}</h2>
        <span className="department-tag department-tag-orange">{team.department}</span>
      </div>
      <div className="captain-info">
        <span className="captain-label">隊長:</span>
        <span className="captain-name">{captain}</span>
      </div>
      <div className="members-grid">
        {(team.members || []).map((m, i) => (
          <MemberItem key={i} member={m} />
        ))}
      </div>
    </div>
  );
}

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchTeams();
        if (active) setTeams(data);
      } catch (err) {
        console.error('獲取隊伍資料失敗:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {loading && <LoadingOverlay />}
      <main className="page-main">
        {/* 外層卡片：白底 + navy 細邊框 + 輕陰影（Court Night 規格） */}
        <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-6 max-w-6xl mx-auto">
          <div className="flex items-center mb-6">
            {/* icon：排球黃淺底圓形 + navy 本體 */}
            <div className="bg-vbyellow-100 rounded-full p-3 mr-4">
              <svg className="w-8 h-8 text-navy-600" fill="currentColor" viewBox="0 0 297 297">
                <path d="M62.691,173.816c8.795,19.75,24.211,35.883,43.415,45.644v8.03c0,0-59.418,16.422-78.758,23.324c-14.835,5.294-23.906,20.22-23.906,35.971c0,5.641,4.574,10.215,10.215,10.215s10.215-4.574,10.215-10.215c0-7.503,4.47-14.229,11.388-17.135l6.489-2.725v18.631c0,5.641,4.574,10.215,10.215,10.215s10.215-4.574,10.215-10.215V259.53l19.149-4.787l62.603,31.301c1.438,0.719,3.003,1.078,4.568,1.078s3.13-0.359,4.568-1.078l62.603-31.301l19.149,4.787v26.025c0,5.641,4.574,10.215,10.215,10.215s10.215-4.574,10.215-10.215v-18.631l6.488,2.725c6.918,2.906,11.389,9.632,11.389,17.135c0,5.641,4.574,10.215,10.215,10.215s10.215-4.574,10.215-10.215c0-15.751-9.072-30.677-23.907-35.971c-19.34-6.902-78.757-23.324-78.757-23.324v-8.03c19.204-9.761,34.621-25.894,43.415-45.644c21.459,0,38.916-24.118,38.916-44.865c0-14.621-7.312-25.049-21.55-29.266V55.368c0-5.641-4.574-10.215-10.215-10.215h-10.1C216.403,18.255,187.715,0,154.816,0h-12.632C109.285,0,80.597,18.255,65.64,45.152h-10.1c-5.641,0-10.215,4.574-10.215,10.215v44.317c-14.238,4.216-21.55,14.644-21.55,29.266C23.774,149.698,41.231,173.816,62.691,173.816z M65.755,84.992V65.583h165.49v19.409H65.755z M241.056,151.434c0.866-5.114,1.324-10.365,1.324-15.722v-17.103c10.409,1.868,10.415,7.84,10.415,10.342C252.795,137.031,247.563,147.231,241.056,151.434z M142.184,20.431h12.632c20.942,0,39.665,9.647,51.985,24.721H90.199C102.519,30.077,121.242,20.431,142.184,20.431z M44.205,128.951c0-2.502,0.006-8.474,10.415-10.342v17.103c0,5.357,0.458,10.608,1.324,15.722C49.437,147.231,44.205,137.031,44.205,128.951z M75.051,135.712v-30.289h146.898v30.289c0,40.5-32.949,73.448-73.449,73.448S75.051,176.212,75.051,135.712z M148.5,265.486l-36.715-18.357l7.014-1.754c4.547-1.136,7.737-5.222,7.737-9.91v-8.475c7.049,1.696,14.402,2.601,21.963,2.601s14.915-0.905,21.963-2.601v8.475c0,4.688,3.19,8.774,7.737,9.91l7.014,1.754L148.5,265.486z" />
              </svg>
            </div>
            {/* 主標題：運動字體 + navy，下方黃色短底線點綴 */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-wide text-navy-800">參賽名單</h2>
              <div className="h-1 w-12 bg-vbyellow-400 rounded-full mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {!loading && teams.length === 0 ? (
              <div className="empty-state col-span-full">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">暫無隊伍資料</h3>
                <p>目前沒有可顯示的隊伍資訊</p>
              </div>
            ) : (
              teams.map((team, i) => <TeamCard key={i} team={team} />)
            )}
          </div>
        </div>
      </main>
    </>
  );
}
