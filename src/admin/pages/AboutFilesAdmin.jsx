import { useEffect, useState } from 'react';
import { subscribeAboutFiles, saveAboutFiles } from '../../services/firestore';
import { PageHeader, ErrorBar, Card, Field, inputCls, btnPrimary, btnDanger } from '../components/ui';

// 檔案類型：標籤文字與顏色固定配對（與前台 AboutFiles.jsx 的 TAG_COLOR_MAP 對應）
const FILE_TYPES = [
  { tag: 'PDF', color: 'red', label: 'PDF（紅）' },
  { tag: 'DOCX', color: 'blue', label: 'DOCX（藍）' },
  { tag: 'XLSX', color: 'green', label: 'XLSX（綠）' },
  { tag: 'PPT', color: 'orange', label: 'PPT（橘）' },
];

const EMPTY_FILE = { title: '', desc: '', tag: 'PDF', color: 'red', href: '' };

// ============================================================
// AboutFilesAdmin — 相關檔案管理頁（config/aboutFiles 單一文件）
// 對應「關於比賽」頁籤「相關檔案」的下載卡片清單；整份陣列覆寫儲存。
// ============================================================
export default function AboutFilesAdmin() {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAboutFiles(
      (data) => {
        setFiles(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const setAt = (i, patch) => setFiles((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const add = () => setFiles((fs) => [...fs, { ...EMPTY_FILE }]);
  const removeAt = (i) => setFiles((fs) => fs.filter((_, j) => j !== i));

  const handleSave = async () => {
    setSaving(true);
    setStatus('');
    try {
      const cleaned = files
        .map((f) => ({
          title: (f.title || '').trim(),
          desc: (f.desc || '').trim(),
          tag: (f.tag || '').trim(),
          color: f.color || 'gray',
          href: (f.href || '').trim(),
        }))
        .filter((f) => f.title || f.href);
      await saveAboutFiles(cleaned);
      setFiles(cleaned);
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
        <PageHeader title="相關檔案" />
        <p className="text-slate-400 text-sm animate-pulse">載入中…</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="相關檔案"
        desc={`「關於比賽」頁籤的下載卡片，共 ${files.length} 筆`}
        action={
          <button type="button" onClick={add} className={btnPrimary}>
            ＋ 新增檔案
          </button>
        }
      />
      <ErrorBar message={error} />

      <div className="flex flex-col gap-5">
        {files.length === 0 ? (
          <p className="text-slate-400 text-sm">目前沒有任何檔案，請點「新增檔案」。</p>
        ) : (
          files.map((f, i) => (
            <Card key={i} className="flex flex-col gap-3">
              <div className="grid sm:grid-cols-4 gap-3">
                <Field label="標題 (title)">
                  <input className={inputCls} value={f.title} onChange={(e) => setAt(i, { title: e.target.value })} />
                </Field>
                <Field label="說明 (desc)" className="sm:col-span-2">
                  <input className={inputCls} value={f.desc} onChange={(e) => setAt(i, { desc: e.target.value })} />
                </Field>
                <Field label="檔案類型">
                  <select
                    className={inputCls}
                    value={f.tag}
                    onChange={(e) => {
                      const type = FILE_TYPES.find((t) => t.tag === e.target.value);
                      if (type) setAt(i, { tag: type.tag, color: type.color });
                    }}
                  >
                    {FILE_TYPES.map((t) => (
                      <option key={t.tag} value={t.tag}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="下載連結 (href)">
                <input className={inputCls} value={f.href} onChange={(e) => setAt(i, { href: e.target.value })} placeholder="https://..." />
              </Field>

              <div className="flex justify-end">
                <button type="button" onClick={() => removeAt(i)} className={btnDanger}>
                  刪除此檔案
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving ? '儲存中…' : '儲存'}
        </button>
        {status && <span className="text-sm text-slate-500">{status}</span>}
      </div>
    </>
  );
}
