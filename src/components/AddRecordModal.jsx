import React, { useState } from 'react';
import { X } from 'lucide-react';
import { resolveTypes, TypeIcon } from '../typeConfig';
import { buildSplitEntries } from '../split';

const VENDOR_PRESETS = {
  charging:    ['DARA', 'Tesla', 'iCharging', 'EVOASIS', 'U-power', 'TAIL', '星舟快充', '創久大員', '創久（聯發）'],
  maintenance: ['馳加'],
  insurance:   ['富邦'],
  other:       ['頂級連線'],
  tolls:       [],
};

const nowLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * 決定新記錄的預設日期。
 * 從月曆選定某天後新增時帶入那天；時間沿用現在的時分，
 * 讓同一天內新增的多筆記錄仍能依時間排序。
 */
const initialDateFor = (day) => {
  if (!day) return nowLocal();
  if (day.includes('T')) return day;
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${day}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const inputCls =
  'w-full border border-ww-line2 rounded-ww-inner px-3 py-2.5 text-sm text-ww-ink bg-ww-field ' +
  'placeholder:text-ww-faint focus:outline-none focus:border-ww-brand transition-colors';

const segBtnCls = (active) =>
  `flex-1 py-1.5 text-xs font-medium rounded-[10px] transition-colors ${
    active ? 'bg-ww-brand text-white' : 'text-ww-ink2 hover:text-ww-ink'
  }`;

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-ww-sub mb-1.5 block font-medium">{label}</label>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────
// 分攤 Section
// ────────────────────────────────────────────────
function SplitSection({
  members, totalCost, splitMethod, setSplitMethod, paidBy, setPaidBy,
  splitAmounts, setSplitAmounts, splitRatios, setSplitRatios,
}) {
  const cost = parseFloat(totalCost) || 0;
  const equalAmt = members.length > 0 ? cost / members.length : 0;

  const ratioSum   = members.reduce((s, u) => s + (parseFloat(splitRatios[u])  || 0), 0);
  const ratioValid = Math.abs(ratioSum - 100) < 0.5;
  const amountSum  = members.reduce((s, u) => s + (parseFloat(splitAmounts[u]) || 0), 0);
  const amountValid = Math.abs(amountSum - cost) < 0.5;

  // 幫最後一個還沒填的人自動填剩餘金額
  const handleRemainder = (user) => {
    const othersSum = members.filter(u => u !== user)
      .reduce((s, u) => s + (parseFloat(splitAmounts[u]) || 0), 0);
    const remainder = cost - othersSum;
    if (remainder >= 0) setSplitAmounts(a => ({ ...a, [user]: remainder.toFixed(0) }));
  };

  const numCls =
    'border border-ww-line2 rounded-ww-inner px-2 py-1.5 text-sm text-right text-ww-ink bg-ww-field ' +
    'focus:outline-none focus:border-ww-brand transition-colors';

  return (
    <div className="space-y-3">
      <Field label="代墊人（誰先付錢？）">
        <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className={inputCls}>
          {members.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </Field>

      <Field label="分攤方式">
        <div className="flex gap-1 bg-ww-seg p-1 rounded-ww-inner">
          {[['equal', '均分'], ['ratio', '比例'], ['amount', '金額']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setSplitMethod(v)} className={segBtnCls(splitMethod === v)}>
              {l}
            </button>
          ))}
        </div>
      </Field>

      <div className="space-y-2">
        {members.map((user, idx) => {
          const isLast = idx === members.length - 1;

          if (splitMethod === 'equal') {
            return (
              <div key={user} className="flex items-center gap-2">
                <span className="flex-1 text-sm text-ww-ink2">{user}</span>
                <span className="text-sm font-medium text-ww-sub min-w-[80px] text-right tabular-nums">
                  ${equalAmt.toFixed(0)}
                </span>
              </div>
            );
          }

          if (splitMethod === 'ratio') {
            const pct = splitRatios[user] ?? '';
            const derived = cost * (parseFloat(pct) || 0) / 100;
            return (
              <div key={user} className="flex items-center gap-2">
                <span className="flex-1 text-sm text-ww-ink2">{user}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="0" max="100" step="1" value={pct}
                    onChange={e => setSplitRatios(r => ({ ...r, [user]: e.target.value }))}
                    className={`w-16 ${numCls}`} placeholder="0"
                  />
                  <span className="text-xs text-ww-sub">%</span>
                  <span className="text-sm text-ww-sub min-w-[56px] text-right tabular-nums">
                    ${derived.toFixed(0)}
                  </span>
                </div>
              </div>
            );
          }

          const amt = splitAmounts[user] ?? '';
          const filledOthers = members.filter(u => u !== user).some(u => parseFloat(splitAmounts[u]) > 0);
          const showRemainder = isLast && filledOthers && (!amt || parseFloat(amt) === 0);

          return (
            <div key={user} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-ww-ink2">{user}</span>
              <div className="flex items-center gap-1">
                {showRemainder && (
                  <button
                    type="button" onClick={() => handleRemainder(user)}
                    className="text-xs text-white bg-ww-toll hover:opacity-90 px-2 py-1 rounded-full transition-opacity"
                  >
                    餘額
                  </button>
                )}
                <input
                  type="number" min="0" step="1" value={amt}
                  onChange={e => setSplitAmounts(a => ({ ...a, [user]: e.target.value }))}
                  className={`w-24 ${numCls}`} placeholder="0"
                />
              </div>
            </div>
          );
        })}

        {splitMethod === 'ratio' && !ratioValid && ratioSum > 0 && (
          <p className="text-xs text-ww-danger">比例總計 {ratioSum.toFixed(0)}%，需等於 100%</p>
        )}
        {splitMethod === 'amount' && amountSum > 0 && !amountValid && (
          <p className="text-xs text-ww-danger">
            金額總計 ${amountSum.toFixed(0)}，需等於 ${cost.toFixed(0)}
          </p>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Main Modal
// ────────────────────────────────────────────────
export default function AddRecordModal({
  onClose, onSave, definedUsers, defaultVehicleId, editItem, definedTypes,
  settings = {}, vehicles = [], initialType, initialDate,
}) {
  const typeOptions = resolveTypes(definedTypes);
  const members = definedUsers;
  const isEdit = !!editItem;

  const [form, setForm] = useState(() => isEdit ? {
    type: editItem.type,
    date: editItem.date,
    vendor: editItem.vendor ?? '',
    cost: String(editItem.cost ?? ''),
    kwh: String(editItem.kwh ?? ''),
    user: editItem.user,
    mileage: editItem.mileage ?? '',
    note: editItem.note ?? '',
    expiryDate: editItem.expiryDate ?? '',
    vehicleId: editItem.vehicleId ?? defaultVehicleId,
  } : {
    type: initialType ?? 'charging', date: initialDateFor(initialDate), vendor: '', cost: '', kwh: '',
    user: definedUsers[0] ?? '', mileage: '', note: '', expiryDate: '',
    vehicleId: defaultVehicleId,
  });

  // 分攤 state（新增時套用設定裡的預設分攤）
  const hasSplitData = !!(editItem?.splitEntries?.length);
  const [splitEnabled, setSplitEnabled] = useState(
    isEdit ? hasSplitData : !!settings.defaultSplitEnabled
  );
  const [splitMethod, setSplitMethod] = useState(
    editItem?.splitMethod && editItem.splitMethod !== 'none'
      ? editItem.splitMethod
      : (settings.defaultSplitMethod || 'equal')
  );
  const [paidBy, setPaidBy] = useState(editItem?.paidBy || definedUsers[0] || '');
  const [splitAmounts, setSplitAmounts] = useState(() =>
    hasSplitData
      ? Object.fromEntries(editItem.splitEntries.map(e => [e.user, String(e.amount)]))
      : {}
  );
  const [splitRatios, setSplitRatios] = useState(() =>
    hasSplitData
      ? Object.fromEntries(editItem.splitEntries.map(e => [e.user, String((e.ratio ?? 0) * 100)]))
      : {}
  );

  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const cost = parseFloat(form.cost) || 0;

  const splitValid = !splitEnabled || (() => {
    if (splitMethod === 'equal') return true;
    if (splitMethod === 'ratio') {
      const sum = members.reduce((s, u) => s + (parseFloat(splitRatios[u]) || 0), 0);
      return Math.abs(sum - 100) < 0.5;
    }
    const sum = members.reduce((s, u) => s + (parseFloat(splitAmounts[u]) || 0), 0);
    return Math.abs(sum - cost) < 0.5;
  })();

  const canSave = !!form.cost && splitValid;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // 欄位名稱與型別必須與 iOS ExpenseRecord 一致（mileage 存字串）
      const payload = {
        type: form.type,
        vendor: form.vendor,
        cost: Number(form.cost),
        kwh: Number(form.kwh) || 0,
        user: form.user,
        vehicleId: form.vehicleId || '',
        note: form.note,
        mileage: String(form.mileage ?? ''),
        expiryDate: form.expiryDate,
        date: form.date,
      };

      if (splitEnabled && members.length > 1) {
        payload.paidBy = paidBy;
        payload.splitMethod = splitMethod;
        payload.splitEntries = buildSplitEntries({
          method: splitMethod, members, cost,
          amounts: splitAmounts, ratios: splitRatios,
        });
      } else {
        payload.paidBy = form.user;
        payload.splitMethod = 'none';
        payload.splitEntries = [];
      }

      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const presets = VENDOR_PRESETS[form.type] ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-ww-card rounded-t-ww-sheet sm:rounded-ww-lg w-full max-w-md max-h-[92vh]
                      overflow-y-auto shadow-2xl border border-ww-line ww-safe-bottom">
        <div className="p-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-ww-ink">{isEdit ? '編輯記錄' : '新增記錄'}</h2>
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

            <Field label="費用（元）">
              <input
                type="number" inputMode="decimal" min="0" value={form.cost}
                onChange={e => set('cost', e.target.value)} placeholder="0"
                className={`${inputCls} text-2xl font-bold py-3`}
              />
            </Field>

            <Field label="日期">
              <input type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </Field>

            <Field label="地點 / 廠商">
              <input
                list="vendor-list" value={form.vendor}
                onChange={e => set('vendor', e.target.value)}
                placeholder="輸入或選擇" className={inputCls}
              />
              <datalist id="vendor-list">
                {presets.map(v => <option key={v} value={v} />)}
              </datalist>
            </Field>

            {form.type === 'charging' && (
              <Field label="充電度數（kWh）">
                <input
                  type="number" inputMode="decimal" min="0" step="0.01" value={form.kwh}
                  onChange={e => set('kwh', e.target.value)} placeholder="0" className={inputCls}
                />
              </Field>
            )}

            {!splitEnabled && (
              <Field label="誰的支出">
                <select value={form.user} onChange={e => set('user', e.target.value)} className={inputCls}>
                  {members.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            )}

            {vehicles.length > 0 && (
              <Field label="車輛">
                <select value={form.vehicleId} onChange={e => set('vehicleId', e.target.value)} className={inputCls}>
                  <option value="">未指定</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name || v.licensePlate}</option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="里程（km，選填）">
              <input
                type="text" inputMode="numeric" value={form.mileage}
                onChange={e => set('mileage', e.target.value)} className={inputCls}
              />
            </Field>

            {form.type === 'insurance' && (
              <Field label="到期日">
                <input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} className={inputCls} />
              </Field>
            )}

            <Field label="備註（選填）">
              <input type="text" value={form.note} onChange={e => set('note', e.target.value)} className={inputCls} />
            </Field>

            {members.length >= 2 && (
              <div className="border-t border-ww-line pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-ww-ink2">啟用分攤</span>
                  <button
                    type="button" onClick={() => setSplitEnabled(v => !v)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      splitEnabled ? 'bg-ww-brand' : 'bg-ww-seg2 border border-ww-line2'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      splitEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {splitEnabled && (
                  <SplitSection
                    members={members}
                    totalCost={form.cost}
                    splitMethod={splitMethod}
                    setSplitMethod={setSplitMethod}
                    paidBy={paidBy}
                    setPaidBy={setPaidBy}
                    splitAmounts={splitAmounts}
                    setSplitAmounts={setSplitAmounts}
                    splitRatios={splitRatios}
                    setSplitRatios={setSplitRatios}
                  />
                )}
              </div>
            )}
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
              onClick={handleSave}
              disabled={saving || !canSave}
              className="flex-1 py-2.5 bg-ww-brand hover:bg-ww-brandhover text-white rounded-ww-inner
                         font-medium text-sm disabled:opacity-50 transition-colors"
            >
              {saving ? '儲存中…' : isEdit ? '更新' : '儲存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
