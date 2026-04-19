import React, { useState } from 'react';
import { format } from 'date-fns';

const TYPE_OPTIONS = [
  { value: 'charging',    label: '⚡ 充電' },
  { value: 'tolls',       label: '🛣️ 過路費' },
  { value: 'maintenance', label: '🔧 保養維修' },
  { value: 'insurance',   label: '🛡️ 保險' },
  { value: 'other',       label: '📋 其他' },
];

const VENDOR_PRESETS = {
  charging:    ['DARA', 'Tesla', 'iCharging', 'EVOASIS', 'U-power', 'TAIL', '星舟快充', '創久大員', '創久（聯發）'],
  maintenance: ['馳加'],
  insurance:   ['富邦'],
  other:       ['頂級連線'],
  tolls:       [],
};

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

export default function AddRecordModal({ onClose, onSave, definedUsers, defaultVehicleId }) {
  const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");
  const [form, setForm] = useState({
    type: 'charging',
    date: now,
    vendor: '',
    cost: '',
    kwh: '',
    user: definedUsers[0] ?? '所有人',
    mileage: '',
    note: '',
    expiryDate: '',
    vehicleId: defaultVehicleId,
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.cost) return alert('請輸入費用');
    setSaving(true);
    await onSave({
      type: form.type,
      date: form.date,
      vendor: form.vendor,
      cost: Number(form.cost),
      kwh: Number(form.kwh) || 0,
      user: form.user,
      mileage: form.mileage,
      note: form.note,
      expiryDate: form.expiryDate,
      vehicleId: form.vehicleId,
    });
    setSaving(false);
  };

  const vendors = VENDOR_PRESETS[form.type] ?? [];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="p-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-800">新增記錄</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Type */}
            <Field label="類型">
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('type', t.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      form.type === t.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* Date */}
            <Field label="日期">
              <input
                type="datetime-local"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className={inputCls}
              />
            </Field>

            {/* Vendor */}
            <Field label="地點 / 廠商">
              <input
                list="vendor-list"
                value={form.vendor}
                onChange={e => set('vendor', e.target.value)}
                placeholder="輸入或選擇"
                className={inputCls}
              />
              <datalist id="vendor-list">
                {vendors.map(v => <option key={v} value={v} />)}
              </datalist>
            </Field>

            {/* Cost */}
            <Field label="費用（元）">
              <input
                type="number"
                min="0"
                value={form.cost}
                onChange={e => set('cost', e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </Field>

            {/* kWh - charging only */}
            {form.type === 'charging' && (
              <Field label="充電度數（kWh）">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.kwh}
                  onChange={e => set('kwh', e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </Field>
            )}

            {/* User */}
            <Field label="分攤">
              <select
                value={form.user}
                onChange={e => set('user', e.target.value)}
                className={inputCls}
              >
                {definedUsers.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>

            {/* Mileage */}
            <Field label="里程（km，選填）">
              <input
                type="text"
                value={form.mileage}
                onChange={e => set('mileage', e.target.value)}
                placeholder=""
                className={inputCls}
              />
            </Field>

            {/* Expiry Date - insurance only */}
            {form.type === 'insurance' && (
              <Field label="到期日">
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={e => set('expiryDate', e.target.value)}
                  className={inputCls}
                />
              </Field>
            )}

            {/* Note */}
            <Field label="備註（選填）">
              <input
                type="text"
                value={form.note}
                onChange={e => set('note', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 text-sm disabled:opacity-60"
            >
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
