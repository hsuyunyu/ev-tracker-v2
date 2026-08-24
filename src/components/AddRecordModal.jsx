import React, { useState, useEffect } from 'react';
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
const segBtnCls = (active) =>
  `flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
    active ? 'bg-tesla text-white shadow-sm' : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700'
  }`;

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-gray-500 dark:text-neutral-400 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────
// 分攤 Section
// ────────────────────────────────────────────────
function SplitSection({ members, totalCost, splitMethod, setSplitMethod, paidBy, setPaidBy, splitAmounts, setSplitAmounts, splitRatios, setSplitRatios }) {
  const cost = parseFloat(totalCost) || 0;

  // 均分：自動計算
  const equalAmt = members.length > 0 ? cost / members.length : 0;

  // 比例：把 % 輸入轉成金額
  const ratioSum = members.reduce((s, u) => s + (parseFloat(splitRatios[u]) || 0), 0);
  const ratioValid = Math.abs(ratioSum - 100) < 0.5;

  // 金額：加總驗證
  const amountSum = members.reduce((s, u) => s + (parseFloat(splitAmounts[u]) || 0), 0);
  const amountValid = Math.abs(amountSum - cost) < 0.5;

  // 餘額按鈕：幫最後一個還沒填的人自動填剩餘金額
  const handleRemainder = (user) => {
    const othersSum = members.filter(u => u !== user).reduce((s, u) => s + (parseFloat(splitAmounts[u]) || 0), 0);
    const remainder = cost - othersSum;
    if (remainder >= 0) setSplitAmounts(a => ({ ...a, [user]: remainder.toFixed(0) }));
  };

  return (
    <div className="space-y-3">
      {/* 代墊人 */}
      <Field label="代墊人（誰先付錢？）">
        <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className={inputCls}>
          {members.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </Field>

      {/* 分攤方式 */}
      <Field label="分攤方式">
        <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg">
          {[['equal','均分'],['ratio','比例'],['amount','金額']].map(([v,l]) => (
            <button key={v} type="button" onClick={() => setSplitMethod(v)} className={segBtnCls(splitMethod === v)}>{l}</button>
          ))}
        </div>
      </Field>

      {/* Per-person rows */}
      <div className="space-y-2">
        {members.map((user, idx) => {
          const isLast = idx === members.length - 1;

          if (splitMethod === 'equal') {
            return (
              <div key={user} className="flex items-center gap-2">
                <span className="flex-1 text-sm text-gray-700 dark:text-neutral-300">{user}</span>
                <span className="text-sm font-medium text-gray-500 dark:text-neutral-400 min-w-[80px] text-right">
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
                <span className="flex-1 text-sm text-gray-700 dark:text-neutral-300">{user}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="0" max="100" step="1"
                    value={pct}
                    onChange={e => setSplitRatios(r => ({ ...r, [user]: e.target.value }))}
                    className="w-16 border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 text-sm text-right bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-tesla"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-400">%</span>
                  <span className="text-sm text-gray-400 min-w-[56px] text-right">${derived.toFixed(0)}</span>
                </div>
              </div>
            );
          }

          // amount mode
          const amt = splitAmounts[user] ?? '';
          const filledOthers = members.filter(u => u !== user).some(u => parseFloat(splitAmounts[u]) > 0);
          const showRemainder = isLast && filledOthers && (!amt || parseFloat(amt) === 0);

          return (
            <div key={user} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-gray-700 dark:text-neutral-300">{user}</span>
              <div className="flex items-center gap-1">
                {showRemainder && (
                  <button
                    type="button"
                    onClick={() => handleRemainder(user)}
                    className="text-xs text-white bg-orange-400 hover:bg-orange-500 px-2 py-1 rounded-full transition-colors"
                  >
                    餘額
                  </button>
                )}
                <input
                  type="number" min="0" step="1"
                  value={amt}
                  onChange={e => setSplitAmounts(a => ({ ...a, [user]: e.target.value }))}
                  className="w-24 border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 text-sm text-right bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-tesla"
                  placeholder="0"
                />
              </div>
            </div>
          );
        })}

        {/* 驗證提示 */}
        {splitMethod === 'ratio' && !ratioValid && ratioSum > 0 && (
          <p className="text-xs text-red-500">比例總計 {ratioSum.toFixed(0)}%，需等於 100%</p>
        )}
        {splitMethod === 'amount' && amountSum > 0 && !amountValid && (
          <p className="text-xs text-red-500">金額總計 ${amountSum.toFixed(0)}，需等於 ${cost.toFixed(0)}</p>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Main Modal
// ────────────────────────────────────────────────
export default function AddRecordModal({ onClose, onSave, definedUsers, defaultVehicleId, editItem, definedTypes }) {
  const typeOptions = resolveTypes(definedTypes);
  const members = definedUsers;
  const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");
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
    type: 'charging', date: now, vendor: '', cost: '', kwh: '',
    user: definedUsers[0] ?? '', mileage: '', note: '', expiryDate: '',
    vehicleId: defaultVehicleId,
  });

  // 分攤 state
  const hasSplitData = !!(editItem?.splitEntries?.length);
  const [splitEnabled, setSplitEnabled] = useState(hasSplitData);
  const [splitMethod, setSplitMethod] = useState(editItem?.splitMethod ?? 'equal');
  const [paidBy, setPaidBy] = useState(editItem?.paidBy ?? (definedUsers[0] ?? ''));
  const [splitAmounts, setSplitAmounts] = useState(() => {
    if (!hasSplitData) return {};
    return Object.fromEntries((editItem.splitEntries || []).map(e => [e.user, String(e.amount)]));
  });
  const [splitRatios, setSplitRatios] = useState(() => {
    if (!hasSplitData) return {};
    return Object.fromEntries((editItem.splitEntries || []).map(e => [e.user, String((e.ratio ?? 0) * 100)]));
  });

  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const cost = parseFloat(form.cost) || 0;

  // 計算最終 splitEntries
  function buildEntries() {
    if (splitMethod === 'equal') {
      const each = members.length > 0 ? cost / members.length : 0;
      return members.map(u => ({ user: u, amount: each, ratio: 1 / members.length }));
    }
    if (splitMethod === 'ratio') {
      return members.map(u => {
        const pct = parseFloat(splitRatios[u]) || 0;
        return { user: u, amount: cost * pct / 100, ratio: pct / 100 };
      });
    }
    // amount
    return members.map(u => {
      const amt = parseFloat(splitAmounts[u]) || 0;
      return { user: u, amount: amt, ratio: cost > 0 ? amt / cost : 0 };
    });
  }

  // 驗證
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
    const payload = {
      ...form,
      cost: Number(form.cost),
      kwh: Number(form.kwh) || 0,
    };
    if (splitEnabled && members.length > 1) {
      payload.paidBy = paidBy;
      payload.splitMethod = splitMethod;
      payload.splitEntries = buildEntries();
    } else {
      payload.paidBy = '';
      payload.splitMethod = 'none';
      payload.splitEntries = [];
    }
    await onSave(payload);
    setSaving(false);
  };

  const presets = VENDOR_PRESETS[form.type] ?? [];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-neutral-800">
        <div className="p-5">
          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isEdit ? '編輯記錄' : '新增記錄'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* 類型 */}
            <Field label="類型">
              <div className="flex flex-wrap gap-2">
                {typeOptions.map(t => (
                  <button key={t.id} type="button" onClick={() => set('type', t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      form.type === t.id
                        ? 'bg-tesla text-white'
                        : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:bg-gray-200'
                    }`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* 日期 */}
            <Field label="日期">
              <input type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </Field>

            {/* 地點 / 廠商 */}
            <Field label="地點 / 廠商">
              <input list="vendor-list" value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="輸入或選擇" className={inputCls} />
              <datalist id="vendor-list">
                {presets.map(v => <option key={v} value={v} />)}
              </datalist>
            </Field>

            {/* 費用 */}
            <Field label="費用（元）">
              <input type="number" min="0" value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="0" className={inputCls} />
            </Field>

            {/* 充電 kWh */}
            {form.type === 'charging' && (
              <Field label="充電度數（kWh）">
                <input type="number" min="0" step="0.01" value={form.kwh} onChange={e => set('kwh', e.target.value)} placeholder="0" className={inputCls} />
              </Field>
            )}

            {/* 誰的支出（無分攤時） */}
            {!splitEnabled && (
              <Field label="誰的支出">
                <select value={form.user} onChange={e => set('user', e.target.value)} className={inputCls}>
                  {members.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            )}

            {/* 里程 */}
            <Field label="里程（km，選填）">
              <input type="text" value={form.mileage} onChange={e => set('mileage', e.target.value)} className={inputCls} />
            </Field>

            {/* 到期日（保險） */}
            {form.type === 'insurance' && (
              <Field label="到期日">
                <input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} className={inputCls} />
              </Field>
            )}

            {/* 備註 */}
            <Field label="備註（選填）">
              <input type="text" value={form.note} onChange={e => set('note', e.target.value)} className={inputCls} />
            </Field>

            {/* ── 分攤設定 ── */}
            {members.length >= 2 && (
              <div className="border-t border-gray-100 dark:border-neutral-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-neutral-300">啟用分攤</span>
                  <button
                    type="button"
                    onClick={() => setSplitEnabled(v => !v)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${splitEnabled ? 'bg-tesla' : 'bg-gray-200 dark:bg-neutral-700'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${splitEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
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

          {/* 按鈕列 */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 text-sm"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !canSave}
              className="flex-1 py-2.5 bg-tesla hover:bg-tesla-hover text-white rounded-xl font-medium text-sm disabled:opacity-60"
            >
              {saving ? '儲存中...' : isEdit ? '更新' : '儲存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
