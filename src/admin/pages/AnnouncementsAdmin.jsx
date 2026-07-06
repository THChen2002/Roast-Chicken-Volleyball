import { useEffect, useState } from 'react';
import {
  subscribeAnnouncementsAdmin,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../../services/firestore';
import { PageHeader, ErrorBar, Field, inputCls, btnPrimary, btnDanger } from '../components/ui';

// 常見公告類型（可自由輸入，這裡只給快速選項）
const TYPE_OPTIONS = ['一般', '重要', '賽程', '結果'];

// 日期儲存格式為 YYYY/MM/DD（前台直接顯示），與 <input type="date"> 的 YYYY-MM-DD 互轉
const toInputDate = (s) => (s || '').replaceAll('/', '-');
const fromInputDate = (s) => (s || '').replaceAll('-', '/');

/** 今天日期字串（YYYY/MM/DD），供新增公告預設值 */
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

// 單筆公告編輯卡
function AnnouncementEditor({ item }) {
  const [form, setForm] = useState({
    date: item.date ?? '',
    type: item.type ?? '一般',
    title: item.title ?? '',
    content: item.content ?? '',
  });
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setStatus('');
    try {
      await updateAnnouncement(item.id, {
        date: form.date.trim(),
        type: form.type.trim(),
        title: form.title.trim(),
        content: form.content,
      });
      setStatus('✓ 已儲存');
    } catch (err) {
      setStatus(`✗ ${err.message || '儲存失敗'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`確定刪除公告「${form.title || item.id}」？`)) return;
    try {
      await deleteAnnouncement(item.id);
    } catch (err) {
      setStatus(`✗ ${err.message || '刪除失敗'}`);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-navy-100 p-5">
      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="日期 (date)">
          <input
            type="date"
            className={inputCls}
            value={toInputDate(form.date)}
            onChange={(e) => setField('date', fromInputDate(e.target.value))}
          />
        </Field>
        <Field label="類型 (type)">
          <input className={inputCls} list="announcement-types" value={form.type} onChange={(e) => setField('type', e.target.value)} />
        </Field>
        <Field label="標題 (title)" className="sm:col-span-2">
          <input className={inputCls} value={form.title} onChange={(e) => setField('title', e.target.value)} />
        </Field>
      </div>

      <Field label="內容 (content)" className="mt-3">
        <textarea
          rows={3}
          className={inputCls}
          value={form.content}
          onChange={(e) => setField('content', e.target.value)}
        />
      </Field>

      <datalist id="announcement-types">
        {TYPE_OPTIONS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <div className="flex items-center gap-3 mt-5">
        <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving ? '儲存中…' : '儲存'}
        </button>
        <button type="button" onClick={handleDelete} className={`${btnDanger} ml-auto`}>
          刪除
        </button>
        {status && <span className="text-sm text-slate-500">{status}</span>}
      </div>
    </div>
  );
}

// ============================================================
// AnnouncementsAdmin — 公告管理頁（announcements 集合）
// ============================================================
export default function AnnouncementsAdmin() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = subscribeAnnouncementsAdmin(setItems, (err) => setError(err.message));
    return unsub;
  }, []);

  // 新公告固定用今天日期，依日期新到舊排序時自然排最前
  const handleCreate = async () => {
    setError('');
    try {
      await createAnnouncement({
        date: todayStr(),
        type: '一般',
        title: '新公告',
        content: '',
      });
    } catch (err) {
      setError(err.message || '新增失敗');
    }
  };

  return (
    <>
      <PageHeader
        title="公告管理"
        desc={`共 ${items.length} 則`}
        action={
          <button type="button" onClick={handleCreate} className={btnPrimary}>
            ＋ 新增公告
          </button>
        }
      />
      <ErrorBar message={error} />

      <div className="flex flex-col gap-5">
        {items.length === 0 ? (
          <p className="text-slate-400 text-sm">目前沒有任何公告，請點「新增公告」。</p>
        ) : (
          items.map((a) => <AnnouncementEditor key={a.id} item={a} />)
        )}
      </div>
    </>
  );
}
