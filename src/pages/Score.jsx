import { useEffect, useRef, useState } from 'react';
import { subscribeLiveMatches, voteForTeam } from '../services/firestore';
import { readVoteCookies, setVoteCookie, clearVoteCookie } from '../lib/voteCookie';
import LoadingOverlay from '../components/LoadingOverlay';

// ============================================================
// Score — 即時比分頁（純 React；樣式沿用 styles/score.css）
// 三場地看板：Firestore onSnapshot 即時更新；人氣投票寫入 Firestore。
// 已投票紀錄以 cookie 記錄（依 matchNo，一場一個）：可改票；場次結束即清除，
// 換場後可重新投票（詳見 lib/voteCookie.js）。
// ============================================================

const HeartIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const InfoIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
  </svg>
);

/** 目前這一局的比分數字：得分增加時播翻牌動畫（score-flip / score-highlight） */
function ScoreCircle({ value, team }) {
  const [display, setDisplay] = useState(value);
  const [anim, setAnim] = useState('');
  const prevRef = useRef(value);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    if (value === prev) return undefined;
    // 僅在比賽中且分數增加時播動畫；開賽／結束的切換直接更新
    if (!(Number.isFinite(prev) && Number.isFinite(value) && value > prev)) {
      setDisplay(value);
      setAnim('');
      return undefined;
    }
    setAnim('score-flip');
    const tFlip = setTimeout(() => {
      setDisplay(value);
      setAnim('score-flip score-highlight');
    }, 400);
    const tEnd = setTimeout(() => setAnim(''), 1500);
    return () => {
      clearTimeout(tFlip);
      clearTimeout(tEnd);
      setDisplay(value);
    };
  }, [value]);

  return (
    <div className={`score-circle team${team + 1} font-display ${anim}`}>{display}</div>
  );
}

/** 單一局比分格：依勝方標色 */
function SetScore({ score }) {
  let cls = 'no-result';
  if (score) {
    const [a, b] = score.split(':').map(Number);
    cls = a > b ? 'team1-win' : b > a ? 'team2-win' : 'no-result';
  }
  return <div className={`set-score ${cls}`}>{score || '-'}</div>;
}

/** 單場地看板卡片（比賽中／未開始兩態，未開始樣式由 .no-match 控制） */
function MatchCard({ match, votedTeam, onVote }) {
  const isLive = !!match.matchNo && match.status === 'live';
  const sets = Array.isArray(match.setScores) ? match.setScores : [];
  const [curA, curB] = ((isLive && sets[sets.length - 1]) || '0:0').split(':').map(Number);
  const votes = Array.isArray(match.votes) ? match.votes : [0, 0];
  const v1 = votes[0] || 0;
  const v2 = votes[1] || 0;
  const total = v1 + v2;
  // 尚無票時兩側皆為 0%（不再預設 50/50），有票後才依比例分配
  const p1 = total === 0 ? 0 : Math.round((v1 / total) * 100);
  const p2 = total === 0 ? 0 : 100 - p1;
  const hasVoted = votedTeam !== undefined;

  // 投票後即鎖定：不可改投，僅以 user-voted 高亮已選擇的隊伍。
  const voteButton = (team) => (
    <button
      type="button"
      className={`vote-heart vote-team${team + 1} ${hasVoted ? 'voted' : ''} ${votedTeam === team ? 'user-voted' : ''}`}
      disabled={hasVoted}
      onClick={() => onVote(match, team)}
    >
      <HeartIcon className="heart-icon" />
    </button>
  );

  return (
    <div className={`match-card ${isLive ? '' : 'no-match'}`}>
      {/* 記分板頂欄：轉播狀態 + 場地 + 局數/場次 */}
      <div className="card-topbar">
        <span className="status-badge live-badge">
          <span className="live-dot"></span>比賽中
        </span>
        <span className="status-badge offair-badge">未開始</span>
        <div className="field-title font-display tracking-wide">{match.field}場地</div>
        <div className="topbar-meta">
          {isLive && <span className="match-label set-label">第{match.set}局</span>}
          {isLive && <span className="match-label match-number-label">場次：{match.matchNo}</span>}
        </div>
      </div>

      <div className="match-content">
        <div className="team-container team-side team-side1">
          <div className="team-name">{isLive ? match.teams?.[0] || '?' : '--'}</div>
          <ScoreCircle value={isLive ? curA : '-'} team={0} />
        </div>
        <div className="center-score">
          <div className="vs-badge">VS</div>
          <div className="game-score font-display">{isLive ? match.gameScore || '0:0' : '--'}</div>
          <div className="sets-title">各局比分</div>
          <div className="sets-container">
            {[0, 1, 2].map((i) => (
              <SetScore key={i} score={isLive ? sets[i] : ''} />
            ))}
          </div>
        </div>
        <div className="team-container team-side team-side2">
          <div className="team-name">{isLive ? match.teams?.[1] || '?' : '--'}</div>
          <ScoreCircle value={isLive ? curB : '-'} team={1} />
        </div>
      </div>

      {/* 人氣投票區域 */}
      <div className="voting-section">
        <div className="voting-title">
          <HeartIcon className="voting-icon" />
          人氣投票
          {isLive && hasVoted && <span className="voted-indicator">（已投票）</span>}
        </div>
        <div className="voting-options">
          {isLive ? (
            <>
              {voteButton(0)}
              <div className="vote-progress-container">
                <div className="vote-percentages">
                  <span className="percentage-left">{p1}%</span>
                  <span className="percentage-right">{p2}%</span>
                </div>
                <div className="vote-progress">
                  <div className="vote-bar team1-bar" style={{ width: `${p1}%` }}></div>
                  <div className="vote-bar team2-bar" style={{ width: `${p2}%` }}></div>
                </div>
              </div>
              {voteButton(1)}
            </>
          ) : (
            <div className="vote-progress-container">
              <div className="no-match-message">
                <InfoIcon className="info-icon" />
                <span>比賽尚未開始</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Score() {
  const [matches, setMatches] = useState(null); // null = 載入中
  const [loadError, setLoadError] = useState(false);
  // 已投票紀錄：{ matchNo: teamIndex }，來源為 cookie（依 matchNo）
  const [userVotes, setUserVotes] = useState(() => readVoteCookies());
  const [toast, setToast] = useState(null); // { text, type }
  const toastTimer = useRef(null);

  useEffect(() => {
    const unsub = subscribeLiveMatches(
      (data) => setMatches(data),
      (err) => {
        console.error('Error fetching data:', err);
        setLoadError(true);
        setMatches([]);
      },
    );
    return () => {
      unsub();
      clearTimeout(toastTimer.current);
    };
  }, []);

  // 清理過期投票紀錄：僅保留「目前仍在進行中」場次的投票 cookie。
  // 場次結束或換場後（matchNo 不再 live），刪除該場 cookie 並移出狀態，
  // 讓使用者在下一場能重新投票（cookie 不殘留）。
  useEffect(() => {
    if (!matches) return;
    const activeMatchNos = new Set(
      matches.filter((m) => m.matchNo && m.status === 'live').map((m) => String(m.matchNo)),
    );
    setUserVotes((prev) => {
      const stale = Object.keys(prev).filter((matchNo) => !activeMatchNos.has(matchNo));
      if (stale.length === 0) return prev; // 無變動
      stale.forEach((matchNo) => clearVoteCookie(matchNo)); // 移除已結束場次的投票 cookie
      const next = { ...prev };
      stale.forEach((matchNo) => delete next[matchNo]);
      return next;
    });
  }, [matches]);

  // 提示訊息（3 秒自動消失）
  const showToast = (text, type) => {
    clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const handleVote = async (match, teamIndex) => {
    const matchNo = String(match.matchNo);
    if (userVotes[matchNo] !== undefined) {
      // 投票後即鎖定，同一場不可再投／改投
      showToast('您已經為此場比賽投過票了！', 'warning');
      return;
    }
    // 先樂觀更新本機（cookie 依 matchNo 記錄，每場限一次），再寫入 Firestore；快照回傳後票數自動更新
    const next = { ...userVotes, [matchNo]: teamIndex };
    setUserVotes(next);
    setVoteCookie(matchNo, teamIndex);
    showToast(`投票成功！您支持：${match.teams?.[teamIndex] || ''}`, 'success');
    try {
      await voteForTeam(match.field, teamIndex);
    } catch (err) {
      console.error('投票失敗:', err);
    }
  };

  return (
    <>
      {matches === null && <LoadingOverlay />}
      <main className="page-main">
        {/* 即時更新提示框：轉播列 */}
        <div className="container mx-auto">
          <div className={`live-update-banner ${matches ? 'fade-in-down' : ''}`}>
            <div className="live-indicator"></div>
            <span className="live-text">賽事即時更新中</span>
          </div>
        </div>

        <div className="container mx-auto p-2 md:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadError ? (
            <div className="error-state">
              <div className="error-title">載入失敗</div>
              <div className="error-message">請檢查網路連線或稍後再試</div>
            </div>
          ) : (
            (matches || []).map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                votedTeam={userVotes[String(m.matchNo)]}
                onVote={handleVote}
              />
            ))
          )}
        </div>
      </main>

      {/* 投票提示訊息 */}
      {toast && (
        <div className={`vote-message vote-message-${toast.type} show`}>
          <div className="vote-message-content">
            <span className="vote-message-text">{toast.text}</span>
            <button type="button" className="vote-message-close" onClick={() => setToast(null)}>
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
