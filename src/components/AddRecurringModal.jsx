import React, { useState } from 'react';
import { X } from 'lucide-react';
import { resolveTypes, TypeIcon } from '../typeConfig';

const VENDOR_PRESETS = {
  charging:    ['DARA', 'Tesla', 'iCharging', 'EVOASIS', 'U-power', 'TAIL', '星舟快充'],
  maintenance: ['馳加'],
  insurance:   ['富邦'],
  other:       ['頂級連線'],
  tolls:       [],
};

const inputCls =
  'w-full border border-ww-line2 rounded-ww-inner px-3 py-2.5 text-sm text-ww-ink bg-ww-field ' +
  'placeholder:text-ww-faint focus:outline-none focus:border-ww-brand transition-colors';

/** iOS RecurringItem.interval 為必填欄位，需由月數反推，否則 App 端無法解碼 */
const intervalKey = (months) =>
  ({ 1: 'monthly', 3: 'quarterly', 12: 'yearly' }[months] ?? 'custom');

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-ww-sub mb-1.5 block font-medium">{label}</label>
      {children}
    </div>
  );
}

export default function AddRecurringModal({
  onClose, onSave, definedUsers, defaultVehicleId, editItem, definedTypes,
}) {
  const typeOptions = resolveTypes(definedTypes);
  const today = new Date().toISOString().slice(0, 10);
  const isEdit = !!editItem;

  const [form, setForm] = useState(() => isEdit ? {
    type: editItem.type, vendor: editItem.vendor ?? '', cost: String(editItem.cost ?? ''),
    kwh: String(editItem.kwh ?? ''), user: editItem.user,
    intervalMonths: editItem.intervalMonths ||
      ({ monthly: 1, quarterly: 3, yearly: 12 }[editItem.interval] ?? 1),
    dayOfMonth: editItem.dayOfMonth ?? '',
    nextDue: editItem.nextDue,
    note: editItem.note ?? '', vehicleId: editItem.vehicleId ?? defaultVehicleId,
    active: editItem.active,
  } : {
    type: 'other', vendor: '', cost: '', kwh: '',
    user: definedUsers[0] ?? '',
    intervalMonths: 1, dayOfMonth: '', nextDue: today,
    note: '', vehicleId: defaultVehicleId,
    active: true,
  });

  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.cost)    return alert('請輸入費用');
    if (!form.nextDue) return alert('請選擇下次到期日');
    setSaving(true);
    try {
      const months = Number(form.intervalMonths) || 1;
      await onSave({
        type: form.type,
        vendor: form.vendor,
        cost: Number(form.cost),
        kwh: Number(form.kwh) || 0,
        user: form.user,
        vehicleId: form.vehicleId || '',
        note: form.note,
        active: form.active,
        nextDue: form.nextDue,
        interval: intervalKey(months),
        intervalMonths: months,
        ...(form.dayOfMonth ? { dayOfMonth: Number(form.dayOfMonth) } : {}),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-ww-card rounded-t-ww-sheet sm:rounded-ww-lg w-full max-w-md max-h-[92vh]
                      overflow-y-auto shadow-2xl border border-ww-line ww-safe-bottom">
        <div className="p-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-ww-ink">
              {isEdit ? '編輯週期項目' : '新增週期項目'}
            </h2>
            <button
              onClick={onClose}
              className="text-ww-sub hover:text-ww-ink w-8 h-8 flex items-center justify-center
                         rounded-full hover:bg-ww-seg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <Field label="類型">
              <div className="flex flex-wrap gap-2">
                {typeOptions.map(t => (
                  <button
                    key={t.id} type="button" onClick={() => set('type', t.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-ww-inner text-sm transition-colors ${
                      form.type === t.id ? 'bg-ww-brand text-white' : 'bg-ww-seg text-ww-ink2 hover:bg-ww-seg2'
                    }`}
                  >
                    <TypeIcon icon={t.icon} size={14} />
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="廠商 / 名稱">
              <input
                list="rv-vendor-list" value={form.vendor}
                onChange={e => set('vendor', e.target.value)}
                placeholder="輸入或選擇" className={inputCls}
              />
              <datalist id="rv-vendor-list">
                {(VENDOR_PRESETS[form.type] ?? []).map(v => <option key={v} value={v} />)}
              </datalist>
            </Field>

            <Field label="金額（元）">
              <input
                type="number" inputMode="decimal" min="0" value={form.cost}
                onChange={e => set('cost', e.target.value)} placeholder="0" className={inputCls}
              />
            </Field>

            {form.type === 'charging' && (
              <Field label="充電度數（kWh，選填）">
                <input
                  type="number" inputMode="decimal" min="0" step="0.01" value={form.kwh}
                  onChange={e => set('kwh', e.target.value)} placeholder="0" className={inputCls}
                />
              </Field>
            )}

            <Field label="記在誰身上">
              <select value={form.user} onChange={e => set('user', e.target.value)} className={inputCls}>
                {definedUsers.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>

            <Field label="週期">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-ww-sub shrink-0">每</span>
                <input
                  type="number" min="1" max="120" value={form.intervalMonths}
                  onChange={e => set('intervalMonths', Number(e.target.value) || 1)}
                  className={inputCls + ' w-20'}
                />
                <span className="text-sm text-ww-sub shrink-0">個月，每月</span>
                <input
                  type="number" min="1" max="28" placeholder="—" value={form.dayOfMonth}
                  onChange={e => set('dayOfMonth', e.target.value ? Number(e.target.value) : '')}
                  className={inputCls + ' w-20'}
                />
                <span className="text-sm text-ww-sub shrink-0">日（選填）</span>
              </div>
            </Field>

            <Field label="下次到期日">
              <input type="date" value={form.nextDue} onChange={e => set('nextDue', e.target.value)} className={inputCls} />
            </Field>

            <Field label="備註（選填）">
              <input type="text" value={form.note} onChange={e => set('note', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-ww-line2 rounded-ww-inner text-ww-ink2
                         hover:bg-ww-seg text-sm transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-ww-brand hover:bg-ww-brandhover text-white rounded-ww-inner
                         font-medium text-sm disabled:opacity-50 transition-colors"
            >
              {saving ? '儲存中…' : isEdit ? '更新' : '新增'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
