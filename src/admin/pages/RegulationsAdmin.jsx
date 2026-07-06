import { useEffect, useState } from 'react';
import { fetchRegulations, saveRegulations } from '../../services/firestore';
import { PageHeader, ErrorBar, Card, inputCls, btnPrimary } from '../components/ui';

// ============================================================
// RegulationsAdmin — 競賽章程管理頁（config/regulations）
// 後台以「整篇」文字編輯；儲存時解析成結構化 { articles: [{ title, content }] }，
// 讓前台「關於比賽」維持逐條套版樣式（存檔當下只解析一次）。
// ============================================================

// 逐條 → 整篇：以「空行」分隔各條，每條首行為標題、其餘為內容。
function articlesToText(articles) {
  return articles
    .map((a) => [a.title, a.content].filter((s) => s && s.trim()).join('\n'))
    .filter((block) => block.trim())
    .join('\n\n');
}

// 整篇 → 逐條：空行切塊，塊內首行為標題、其餘為內容。
function textToArticles(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((block) => {
      const lines = block.split('\n');
      const title = (lines.shift() || '').trim();
      const content = lines.join('\n').trim();
      return { title, content };
    })
    .filter((a) => a.title || a.content);
}

export default function RegulationsAdmin() {
  const [bulkText, setBulkText] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 初次載入（章程非即時，採一次讀取）；把結構化資料轉成整篇文字供編輯
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { articles } = await fetchRegulations();
        if (active) setBulkText(articlesToText(articles.map((a) => ({ title: a.title || '', content: a.content || '' }))));
      } catch (err) {
        if (active) setError(err.message || '載入失敗');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus('');
    try {
      // 整篇 → 逐條，並清掉完全空白的條文後整份覆寫
      const cleaned = textToArticles(bulkText)
        .map((a) => ({ title: a.title.trim(), content: a.content }))
        .filter((a) => a.title || a.content.trim());
      await saveRegulations(cleaned);
      // 以清理後的結果回填，讓格式正規化（統一空行間距）
      setBulkText(articlesToText(cleaned));
      setStatus('✓ 已儲存');
    } catch (err) {
      setStatus(`✗ ${err.message || '儲存失敗'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="競賽章程" />
        <p className="text-slate-400 text-sm animate-pulse">載入中…</p>
      </>
    );
  }

  // 目前條數（即時解析計算）
  const count = textToArticles(bulkText).length;

  return (
    <>
      <PageHeader title="競賽章程" desc={`共 ${count} 條`} />
      <ErrorBar message={error} />

      <Card className="flex flex-col gap-3">
        <div className="text-xs text-slate-500 bg-navy-50 border border-navy-100 rounded-lg px-3 py-2 leading-relaxed">
          <i className="fa-solid fa-circle-info text-navy-400 mr-1" aria-hidden="true"></i>
          格式：每條之間<span className="font-semibold text-slate-600">空一行</span>分隔；每條的<span className="font-semibold text-slate-600">第一行為標題</span>，其餘為內容（可多行）。例如：
          <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-slate-500">{'一、主旨\n推廣與提升排球運動之風氣…\n\n二、主辦單位\n國立臺北教育大學體育系。'}</pre>
        </div>
        <textarea
          rows={26}
          className={`${inputCls} font-mono leading-relaxed`}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={'一、主旨\n…\n\n二、主辦單位\n…'}
        />
      </Card>

      {/* 章程整份覆寫，提供單一儲存鍵 */}
      <div className="flex items-center gap-3 mt-4">
        <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving ? '儲存中…' : '儲存'}
        </button>
        {status && <span className="text-sm text-slate-600">{status}</span>}
      </div>
    </>
  );
}
