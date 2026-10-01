import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Delete, AlertTriangle, Info } from 'lucide-react';
import { resolveTypes, TypeIcon } from '../typeConfig';
import {
  fmtInt, money, trimZero, parseLocal, ymdhm, nowLocal, daysFromToday, splitMethodLabel,
} from '../format';
import {
  Card, Divider, NavButton, Segmented, Sheet, SheetNav, StepButton, Toggle, UserAvatar,
} from './ui';

/**
 * 記帳 sheet —— 對應 iOS AddRecordView。
 * 大金額 + 類型 chips + 內嵌計算機鍵盤 + 欄位卡 + 分攤 / 代墊卡。
 */

// MARK: - 計算機

const OPS = '+−×÷';
const KEY_ROWS = [
  ['7', '8', '9', '⌫'],
  ['4', '5', '6', '÷'],
  ['1', '2', '3', '×'],
  ['.', '0', '+', '−'],
];
const lastSegment = (e) => e.split(/[+−×÷]/).pop() ?? '';

/** 由左至右依序計算（不做先乘除），與 iOS evalExpr 相同 */
export function evalExpr(raw) {
  let s = raw.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  while (s && '+-*/.'.includes(s[s.length - 1])) s = s.slice(0, -1);
  if (!s) return 0;

  const tokens = s.match(/[0-9.]+|[+\-*/]/g) ?? [];
  let res = Number(tokens[0]);
  if (!Number.isFinite(res)) return 0;

  for (let i = 1; i + 1 < tokens.length; i += 2) {
    const n = Number(tokens[i + 1]);
    if (!Number.isFinite(n)) break;
    if (tokens[i] === '+') res += n;
    else if (tokens[i] === '-') res -= n;
    else if (tokens[i] === '*') res *= n;
    else if (tokens[i] === '/' && n !== 0) res /= n;
  }
  return Math.round(res * 100) / 100;
}

function pressKey(expr, k) {
  let e = expr;
  const lastIsOp = e && OPS.includes(e[e.length - 1]);

  if (k === '⌫') {
    e = e.slice(0, -1);
  } else if (OPS.includes(k)) {
    if (!e) { if (k === '−') e = '−'; }
    else if (lastIsOp) e = e.slice(0, -1) + k;
    else e += k;
  } else if (k === '.') {
    if (!lastSegment(e).includes('.')) e = (!e || lastIsOp) ? e + '0.' : e + '.';
  } else {
    const seg = lastSegment(e);
    if (seg.replace('.', '').length < 9) e = seg === '0' ? e.slice(0, -1) + k : e + k;
  }
  return e.slice(0, 20);
}

const hasCalc = (e) => /[+×÷]/.test(e) || e.indexOf('−', 1) > 0;

function costDisplay(e) {
  if (!e) return '0';
  if (hasCalc(e)) return e.replace(/([+−×÷])/g, ' $1 ').trim();
  const [int, dec] = e.split('.');
  const grouped = fmtInt(Number(int) || 0);
  return dec === undefined ? grouped : `${grouped}.${dec}`;
}

// 實體鍵盤 → 計算機按鍵（桌機用）
const KEYBOARD_MAP = { '*': '×', x: '×', X: '×', '/': '÷', '-': '−', '+': '+', '.': '.', Backspace: '⌫' };

// MARK: - 元件

export default function AddRecordSheet({
  record, isEditing = false, settings, vehicles = [], pastVendors = [], onClose, onSave,
}) {
  const types   = resolveTypes(settings.definedTypes);
  const members = settings.definedUsers ?? [];
  const count   = Math.max(members.length, 1);
  const equalRatios = () => Object.fromEntries(members.map(u => [u, 1 / count]));

  const [form, setForm] = useState(() => ({
    type: record.type, date: record.date, vendor: record.vendor ?? '',
    kwh: record.kwh > 0 ? trimZero(record.kwh) : '',
    mileage: String(record.mileage ?? ''), note: record.note ?? '',
    vehicleId: record.vehicleId ?? '', user: record.user ?? members[0] ?? '',
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const initCost = record.cost > 0 ? record.cost : 0;
  const [expr, setExpr] = useState(initCost ? trimZero(initCost) : '');
  const [kpCollapsed, setKpCollapsed] = useState(initCost > 0);
  const cost = expr ? evalExpr(expr) : 0;

  // 分攤初值：編輯既有分攤 → 沿用；新增 → 套用設定裡的預設分攤
  const existingSplit = record.splitMethod && record.splitMethod !== 'none' && record.splitEntries?.length > 0;
  const [splitEnabled, setSplitEnabled] = useState(
    existingSplit || (!isEditing && !!settings.defaultSplitEnabled && members.length > 1)
  );
  const [splitMethod, setSplitMethod] = useState(
    existingSplit ? record.splitMethod : (settings.defaultSplitMethod || 'equal')
  );
  const [splitAmounts, setSplitAmounts] = useState(() => existingSplit
    ? Object.fromEntries(record.splitEntries.map(e => [e.user, e.amount || 0]))
    : Object.fromEntries(members.map(u => [u, initCost / count])));
  const [splitRatios, setSplitRatios] = useState(() => existingSplit
    ? Object.fromEntries(record.splitEntries.map(e => [e.user, e.ratio || 0]))
    : equalRatios());
  const [paidAmounts, setPaidAmounts] = useState(() => {
    const payer = record.paidBy || record.user || members[0] || '';
    return payer ? { [payer]: initCost } : {};
  });

  const [vendorFocused, setVendorFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  const sum = (map) => members.reduce((s, u) => s + (map[u] || 0), 0);
  const amountTotal = sum(splitAmounts);
  const ratioTotal  = sum(splitRatios);
  const paidTotal   = sum(paidAmounts);
  const amountValid = Math.abs(amountTotal - cost) < 0.5;
  const ratioValid  = Math.abs(ratioTotal - 1) < 0.01;
  const paidValid   = Math.abs(paidTotal - cost) < 0.5;

  const canSave = cost > 0 && (!splitEnabled || (
    (splitMethod !== 'amount' || amountValid) &&
    (splitMethod !== 'ratio'  || ratioValid) &&
    paidValid
  ));

  // MARK: 金額變動 → 連動分攤

  /** 單人代墊時金額自動跟隨總額（對應 iOS recalcOnCost） */
  const followCost = (newCost) => {
    setPaidAmounts(prev => {
      const payers = Object.entries(prev).filter(([, v]) => v > 0);
      if (payers.length > 1) return prev;
      const payer = payers[0]?.[0] || record.paidBy || members[0] || '';
      return payer ? { [payer]: newCost } : prev;
    });
  };

  // 連續快速按鍵時 state 還沒更新，用 ref 取得最新算式才不會漏鍵
  const exprRef = useRef(expr);
  const updateExpr = (e) => {
    exprRef.current = e;
    setExpr(e);
    if (splitEnabled) followCost(e ? evalExpr(e) : 0);
  };
  const press = (k) => updateExpr(pressKey(exprRef.current, k));

  const confirmAmount = () => {
    const v = evalExpr(exprRef.current);
    updateExpr(v ? trimZero(v) : '');
    setKpCollapsed(true);
  };

  // 桌機：鍵盤可直接輸入金額（焦點不在文字欄位時）
  useEffect(() => {
    if (kpCollapsed) return;
    const onKey = (ev) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(ev.target?.tagName)) return;
      if (ev.key === 'Enter') { ev.preventDefault(); confirmAmount(); return; }
      const k = /^[0-9]$/.test(ev.key) ? ev.key : KEYBOARD_MAP[ev.key];
      if (!k) return;
      ev.preventDefault();
      press(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // MARK: 分攤

  const toggleSplit = (on) => {
    setSplitEnabled(on);
    if (!on) return;
    if (settings.defaultSplitEnabled) setSplitMethod(settings.defaultSplitMethod || 'equal');
    if (ratioTotal === 0) setSplitRatios(equalRatios());
    if (amountTotal === 0) setSplitAmounts(Object.fromEntries(members.map(u => [u, cost / count])));
    if (paidTotal === 0 && members[0]) setPaidAmounts({ [members[0]]: cost });
    else followCost(cost);
  };

  const changeMethod = (m) => {
    // 切到「金額」時沿用目前模式算出的各人金額，方便微調
    if (m === 'amount' && splitMethod !== 'amount') {
      setSplitAmounts(Object.fromEntries(members.map(u => [
        u, splitMethod === 'ratio' ? cost * (splitRatios[u] || 0) : cost / count,
      ])));
    }
    if (m === 'ratio' && (splitMethod === 'equal' || ratioTotal === 0)) setSplitRatios(equalRatios());
    setSplitMethod(m);
  };

  const adjustRatio = (u, delta) =>
    setSplitRatios(r => ({ ...r, [u]: Math.max(0, Math.min(1, (r[u] || 0) + delta / 100)) }));

  // MARK: 日期

  const dateDays = daysFromToday(form.date);
  const dateLabel = dateDays === 0 ? '今天' : dateDays === -1 ? '昨天'
    : (() => { const d = parseLocal(form.date); return `${d.getMonth() + 1}月${d.getDate()}日`; })();
  const shiftDate = (days) => {
    const d = parseLocal(form.date);
    d.setDate(d.getDate() + days);
    if (days > 0 && daysFromToday(ymdhm(d)) > 0) return;
    set('date', ymdhm(d));
  };

  // MARK: 商家建議

  const vendorSug = pastVendors
    .filter(v => v !== form.vendor && (!form.vendor || v.includes(form.vendor)))
    .slice(0, 4);

  // MARK: 儲存

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      // 欄位名稱與型別必須與 iOS ExpenseRecord 一致（mileage 存字串）
      const payload = {
        type: form.type,
        vendor: form.vendor.trim(),
        cost,
        kwh: form.type === 'charging' ? (Number(form.kwh) || 0) : 0,
        user: form.user,
        vehicleId: form.vehicleId || '',
        note: form.note,
        mileage: String(form.mileage ?? ''),
        expiryDate: record.expiryDate ?? '',
        date: form.date,
      };

      if (splitEnabled && members.length > 1) {
        payload.splitMethod = splitMethod;
        payload.splitEntries = members.map(u => {
          const amount = splitMethod === 'equal' ? cost / count
            : splitMethod === 'ratio' ? cost * (splitRatios[u] || 0)
            : (splitAmounts[u] || 0);
          // ratio 儲存規則與 iOS 一致：amount 模式時 ratio = amount / cost
          const ratio = splitMethod === 'ratio' ? (splitRatios[u] || 0)
            : splitMethod === 'amount' ? (cost > 0 ? amount / cost : 0)
            : 1 / count;
          return { id: crypto.randomUUID(), user: u, amount, ratio, paid: false };
        });
        // 結算以「付最多的人」為代墊人
        payload.paidBy = members.reduce(
          (best, u) => ((paidAmounts[u] || 0) > (paidAmounts[best] || 0) ? u : best), members[0]);
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

  // MARK: Render

  return (
    <Sheet onClose={onClose} tall>
      <SheetNav
        title={isEditing ? '編輯記錄' : '新增記錄'}
        left={<NavButton onClick={onClose}>取消</NavButton>}
        right={<NavButton strong disabled={!canSave || saving} onClick={save}>儲存</NavButton>}
      />

      <div className="px-[22px] pt-1.5 pb-[calc(28px+env(safe-area-inset-bottom))] flex flex-col gap-3.5">
        {/* 大金額 */}
        <button type="button" onClick={() => setKpCollapsed(false)}
          className="w-full flex flex-col items-center py-1.5">
          <span className="flex items-baseline gap-1 max-w-full font-rounded">
            <span className="text-[22px] font-bold text-ww-brand">NT$</span>
            <span className={`font-extrabold text-ww-ink tabular-nums truncate ${
              costDisplay(expr).length > 11 ? 'text-[30px]' : costDisplay(expr).length > 7 ? 'text-[40px]' : 'text-[50px]'
            } leading-[1.15]`}>
              {costDisplay(expr)}
            </span>
          </span>
          {hasCalc(expr) ? (
            <span className="text-[15px] font-bold font-rounded text-ww-brand">= {money(cost)}</span>
          ) : kpCollapsed && (
            <span className="text-[11px] text-ww-faint">點擊編輯金額</span>
          )}
        </button>

        {/* 類型 chips */}
        <div className="ww-noscroll flex gap-2 overflow-x-auto px-0.5 -mx-0.5">
          {types.map(t => {
            const active = form.type === t.id;
            return (
              <button key={t.id} type="button" onClick={() => set('type', t.id)}
                className={`shrink-0 inline-flex items-center gap-[5px] px-[13px] py-2 rounded-full border
                            text-[13px] font-semibold ${
                  active ? 'text-white border-transparent' : 'bg-ww-card border-ww-line2 text-ww-ink2'
                }`}
                style={active ? { backgroundColor: t.color } : undefined}>
                <TypeIcon icon={t.icon} size={13} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 計算機鍵盤 */}
        {!kpCollapsed && (
          <>
            <div className="bg-ww-card rounded-[18px] p-2.5 select-none">
              {KEY_ROWS.map(row => (
                <div key={row.join('')} className="flex">
                  {row.map(k => {
                    const isOp = OPS.includes(k) || k === '⌫';
                    return (
                      <button key={k} type="button" onClick={() => press(k)}
                        aria-label={k === '⌫' ? '刪除' : k}
                        className={`flex-1 h-[50px] flex items-center justify-center rounded-xl
                                    text-[21px] font-bold font-rounded active:bg-ww-seg ${
                          isOp ? 'text-ww-brand' : 'text-ww-ink'
                        }`}>
                        {k === '⌫' ? <Delete size={22} strokeWidth={2.2} /> : k}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <button type="button" onClick={confirmAmount}
              className="h-[50px] rounded-ww-inner bg-ww-brand text-white text-[16px] font-bold
                         flex items-center justify-center gap-2
                         shadow-[0_6px_8px_rgba(110,146,102,.45)] active:opacity-80">
              <Check size={18} strokeWidth={3} /> 確認金額
            </button>
          </>
        )}

        {/* 欄位卡 */}
        <Card border={false}>
          <div className="py-[13px]">
            <div className="flex items-center">
              <FieldLabel>商家</FieldLabel>
              <input
                value={form.vendor} onChange={e => set('vendor', e.target.value)}
                onFocus={() => setVendorFocused(true)} onBlur={() => setVendorFocused(false)}
                placeholder="例：特斯拉超充" className="ww-plain-input"
              />
            </div>
            {vendorFocused && vendorSug.length > 0 && (
              <div className="ww-noscroll flex gap-1.5 overflow-x-auto mt-2 pb-0.5">
                {vendorSug.map(v => (
                  <button key={v} type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { set('vendor', v); document.activeElement?.blur(); }}
                    className="shrink-0 px-[11px] py-[5px] rounded-full bg-ww-seg text-[12px] text-ww-ink2">
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Divider />

          <div className="flex items-center justify-between py-[13px]">
            <FieldLabel>日期</FieldLabel>
            <div className="flex items-center gap-3.5">
              <button type="button" onClick={() => shiftDate(-1)} aria-label="前一天">
                <ChevronLeft size={16} strokeWidth={3} className="text-ww-faint" />
              </button>
              <span className="relative text-[14px] font-semibold text-ww-ink">
                {dateLabel}
                <input
                  type="datetime-local" value={form.date} max={nowLocal()} aria-label="選擇日期"
                  onChange={e => e.target.value && set('date', e.target.value)}
                  onClick={e => e.currentTarget.showPicker?.()}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </span>
              <button type="button" onClick={() => shiftDate(1)} disabled={dateDays >= 0} aria-label="後一天">
                <ChevronRight size={16} strokeWidth={3}
                  className={dateDays >= 0 ? 'text-ww-line2' : 'text-ww-faint'} />
              </button>
            </div>
          </div>

          {form.type === 'charging' && (
            <>
              <Divider />
              <div className="flex items-center py-[13px]">
                <FieldLabel>充電度數</FieldLabel>
                <input
                  inputMode="decimal" value={form.kwh} placeholder="kWh"
                  onChange={e => set('kwh', e.target.value.replace(/[^0-9.]/g, ''))}
                  className="ww-plain-input"
                />
              </div>
            </>
          )}

          <Divider />
          <div className="flex items-center py-[13px]">
            <FieldLabel>里程數</FieldLabel>
            <input
              inputMode="numeric" value={form.mileage} placeholder="km（選填）"
              onChange={e => set('mileage', e.target.value)} className="ww-plain-input"
            />
          </div>

          <Divider />
          <div className="flex items-center py-[13px]">
            <FieldLabel>備註</FieldLabel>
            <input
              value={form.note} placeholder="選填"
              onChange={e => set('note', e.target.value)} className="ww-plain-input"
            />
          </div>

          {vehicles.length > 1 && (
            <>
              <Divider />
              <div className="flex items-center justify-between py-[13px]">
                <FieldLabel>車輛</FieldLabel>
                <select value={form.vehicleId} onChange={e => set('vehicleId', e.target.value)}
                  className="bg-transparent text-right text-[14px] font-semibold text-ww-ink outline-none max-w-[60%]"
                  dir="rtl">
                  <option value="">未指定</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name || v.licensePlate}</option>)}
                </select>
              </div>
            </>
          )}
        </Card>

        {members.length > 1 && (
          <>
            {/* 分攤開關 */}
            <Card border={false} padX={false} className="p-[15px] flex items-center justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold text-ww-ink">分攤支出</div>
                <div className="mt-0.5 text-[11.5px] text-ww-sub">
                  {splitEnabled ? `${splitMethodLabel(splitMethod)} · 由代墊人先付` : '此筆由付款人全額負擔'}
                </div>
              </div>
              <Toggle on={splitEnabled} onChange={toggleSplit} label="分攤支出" />
            </Card>

            {!splitEnabled ? (
              /* 誰的支出 */
              <Card border={false} className="pb-1.5">
                <div className="pt-[11px] pb-1.5 text-[11px] font-bold text-ww-sub">誰的支出？</div>
                {members.map(u => (
                  <button key={u} type="button" onClick={() => set('user', u)}
                    className="w-full flex items-center gap-[11px] py-[9px] text-left">
                    <UserAvatar name={u} />
                    <span className="text-[14px] font-semibold text-ww-ink">{u}</span>
                    {form.user === u && <Check size={16} strokeWidth={3} className="ml-auto text-ww-brand" />}
                  </button>
                ))}
              </Card>
            ) : (
              <>
                {/* 分攤方法 */}
                <Card border={false} padX={false} className="p-3.5">
                  <div className="flex items-center justify-between pb-3">
                    <span className="text-[12px] font-bold text-ww-ink">分攤方法</span>
                    <Segmented
                      options={[['equal', '均分'], ['ratio', '比例'], ['amount', '金額']]}
                      value={splitMethod} onChange={changeMethod}
                    />
                  </div>

                  {members.map(u => (
                    <div key={u} className="flex items-center gap-[11px] py-2">
                      <UserAvatar name={u} />
                      <span className="text-[13.5px] font-semibold text-ww-ink truncate">{u}</span>
                      <div className="ml-auto flex items-center gap-2 shrink-0">
                        {splitMethod === 'equal' && (
                          <span className="text-[13px] font-semibold text-ww-sub tabular-nums">
                            {money(cost / count)}
                          </span>
                        )}
                        {splitMethod === 'ratio' && (
                          <>
                            <StepButton size={26} onClick={() => adjustRatio(u, -5)}>−</StepButton>
                            <span className="w-10 text-center text-[13px] font-bold font-rounded text-ww-ink tabular-nums">
                              {Math.round((splitRatios[u] || 0) * 100)}%
                            </span>
                            <StepButton size={26} onClick={() => adjustRatio(u, 5)}>+</StepButton>
                            <span className="w-[52px] text-right text-[11px] text-ww-sub tabular-nums">
                              {money(cost * (splitRatios[u] || 0))}
                            </span>
                          </>
                        )}
                        {splitMethod === 'amount' && (
                          <AmountInput
                            value={splitAmounts[u] || 0} width={64}
                            remainder={cost - (amountTotal - (splitAmounts[u] || 0))}
                            othersFilled={amountTotal - (splitAmounts[u] || 0) > 0}
                            onChange={v => setSplitAmounts(a => ({ ...a, [u]: v }))}
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  {splitMethod === 'amount' && !amountValid && (
                    <SplitError>各人金額合計 {money(amountTotal)}，應為 {money(cost)}</SplitError>
                  )}
                  {splitMethod === 'ratio' && !ratioValid && (
                    <SplitError>比例合計 {Math.round(ratioTotal * 100)}%，應為 100%</SplitError>
                  )}
                </Card>

                {/* 誰代墊了多少錢 */}
                <Card border={false} padX={false} className="p-3.5">
                  <div className="pb-2 text-[12px] font-bold text-ww-ink">誰代墊了多少錢？</div>
                  {members.map(u => (
                    <div key={u} className="flex items-center gap-[11px] py-2">
                      <UserAvatar name={u} />
                      <span className="text-[13.5px] font-semibold text-ww-ink truncate">{u}</span>
                      <div className="ml-auto flex items-center gap-2 shrink-0">
                        <AmountInput
                          value={paidAmounts[u] || 0} width={72}
                          remainder={cost - (paidTotal - (paidAmounts[u] || 0))}
                          othersFilled={paidTotal - (paidAmounts[u] || 0) > 0}
                          onChange={v => setPaidAmounts(a => ({ ...a, [u]: v }))}
                        />
                      </div>
                    </div>
                  ))}

                  {!paidValid && (
                    <SplitError>代墊合計 {money(paidTotal)}，應為 {money(cost)}</SplitError>
                  )}
                  {Object.values(paidAmounts).filter(v => v > 0).length > 1 && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ww-sub">
                      <Info size={12} className="text-ww-toll shrink-0" />
                      結算以「付最多的人」為代墊人，建議一筆由一人代墊
                    </div>
                  )}
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}

const FieldLabel = ({ children }) => (
  <span className="w-16 shrink-0 text-[13px] text-ww-sub">{children}</span>
);

/** 金額輸入框；其他人已填、自己還是 0 時顯示「餘額」一鍵帶入剩餘金額 */
function AmountInput({ value, width, remainder, othersFilled, onChange }) {
  return (
    <>
      {value === 0 && othersFilled && remainder > 0 && (
        <button type="button" onClick={() => onChange(remainder)}
          className="px-2 py-[3px] rounded-full bg-ww-toll text-white text-[10px] font-bold">
          餘額
        </button>
      )}
      <span className="text-[12px] text-ww-sub">NT$</span>
      <input
        inputMode="numeric" placeholder="0"
        value={value ? trimZero(Math.round(value * 100) / 100) : ''}
        onChange={e => onChange(Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
        className="px-2 py-[5px] rounded-lg bg-ww-field border border-ww-line2 text-right
                   text-[13px] font-semibold font-rounded text-ww-ink outline-none focus:border-ww-brand"
        style={{ width: width + 16 }}
      />
    </>
  );
}

function SplitError({ children }) {
  return (
    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-ww-danger">
      <AlertTriangle size={12} className="shrink-0" />
      {children}
    </div>
  );
}
