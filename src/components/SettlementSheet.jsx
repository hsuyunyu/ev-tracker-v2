import React, { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Circle, Clock, BadgeCheck, Trash2 } from 'lucide-react';
import { buildTypeMap } from '../typeConfig';
import {
  unsettledSplitRecords, calcBalance, pendingSettlement, isSettled, todayLocal,
} from '../split';
import { fmtInt, shortDate, splitMethodLabel } from '../format';
import { Sheet } from './ui';

/**
 * 結帳管理 —— 對應 iOS SettlementView。
 * 深色待結清卡 + 勾選清單 + 結帳記錄 + 底部固定的「建立結算」。
 */
export default function SettlementSheet({
  records, settlements, settings, onClose, onCreate, onMarkSettled, onDelete,
}) {
  const typeMap = buildTypeMap(settings.definedTypes);
  const open    = useMemo(() => unsettledSplitRecords(records, settlements), [records, settlements]);
  const pending = pendingSettlement(settlements);

  // 預設全選；記錄被結算或刪除後自動從勾選中移除
  const [selected, setSelected] = useState(() => new Set(open.map(r => r.id)));
  useEffect(() => {
    const ids = new Set(open.map(r => r.id));
    setSelected(s => new Set([...s].filter(id => ids.has(id))));
  }, [open]);

  const selectedRecords = open.filter(r => selected.has(r.id));
  const balance = calcBalance(selectedRecords, settings.definedUsers);
  const amount  = balance?.amount ?? 0;
  const nextSeq = Math.max(0, ...settlements.map(s => s.sequenceNumber || 0)) + 1;

  const allIds   = open.map(r => r.id);
  const monthIds = open.filter(r => r.date?.startsWith(todayLocal().slice(0, 7))).map(r => r.id);
  const sameSet  = (ids) => ids.length > 0 && ids.length === selected.size && ids.every(id => selected.has(id));

  const toggle = (id) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const canCreate = !pending && amount > 0;
  const buttonText = pending ? '尚有待確認付款的結算'
    : amount <= 0 ? '勾選要結清的費用'
    : `建立第 ${nextSeq} 次結算（NT$${fmtInt(amount)}）`;

  const create = () => {
    if (!canCreate) return;
    const msg = `${balance.debtor} 需還給 ${balance.creditor} NT$${fmtInt(amount)}（勾選 ${selectedRecords.length} 筆）。\n`
      + '建立後請至「結帳記錄」確認付款。';
    if (window.confirm(`建立第 ${nextSeq} 次結算？\n\n${msg}`)) onCreate(selectedRecords);
  };

  const markSettled = (s) => {
    const msg = `確認：${s.debtorUser} 已還 ${s.creditorUser} NT$${fmtInt(s.amount)}？\n\n`
      + '確認後此筆結算將標記為已結清，不可撤銷。';
    if (window.confirm(msg)) onMarkSettled(s);
  };

  return (
    <Sheet
      onClose={onClose} tall
      footer={
        <div className="px-[22px] pt-3 pb-[calc(22px+env(safe-area-inset-bottom))] bg-ww-bg border-t border-ww-line">
          <button onClick={create} disabled={!canCreate}
            className={`w-full h-[52px] rounded-ww-inner text-white text-[16px] font-bold ${
              canCreate ? 'bg-ww-brand active:opacity-80' : 'bg-ww-line2'
            }`}>
            {buttonText}
          </button>
        </div>
      }
    >
      <div className="sticky top-0 z-10 bg-ww-bg grid grid-cols-[1fr_auto_1fr] items-center px-[22px] pt-[18px] pb-2">
        <div className="justify-self-start">
          <button onClick={onClose} className="text-[14px] font-semibold text-ww-sub">關閉</button>
        </div>
        <div className="text-[16px] font-extrabold text-ww-ink">結帳管理</div>
      </div>

      <div className="px-[22px] pt-1.5 pb-6">
        {/* 深色待結清卡 */}
        <div className="rounded-[22px] bg-[#28231C] p-5 mb-[18px]">
          <div className="text-[12px] text-[#B6AE9E]">目前待結清</div>
          <div className="mt-1.5 text-[30px] leading-tight font-extrabold font-rounded text-white tabular-nums">
            NT${fmtInt(amount)}
          </div>
          <div className="mt-[3px] text-[13px] text-[#B6AE9E]">
            {amount > 0 ? `${balance.debtor} 還需付給 ${balance.creditor} NT$${fmtInt(amount)}` : '已全部結清'}
          </div>
          {pending && (
            <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#D8D1C2]">
              <Clock size={12} className="text-ww-toll" fill="currentColor" stroke="#28231C" />
              第 {pending.sequenceNumber} 次結算待確認付款
            </div>
          )}
        </div>

        {open.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 py-[30px] text-ww-brand">
            <BadgeCheck size={34} />
            <span className="text-[14px] font-semibold">全部已結清</span>
          </div>
        ) : (
          <>
            <div className="text-[13px] font-bold text-ww-sub pb-2">勾選要結清的費用</div>

            <div className="flex items-center gap-[7px] pb-2.5">
              <QuickChip active={sameSet(allIds)} onClick={() => setSelected(new Set(allIds))}>全選</QuickChip>
              <QuickChip active={sameSet(monthIds)} onClick={() => setSelected(new Set(monthIds))}>當月</QuickChip>
              <QuickChip onClick={() => setSelected(new Set())}>清除</QuickChip>
              <span className="ml-auto text-[11px] text-ww-sub">已選 {selected.size}/{open.length}</span>
            </div>

            {open.map(r => {
              const on = selected.has(r.id);
              const t = typeMap[r.type];
              return (
                <button key={r.id} onClick={() => toggle(r.id)}
                  className="w-full mb-2.5 flex items-center gap-[13px] p-3.5 bg-ww-card rounded-ww-sm text-left">
                  {on
                    ? <CheckCircle2 size={24} className="text-ww-brand shrink-0" fill="currentColor" stroke="rgb(var(--ww-card))" />
                    : <Circle size={24} className="text-ww-line2 shrink-0" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-ww-ink truncate">
                      {r.vendor || t?.label || r.type}
                    </span>
                    <span className="block mt-0.5 text-[11.5px] text-ww-sub">
                      {shortDate(r.date)} · {splitMethodLabel(r.splitMethod)}
                    </span>
                  </span>
                  <span className="text-[15px] font-extrabold font-rounded text-ww-ink tabular-nums shrink-0">
                    NT${fmtInt(r.cost)}
                  </span>
                </button>
              );
            })}
          </>
        )}

        {/* 結帳記錄 */}
        {settlements.length > 0 && (
          <>
            <div className="text-[13px] font-bold text-ww-sub pt-[18px] pb-2">結帳記錄</div>
            {settlements.map(s => {
              const done = isSettled(s);
              return (
                <div key={s.id}
                  className={`mb-2.5 flex items-center gap-3 p-3.5 bg-ww-card rounded-ww-sm ${done ? 'opacity-[0.92]' : ''}`}>
                  <span className={`w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0 ${
                    done ? 'bg-ww-brand/[0.12] text-ww-brand' : 'bg-ww-toll/[0.12] text-ww-toll'
                  }`}>
                    {done ? <Check size={16} strokeWidth={3} /> : <Clock size={16} strokeWidth={2.6} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-ww-ink truncate">
                      第 {s.sequenceNumber} 次結算 · {shortDate(s.createdAt)}
                    </span>
                    <span className="block mt-0.5 text-[11.5px] text-ww-sub truncate">
                      {s.debtorUser} → {s.creditorUser}{done ? '' : ' · 待確認付款'}
                    </span>
                  </span>
                  <span className={`text-[15px] font-extrabold font-rounded tabular-nums shrink-0 ${
                    done ? 'text-ww-brand' : 'text-ww-ink'
                  }`}>
                    NT${fmtInt(s.amount)}
                  </span>
                  {!done && (
                    <button onClick={() => markSettled(s)}
                      className="px-2.5 py-1.5 rounded-full bg-ww-brand text-white text-[11px] font-bold shrink-0">
                      確認付款
                    </button>
                  )}
                  <button onClick={() => onDelete(s)} aria-label="刪除結算"
                    className="text-ww-faint hover:text-ww-danger shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </Sheet>
  );
}

function QuickChip({ children, active = false, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-[5px] rounded-full text-[12px] font-semibold ${
        active ? 'bg-ww-brand text-white' : 'bg-ww-brand/[0.12] text-ww-brand'
      }`}>
      {children}
    </button>
  );
}
