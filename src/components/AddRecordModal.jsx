import React, { useState } from 'react';
import { format } from 'date-fns';
import { resolveTypes } from '../typeConfig';

const VENDOR_PRESETS = {
  charging:    ['DARA', 'Tesla', 'iCharging', 'EVOASIS', 'U-power', 'TAIL', '星舟快充', '創久大員', '創久（聯發）'],
  maintenance: ['馳加'],
  insurance:   ['富邦'],
  other:       ['頂級連線'],
  tolls:       [],
};

const inputCls = 'w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-tesla';

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-gray-500 dark:text-neutral-400 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

export default function AddRecordModal({ onClose, onSave, definedUsers, defaultVehicleId, editItem, definedTypes }) {
  const typeOptions = resolveTypes(definedTypes);
  const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");
  const isEdit = !!editItem;
  const [form, setForm] = useState(() => isEdit ? {
    type: editItem.type, date: editItem.date, vendor: editItem.vendor ?? '',
    cost: String(editItem.cost ?? ''), kwh: String(editItem.kwh ?? ''),
    user: editItem.user, mileage: editItem.mileage ?? '',
    note: editItem.note ?? '', expiryDate: editItem.expiryDate ?? '',
    vehicleId: editItem.vehicleId ?? defaultVehicleId,
  } : {
    type: 'charging', date: now, vendor: '', cost: '', kwh: '',
    user: definedUsers[0] ?? '所有人', mileage: '', note: '', expiryDate: '',
    vehicleId: defaultVehicleId,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.cost) return alert('請輸入費用');
    setSaving(true);
    await onSave({ ...form, cost: Number(form.cost), kwh: Number(form.kwh) || 0 });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-neutral-800">
        <div className="p-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{isEdit ? '編輯記錄' : '新增記錄'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800">×</button>
          </div>

          <div className="space-y-4">
            <Field label="類型">
              <div className="flex flex-wrap gap-2">
                {typeOptions.map(t => (
                  <button key={t.id} type="button" onClick={() => set('type', t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      form.type === t.id
                        ? 'bg-tesla text-white'
                        : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
                    }`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="日期">
              <input type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </Field>

            <Field label="地點 / 廠商">
              <input list="vendor-list" value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="輸入或選擇" className={inputCls} />
              <datalist id="vendor-list">
                {(VENDOR_PRESETS[form.type] ?? []).map(v => <option key={v} value={v} />)}
              </datalist>
            </Field>


            <Field label="費用（元）">
              <input type="number" min="0" value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="0" className={inputCls} />
            </Field>

            {form.type === 'charging' && (
              <Field label="充電度數（kWh）">
                <input type="number" min="0" step="0.01" value={form.kwh} onChange={e => set('kwh', e.target.value)} placeholder="0" className={inputCls} />
              </Field>
            )}

            <Field label="分攤">
              <select value={form.user} onChange={e => set('user', e.target.value)} className={inputCls}>
                {definedUsers.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>

            <Field label="里程（km，選填）">
              <input type="text" value={form.mileage} onChange={e => set('mileage', e.target.value)} className={inputCls} />
            </Field>

            {form.type === 'insurance' && (
              <Field label="到期日">
                <input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} className={inputCls} />
              </Field>
            )}

            <Field label="備註（選填）">
              <input type="text" value={form.note} onChange={e => set('note', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 text-sm">取消</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-tesla hover:bg-tesla-hover text-white rounded-xl font-medium text-sm disabled:opacity-60">
              {saving ? '儲存中...' : isEdit ? '更新' : '儲存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
