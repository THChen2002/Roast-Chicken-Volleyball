import { useEffect, useRef, useState } from 'react';
import { subscribeRegistration, saveRegistration } from '../../services/firestore';
import { PageHeader, ErrorBar, Card, Field, inputCls, btnPrimary } from '../components/ui';

// ============================================================
// RegistrationAdmin — 報名設定頁（config/registration 單一文件）
// 控制首頁 Hero 顯示的比賽日期，以及「立即報名」按鈕的連結與開放狀態；
// 報名截止日期僅供前台顯示，不會自動關閉報名（是否開放完全由「開放報名」勾選框決定）。
// ============================================================
export default function RegistrationAdmin() {
  const [form, setForm] = useState({ eventDate: '', url: '', isOpen: false, deadline: '' });
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false); // 僅以第一筆遠端資料初始化，避免覆寫使用者編輯

  useEffect(() => {
    const unsub = subscribeRegistration(
      (data) => {
        if (initialized.current) return;
        initialized.current = true;
        setForm({
          eventDate: data.eventDate || '',
          url: data.url || '',
          isOpen: !!data.isOpen,
          deadline: data.deadline || '',
        });
      },
      (err) => setError(err.message),
    );
    return unsub;
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setStatus('');
    try {
      await saveRegistration({
        eventDate: form.eventDate.trim(),
        url: form.url.trim(),
        isOpen: form.isOpen,
        deadline: form.deadline,
      });
      setStatus('✓ 已儲存');
    } catch (err) {
      setStatus(`✗ ${err.message || '儲存失敗'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="報名設定" desc="首頁 Hero 的比賽日期，以及「立即報名」按鈕的連結與開放狀態" />
      <ErrorBar message={error} />

      <Card className="flex flex-col gap-4">
        <Field label="比賽日期（首頁顯示，如：2026/08/01 - 08/02）">
          <input
            className={`${inputCls} w-64`}
            value={form.eventDate}
            onChange={(e) => setField('eventDate', e.target.value)}
            placeholder="例：2026/08/01 - 08/02"
          />
        </Field>

        <Field label="報名表單連結 (url)">
          <input
            type="url"
            className={inputCls}
            value={form.url}
            onChange={(e) => setField('url', e.target.value)}
            placeholder="例：https://forms.gle/xxxxxxxx"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="w-4 h-4 accent-vbyellow-500"
            checked={form.isOpen}
            onChange={(e) => setField('isOpen', e.target.checked)}
          />
          開放報名（關閉時首頁按鈕會變成灰色不可點擊）
        </label>

        <Field label="報名截止日期（僅供前台顯示，不會自動關閉報名）">
          <input
            type="date"
            className={`${inputCls} w-48`}
            value={form.deadline}
            onChange={(e) => setField('deadline', e.target.value)}
          />
        </Field>

        <div className="flex items-center gap-3">
          <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
            {saving ? '儲存中…' : '儲存'}
          </button>
          {status && <span className="text-sm text-slate-500">{status}</span>}
        </div>
      </Card>
    </>
  );
}
