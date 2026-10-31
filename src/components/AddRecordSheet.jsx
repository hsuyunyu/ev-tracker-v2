import React, { useEffect, useRef, useState } from 'react';
import { Delete, AlertTriangle, Info, CalendarDays } from 'lucide-react';
import { resolveTypes, TypeIcon } from '../typeConfig';
import { fmtInt, money, trimZero, parseLocal, nowLocal, daysFromToday } from '../format';
import { Card, Divider, NavButton, Sheet, SheetNav, UserAvatar } from './ui';

/**
 * 記帳 sheet —— 對應 iOS AddRecordView，2026-11-01 改成和罐罐帳網頁版一樣的操作：
 * 上方固定「取消／儲存」；大金額 + 計算機（先乘除後加減、整數、清除、＝／完成）；類型 chips 在計算機下面；
 * 欄位卡（商家、度數、里程、車輛）；日期（日期選擇器，可選未來，不顯示時間）與備註並排、備註會跳出以前打過的；
 * 「誰付的」（可以多人付）＋「怎麼分」（均分／比例／指定金額／不分，均分可只勾部分的人）。
 *
 * ⚠️ 存進 Firestore 的欄位與型別必須和 iOS ExpenseRecord 一致（iOS 沒改）：
 * - date 仍是「YYYY-MM-DDTHH:mm」，畫面上只選日期，時間沿用原本的（新增時是現在的時間）
 * - 分攤仍是 splitMethod + splitEntries（每人 amount、ratio），iOS 結算看 paidBy 與 entries 的 amount，
 *   均分只勾部分的人時，entries 只放有參與的人
 * - 多人付：iOS 只有一個 paidBy，所以和以前一樣存「付最多的人」
 */

// MARK: - 計算機（與罐罐帳 src/core/calc.js 相同：先乘除後加減，結果四捨五入成整數）

const OPS = '+−×÷';
const KEYS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '.', '0', '⌫', '+'];
const MAX_LENGTH = 24;
const lastSegment = (e) => e.split(/[+−×÷]/).pop() ?? '';

/** 算出結果；算不出來（空的、除以零、不是正數）回傳 0。 */
export function evalExpr(raw) {
  const cleaned = raw.replace(/[+−×÷.]+$/, '');
  if (!cleaned) return 0;
  const numbers = cleaned.split(/[+−×÷]/).map(Number);
  const operators = cleaned.split('').filter((c) => OPS.includes(c));
  if (numbers.some((v) => !Number.isFinite(v)) || numbers.length !== operators.length + 1) return 0;
  const terms = [numbers[0]];
  const signs = [];
  operators.forEach((op, i) => {
    const next = numbers[i + 1];
    if (op === '×') terms[terms.length - 1] *= next;
    else if (op === '÷') terms[terms.length - 1] = next === 0 ? NaN : terms[terms.length - 1] / next;
    else { signs.push(op); terms.push(next); }
  });
  const total = terms.slice(1).reduce((sum, t, i) => (signs[i] === '+' ? sum + t : sum - t), terms[0]);
  const rounded = Math.round(total);
  return Number.isFinite(total) && rounded > 0 ? rounded : 0;
}

const hasCalc = (e) => [...OPS].some((op) => e.includes(op));

function pressKey(expr, k) {
  if (k === 'C') return '';
  if (k === '⌫') return expr.slice(0, -1);
  if (k === '=') { const v = evalExpr(expr); return v ? String(v) : expr; }
  if (OPS.includes(k)) {
    if (!expr) return '';
    return OPS.includes(expr.at(-1)) ? expr.slice(0, -1) + k : expr + k;
  }
  if (expr.length >= MAX_LENGTH) return expr;
  const seg = lastSegment(expr);
  if (k === '.') return seg.includes('.') ? expr : seg === '' ? `${expr}0.` : `${expr}.`;
  if (seg.replace('.', '').length >= 9) return expr;
  return seg === '0' ? expr.slice(0, -1) + k : expr + k;
}

function costDisplay(e) {
  if (!e) return '0';
  if (hasCalc(e)) return e.replace(/([+−×÷])/g, ' $1 ').trim();
  const [int, dec] = e.split('.');
  const grouped = fmtInt(Number(int) || 0);
  return dec === undefined ? grouped : `${grouped}.${dec}`;
}

// 實體鍵盤 → 計算機按鍵（桌機用）
const KEYBOARD_MAP = { '*': '×', x: '×', X: '×', '/': '÷', '-': '−', '+': '+', '.': '.', Backspace: '⌫' };

/** 依權重把 total 元拆到分，加總剛好等於 total（最大餘數法）。 */
function allocate(total, weights) {
  const cents = Math.round(total * 100);
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (cents * w) / sum);
  const out = exact.map(Math.floor);
  let left = cents - out.reduce((a, b) => a + b, 0);
  const order = exact.map((v, i) => [i, v - Math.floor(v)]).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  for (let i = 0; left > 0; i += 1, left -= 1) out[order[i % order.length][0]] += 1;
  return out.map((c) => c / 100);
}

const METHODS = [['equal', '均分'], ['ratio', '比例'], ['amount', '指定金額'], ['none', '不分']];

// MARK: - 元件

export default function AddRecordSheet({
  record, isEditing = false, settings, vehicles = [], pastVendors = [], pastNotes = [], onClose, onSave,
}) {
  const types   = resolveTypes(settings.definedTypes);
  const members = settings.definedUsers ?? [];
  const multi   = members.length > 1;

  const [form, setForm] = useState(() => ({
    type: record.type, date: record.date, vendor: record.vendor ?? '',
    kwh: record.kwh > 0 ? trimZero(record.kwh) : '',
    mileage: String(record.mileage ?? ''), note: record.note ?? '',
    vehicleId: record.vehicleId ?? '',
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const initCost = record.cost > 0 ? record.cost : 0;
  const [expr, setExpr] = useState(initCost ? trimZero(Math.round(initCost)) : '');
  const [kpCollapsed, setKpCollapsed] = useState(initCost > 0);
  const cost = expr ? evalExpr(expr) : 0;

  // MARK: 誰付的、怎麼分

  const [payer, setPayer] = useState(record.paidBy || record.user || members[0] || '');
  const [multiPay, setMultiPay] = useState(false);
  const [paidAmounts, setPaidAmounts] = useState({});

  // 編輯既有分攤 → 沿用；新增 → 設定裡的預設分攤（成員與分攤頁）；都沒有就不分
  const existingSplit = record.splitMethod && record.splitMethod !== 'none' && record.splitEntries?.length > 0;
  const [method, setMethod] = useState(() => {
    if (!multi) return 'none';
    if (existingSplit) return record.splitMethod;
    if (!isEditing && settings.defaultSplitEnabled) return settings.defaultSplitMethod || 'equal';
    return 'none';
  });
  // 均分：有參與的人
  const [joined, setJoined] = useState(() => new Set(
    existingSplit && record.splitMethod === 'equal' ? record.splitEntries.map(e => e.user) : members));
  // 比例：每人輸入的數字（例如 6、4）
  const [ratioInputs, setRatioInputs] = useState(() => {
    const from = existingSplit && record.splitMethod === 'ratio'
      ? Object.fromEntries(record.splitEntries.map(e => [e.user, Math.round((e.ratio || 0) * 100)]))
      : Object.fromEntries((settings.defaultSplitRules ?? []).map(r => [r.user, Math.round((r.ratio || 0) * 100)]));
    return Object.fromEntries(members.map(u => [u, from[u] ? String(from[u]) : '1']));
  });
  // 指定金額：每人輸入的金額
  const [amountInputs, setAmountInputs] = useState(() => Object.fromEntries(members.map(u => {
    const e = existingSplit && record.splitMethod === 'amount' ? record.splitEntries.find(x => x.user === u) : null;
    return [u, e?.amount ? Math.round(e.amount) : 0];
  })));

  const sum = (map) => members.reduce((s, u) => s + (Number(map[u]) || 0), 0);
  const amountTotal = sum(amountInputs);
  const paidTotal   = sum(paidAmounts);
  const ratioWeights = members.map(u => Number(ratioInputs[u]) || 0);

  const splitError =
    method === 'equal' && joined.size === 0 ? '至少要有一個人分攤'
      : method === 'ratio' && ratioWeights.every(w => w === 0) ? '比例至少要有一個人大於 0'
        : method === 'amount' && Math.abs(amountTotal - cost) >= 0.5 ? `各人金額合計 ${money(amountTotal)}，應為 ${money(cost)}`
          : '';
  const paidError = multiPay && Math.abs(paidTotal - cost) >= 0.5 ? `代墊合計 ${money(paidTotal)}，應為 ${money(cost)}` : '';
  const canSave = cost > 0 && !splitError && !paidError;

  // 每個人分攤多少（預覽與存檔用同一份）
  const shares = (() => {
    if (method === 'equal') {
      const list = members.filter(u => joined.has(u));
      return Object.fromEntries(list.map((u, i) => [u, allocate(cost, list.map(() => 1))[i]]));
    }
    if (method === 'ratio') {
      const amounts = allocate(cost, ratioWeights);
      return Object.fromEntries(members.map((u, i) => [u, amounts[i]]).filter(([, v]) => v > 0));
    }
    if (method === 'amount') return Object.fromEntries(members.map(u => [u, Number(amountInputs[u]) || 0]).filter(([, v]) => v > 0));
    return {};
  })();

  // MARK: 計算機

  // 連續快速按鍵時 state 還沒更新，用 ref 取得最新算式才不會漏鍵
  const exprRef = useRef(expr);
  const updateExpr = (e) => { exprRef.current = e; setExpr(e); };
  const press = (k) => updateExpr(pressKey(exprRef.current, k));
  const finish = () => {
    if (hasCalc(exprRef.current)) { press('='); return; }
    setKpCollapsed(true);
  };

  // 桌機：鍵盤可直接輸入金額（焦點不在文字欄位時）
  useEffect(() => {
    if (kpCollapsed) return undefined;
    const onKey = (ev) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(ev.target?.tagName)) return;
      if (ev.key === 'Enter') { ev.preventDefault(); finish(); return; }
      const k = /^[0-9]$/.test(ev.key) ? ev.key : KEYBOARD_MAP[ev.key];
      if (!k) return;
      ev.preventDefault();
      press(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // MARK: 日期（只選日期；時間沿用原本的，新增時是現在的時間）

  const dateDays = daysFromToday(form.date);
  const dateLabel = dateDays === 0 ? '今天' : dateDays === -1 ? '昨天' : dateDays === 1 ? '明天'
    : (() => { const d = parseLocal(form.date); return `${d.getMonth() + 1}月${d.getDate()}日`; })();
  const pickDate = (value) => {
    if (!value) return;
    const time = String(form.date).slice(11) || nowLocal().slice(11);
    set('date', `${value}T${time}`);
  };

  // MARK: 商家與備註建議

  const [vendorFocused, setVendorFocused] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);
  const vendorSug = pastVendors.filter(v => v !== form.vendor && (!form.vendor || v.includes(form.vendor))).slice(0, 4);
  const noteSug = pastNotes.filter(n => n !== form.note && (!form.note || n.includes(form.note))).slice(0, 6);

  // MARK: 儲存

  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      // 多人付：iOS 只有一個 paidBy，存付最多的人（與以前相同）
      const paidBy = multiPay
        ? members.reduce((best, u) => ((Number(paidAmounts[u]) || 0) > (Number(paidAmounts[best]) || 0) ? u : best), members[0])
        : payer;
      // 欄位名稱與型別必須與 iOS ExpenseRecord 一致（mileage 存字串）
      const payload = {
        type: form.type,
        vendor: form.vendor.trim(),
        cost,
        kwh: form.type === 'charging' ? (Number(form.kwh) || 0) : 0,
        user: paidBy,
        vehicleId: form.vehicleId || '',
        note: form.note,
        mileage: String(form.mileage ?? ''),
        expiryDate: record.expiryDate ?? '',
        date: form.date,
        paidBy,
      };
      if (method !== 'none' && multi) {
        payload.splitMethod = method;
        payload.splitEntries = Object.entries(shares).map(([user, amount]) => ({
          id: crypto.randomUUID(), user, amount,
          // ratio 儲存規則與 iOS 一致：佔總額的比例
          ratio: cost > 0 ? amount / cost : 0,
          paid: false,
        }));
      } else {
        payload.splitMethod = 'none';
        payload.splitEntries = [];
      }
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  // MARK: Render

  const remainderOf = (map, u) => cost - (sum(map) - (Number(map[u]) || 0));
  const othersFilledOf = (map, u) => sum(map) - (Number(map[u]) || 0) > 0;

  return (
    <Sheet onClose={onClose} tall>
      <SheetNav
        title={isEditing ? '編輯記錄' : '新增記錄'}
        left={<NavButton onClick={onClose}>取消</NavButton>}
        right={<NavButton strong disabled={!canSave || saving} onClick={save}>儲存</NavButton>}
      />

      <div className="px-[22px] pt-1.5 pb-[calc(28px+env(safe-area-inset-bottom))] flex flex-col gap-3.5">
        {/* 大金額：點一下打開計算機 */}
        <button type="button" onClick={() => setKpCollapsed(false)} className="w-full flex flex-col items-center py-1.5">
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

        {/* 計算機：和罐罐帳相同的排列；最下面「清除」與「＝／完成」 */}
        {!kpCollapsed && (
          <div className="grid grid-cols-4 gap-2 select-none">
            {KEYS.map(k => {
              const isOp = OPS.includes(k);
              return (
                <button key={k} type="button" onClick={() => press(k)} aria-label={k === '⌫' ? '刪除' : k}
                  className={`h-[50px] flex items-center justify-center rounded-xl text-[21px] font-bold font-rounded active:scale-95 ${
                    isOp ? 'bg-ww-seg text-ww-brand' : 'bg-ww-card text-ww-ink'}`}>
                  {k === '⌫' ? <Delete size={22} strokeWidth={2.2} /> : k}
                </button>
              );
            })}
            <button type="button" onClick={() => press('C')}
              className="h-[50px] rounded-xl bg-ww-card text-[15px] font-semibold text-ww-sub active:scale-95">清除</button>
            <button type="button" onClick={finish}
              className="col-span-3 h-[50px] rounded-xl bg-ww-brand text-white text-[17px] font-bold active:opacity-80">
              {hasCalc(expr) ? '=' : '完成'}
            </button>
          </div>
        )}

        {/* 類型 chips：放在計算機下面，換行排列 */}
        <div className="flex flex-wrap gap-2">
          {types.map(t => {
            const active = form.type === t.id;
            return (
              <button key={t.id} type="button" onClick={() => set('type', t.id)}
                className={`shrink-0 inline-flex items-center gap-[5px] px-[13px] py-2 rounded-full border text-[13px] font-semibold ${
                  active ? 'text-white border-transparent' : 'bg-ww-card border-ww-line2 text-ww-ink2'}`}
                style={active ? { backgroundColor: t.color } : undefined}>
                <TypeIcon icon={t.icon} size={13} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 欄位卡 */}
        <Card border={false}>
          <div className="py-[13px]">
            <div className="flex items-center">
              <FieldLabel>商家</FieldLabel>
              <input value={form.vendor} onChange={e => set('vendor', e.target.value)}
                onFocus={() => setVendorFocused(true)} onBlur={() => setVendorFocused(false)}
                placeholder="例：特斯拉超充" className="ww-plain-input" />
            </div>
            {vendorFocused && vendorSug.length > 0 && (
              <Suggestions items={vendorSug} onPick={v => set('vendor', v)} />
            )}
          </div>
          {form.type === 'charging' && (
            <>
              <Divider />
              <div className="flex items-center py-[13px]">
                <FieldLabel>充電度數</FieldLabel>
                <input inputMode="decimal" value={form.kwh} placeholder="kWh"
                  onChange={e => set('kwh', e.target.value.replace(/[^0-9.]/g, ''))} className="ww-plain-input" />
              </div>
            </>
          )}
          <Divider />
          <div className="flex items-center py-[13px]">
            <FieldLabel>里程數</FieldLabel>
            <input inputMode="numeric" value={form.mileage} placeholder="km（選填）"
              onChange={e => set('mileage', e.target.value)} className="ww-plain-input" />
          </div>
          {vehicles.length > 1 && (
            <>
              <Divider />
              <div className="flex items-center justify-between py-[13px]">
                <FieldLabel>車輛</FieldLabel>
                <select value={form.vehicleId} onChange={e => set('vehicleId', e.target.value)}
                  className="bg-transparent text-right text-[14px] font-semibold text-ww-ink outline-none max-w-[60%]" dir="rtl">
                  <option value="">未指定</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name || v.licensePlate}</option>)}
                </select>
              </div>
            </>
          )}
        </Card>

        {/* 日期與備註並排 */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0">
            <span className="text-[12px] text-ww-sub">日期</span>
            {/* 顯示自己排的文字，真正的日期欄位疊在上面設成透明（iPhone 的日期欄位有最小寬度會撐破版面） */}
            <span className="relative mt-1 flex h-11 items-center gap-2 rounded-xl bg-ww-card px-3">
              <CalendarDays size={16} className="shrink-0 text-ww-faint" />
              <span className="truncate text-[14px] font-semibold text-ww-ink">{dateLabel}</span>
              <input type="date" value={String(form.date).slice(0, 10)} aria-label="選擇日期"
                onChange={e => pickDate(e.target.value)}
                onClick={e => { try { e.currentTarget.showPicker?.(); } catch { /* 沒有就算了 */ } }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </span>
          </label>
          <label className="block min-w-0">
            <span className="text-[12px] text-ww-sub">備註</span>
            <input value={form.note} placeholder="選填" onChange={e => set('note', e.target.value)}
              onFocus={() => setNoteFocused(true)} onBlur={() => setNoteFocused(false)}
              className="mt-1 h-11 w-full rounded-xl bg-ww-card px-3 text-[14px] font-semibold text-ww-ink outline-none" />
          </label>
        </div>
        {noteFocused && noteSug.length > 0 && <Suggestions items={noteSug} onPick={n => set('note', n)} />}

        {multi && (
          <>
            {/* 誰付的：點一個人，或「多人付」 */}
            <Card border={false} className="pb-3">
              <div className="pt-[11px] pb-2 text-[12px] font-bold text-ww-ink">誰付的</div>
              <div className="flex flex-wrap gap-2">
                {members.map(u => (
                  <ChoiceChip key={u} active={!multiPay && payer === u} onClick={() => { setPayer(u); setMultiPay(false); }}>
                    <UserAvatar name={u} size={20} />{u}
                  </ChoiceChip>
                ))}
                <ChoiceChip active={multiPay} onClick={() => {
                  setMultiPay(true);
                  if (sum(paidAmounts) === 0) setPaidAmounts({ [payer]: cost });
                }}>多人付</ChoiceChip>
              </div>
              {multiPay && (
                <div className="mt-2">
                  {members.map(u => (
                    <div key={u} className="flex items-center gap-[11px] py-2">
                      <UserAvatar name={u} />
                      <span className="text-[13.5px] font-semibold text-ww-ink truncate">{u}</span>
                      <div className="ml-auto flex items-center gap-2 shrink-0">
                        <AmountInput value={Number(paidAmounts[u]) || 0} width={72}
                          remainder={remainderOf(paidAmounts, u)} othersFilled={othersFilledOf(paidAmounts, u)}
                          onChange={v => setPaidAmounts(a => ({ ...a, [u]: v }))} />
                      </div>
                    </div>
                  ))}
                  {paidError && <SplitError>{paidError}</SplitError>}
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ww-sub">
                    <Info size={12} className="text-ww-toll shrink-0" />
                    結算以「付最多的人」為代墊人（與 iOS 相同）
                  </div>
                </div>
              )}
            </Card>

            {/* 怎麼分 */}
            <Card border={false} padX={false} className="p-3.5">
              <div className="pb-2 text-[12px] font-bold text-ww-ink">怎麼分</div>
              <div className="flex flex-wrap gap-2">
                {METHODS.map(([key, label]) => (
                  <ChoiceChip key={key} active={method === key} onClick={() => setMethod(key)}>{label}</ChoiceChip>
                ))}
              </div>
              {method !== 'none' && members.map(u => (
                <div key={u} className="flex items-center gap-[11px] py-2">
                  <UserAvatar name={u} />
                  <span className="text-[13.5px] font-semibold text-ww-ink truncate">{u}</span>
                  <div className="ml-auto flex items-center gap-2 shrink-0">
                    {method === 'equal' && (
                      <input type="checkbox" checked={joined.has(u)} aria-label={`${u} 參與分攤`}
                        onChange={e => setJoined(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(u); else next.delete(u);
                          return next;
                        })}
                        className="h-5 w-5 accent-ww-brand" />
                    )}
                    {method === 'ratio' && (
                      <input inputMode="numeric" value={ratioInputs[u]} placeholder="比例" aria-label={`${u} 的比例`}
                        onChange={e => setRatioInputs(r => ({ ...r, [u]: e.target.value.replace(/\D/g, '') }))}
                        className="w-16 px-2 py-[5px] rounded-lg bg-ww-field border border-ww-line2 text-right text-[13px] font-semibold font-rounded text-ww-ink outline-none focus:border-ww-brand" />
                    )}
                    {method === 'amount' && (
                      <AmountInput value={Number(amountInputs[u]) || 0} width={64}
                        remainder={remainderOf(amountInputs, u)} othersFilled={othersFilledOf(amountInputs, u)}
                        onChange={v => setAmountInputs(a => ({ ...a, [u]: v }))} />
                    )}
                    <span className="w-[56px] text-right text-[12px] text-ww-sub tabular-nums">
                      {shares[u] ? money(shares[u]) : '—'}
                    </span>
                  </div>
                </div>
              ))}
              {method === 'none' && (
                <div className="mt-2 text-[11.5px] text-ww-sub">此筆由{multiPay ? '付款的人' : payer}自己負擔，不分攤</div>
              )}
              {splitError && <SplitError>{splitError}</SplitError>}
            </Card>
          </>
        )}
      </div>
    </Sheet>
  );
}

const FieldLabel = ({ children }) => (
  <span className="w-16 shrink-0 text-[13px] text-ww-sub">{children}</span>
);

function ChoiceChip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
        active ? 'border-ww-brand bg-ww-brand/10 text-ww-brand' : 'border-ww-line2 bg-ww-card text-ww-ink2'}`}>
      {children}
    </button>
  );
}

/** 以前打過的商家／備註，換行排列，點了帶入。onMouseDown 擋掉，才不會先失去焦點把清單收掉。 */
function Suggestions({ items, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map(v => (
        <button key={v} type="button" onMouseDown={e => e.preventDefault()}
          onClick={() => { onPick(v); document.activeElement?.blur(); }}
          className="px-[11px] py-[5px] rounded-full bg-ww-seg text-[12px] text-ww-ink2">
          {v}
        </button>
      ))}
    </div>
  );
}

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
        onChange={e => onChange(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
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
