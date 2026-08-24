import React, { useState, useMemo } from 'react';
import { ArrowLeft, Check, Trash2, CheckCircle2 } from 'lucide-react';
import {
  unsettledSplitRecords, calcBalance, pendingSettlement,
  balanceByUser, isSettled, ntd,
} from '../split';

/** 結清頁：對應 iOS SettlementView（待結清卡 + 勾選清單 + 結算記錄） */
export default function SettlementPage({
  records, settlements, settings, onBack, onCreate, onMarkSettled, onDelete,
}) {
  const open    = useMemo(() => unsettledSplitRecords(records, settlements), [records, settlements]);
  const pending = pendingSettlement(settlements);

  const [selected, setSelected] = useState(() => new Set(open.map(r => r.id)));

  const selectedRecords = open.filter(r => selected.has(r.id));
  const balance   = calcBalance(selectedRecords, settings.definedUsers);
  const perUser   = balanceByUser(selectedRecords);
  const history   = settlements.filter(s => isSettled(s));

  const toggle = (id) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const allSelected = open.length > 0 && selected.size === open.length;

  return (
    <div>
      <PageHeader title="分攤結清" onBack={onBack} />

      {/* 待確認付款 */}
      {pending && (
        <div className="bg-ww-ink text-ww-bg rounded-ww-lg p-5 mb-4">
          <div className="text-xs opacity-70 mb-1">待確認付款 · 第 {pending.sequenceNumber} 次結算</div>
          <div className="text-2xl font-bold mb-1">{ntd(pending.amount)}</div>
          <div className="text-sm opacity-80 mb-4">
            {pending.debtorUser} → {pending.creditorUser}　建立於 {pending.createdAt}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onMarkSettled(pending)}
              className="flex-1 bg-ww-brand hover:bg-ww-brandhover text-white py-2.5 rounded-ww-inner
                         text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Check size={16} /> 已完成付款
            </button>
            <button
              onClick={() => onDelete(pending)}
              className="px-4 py-2.5 rounded-ww-inner text-sm bg-white/10 hover:bg-white/20 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 目前餘額 */}
      {!pending && (
        <div className="bg-ww-greenbg border border-ww-greenline rounded-ww-lg p-5 mb-4">
          <div className="text-xs text-ww-greentitle font-medium mb-1">勾選記錄的結清金額</div>
          {balance ? (
            <>
              <div className="text-3xl font-bold text-ww-ink mb-1">{ntd(balance.amount)}</div>
              <div className="text-sm text-ww-ink2">
                <span className="font-semibold">{balance.debtor}</span> 應付給{' '}
                <span className="font-semibold">{balance.creditor}</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-ww-ink2 py-1">
              {open.length === 0 ? '沒有未結清的分攤記錄' : '勾選的記錄目前收支相抵'}
            </div>
          )}

          {Object.keys(perUser).length > 0 && (
            <div className="mt-4 pt-3 border-t border-ww-greenline space-y-1.5">
              {Object.entries(perUser).sort((a, b) => b[1] - a[1]).map(([u, v]) => (
                <div key={u} className="flex justify-between text-sm">
                  <span className="text-ww-ink2">{u}</span>
                  <span className={`font-medium tabular-nums ${v > 0.49 ? 'text-ww-brand' : v < -0.49 ? 'text-ww-danger' : 'text-ww-sub'}`}>
                    {v > 0 ? '+' : ''}{ntd(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 未結清記錄清單 */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ww-ink">
          未結清記錄 <span className="text-ww-sub font-normal">({open.length})</span>
        </h3>
        {open.length > 0 && (
          <button
            onClick={() => setSelected(allSelected ? new Set() : new Set(open.map(r => r.id)))}
            className="text-xs text-ww-brand font-medium hover:underline"
          >
            {allSelected ? '取消全選' : '全選'}
          </button>
        )}
      </div>

      <div className="bg-ww-card border border-ww-line rounded-ww-list overflow-hidden mb-4">
        {open.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ww-sub">沒有待結清的分攤記錄</div>
        ) : open.map((r, i) => (
          <label
            key={r.id}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-ww-seg/40 transition-colors ${
              i > 0 ? 'border-t border-ww-line3' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(r.id)}
              onChange={() => toggle(r.id)}
              className="w-4 h-4 accent-[#6E9266] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-ww-ink truncate">{r.vendor || '（無商家）'}</div>
              <div className="text-[11px] text-ww-sub">
                {(r.date || '').slice(0, 10)}　代墊：{r.paidBy || r.user}
              </div>
            </div>
            <div className="text-sm font-semibold text-ww-ink tabular-nums shrink-0">{ntd(r.cost)}</div>
          </label>
        ))}
      </div>

      {!pending && balance && (
        <button
          onClick={() => onCreate(selectedRecords)}
          className="w-full bg-ww-brand hover:bg-ww-brandhover text-white py-3 rounded-ww-inner
                     text-sm font-semibold transition-colors mb-6"
        >
          建立結算 · {ntd(balance.amount)}
        </button>
      )}

      {/* 結算記錄 */}
      {history.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-ww-ink mb-2">結算記錄</h3>
          <div className="bg-ww-card border border-ww-line rounded-ww-list overflow-hidden">
            {history.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-ww-line3' : ''}`}>
                <CheckCircle2 size={18} className="text-ww-brand shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ww-ink">
                    {s.debtorUser} → {s.creditorUser}
                  </div>
                  <div className="text-[11px] text-ww-sub">
                    第 {s.sequenceNumber} 次 · 結清於 {s.settledAt}
                  </div>
                </div>
                <div className="text-sm font-semibold text-ww-ink tabular-nums">{ntd(s.amount)}</div>
                <button
                  onClick={() => onDelete(s)}
                  aria-label="刪除結算"
                  className="text-ww-faint hover:text-ww-danger transition-colors shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function PageHeader({ title, onBack, action }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={onBack}
        aria-label="返回"
        className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-ww-ink2
                   hover:bg-ww-seg transition-colors"
      >
        <ArrowLeft size={20} />
      </button>
      <h2 className="text-lg font-semibold text-ww-ink flex-1">{title}</h2>
      {action}
    </div>
  );
}
