import { useEffect, useRef, useState } from 'react';
import { subscribeMarquee, saveMarquee } from '../../services/firestore';
import { PageHeader, ErrorBar, Card, Field, inputCls, btnPrimary } from '../components/ui';

// ============================================================
// MarqueeAdmin — 跑馬燈設定頁（config/marquee 單一文件）
// 即時讀取目前設定，提供文字與顯示開關的儲存。
// ============================================================
export default function MarqueeAdmin() {
  const [form, setForm] = useState({ text: '', visible: false });
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false); // 僅以第一筆遠端資料初始化，避免覆寫使用者編輯

  // 即時訂閱目前設定
  useEffect(() => {
    const unsub = subscribeMarquee(
      (data) => {
        if (initialized.current) return;
        initialized.current = true;
        setForm({ text: data.text || '', visible: !!data.visible });
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
      await saveMarquee({ text: form.text, visible: form.visible });
      setStatus('✓ 已儲存');
    } catch (err) {
      setStatus(`✗ ${err.message || '儲存失敗'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="跑馬燈" desc="首頁跑馬燈文字與顯示開關" />
      <ErrorBar message={error} />

      <Card className="flex flex-col gap-4">
        <Field label="跑馬燈文字 (text)">
          <textarea
            rows={3}
            className={inputCls}
            value={form.text}
            onChange={(e) => setField('text', e.target.value)}
            placeholder="例：歡迎蒞臨 2026 國北烤雞盃！"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="w-4 h-4 accent-vbyellow-500"
            checked={form.visible}
            onChange={(e) => setField('visible', e.target.checked)}
          />
          在前台顯示跑馬燈
        </label>

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
