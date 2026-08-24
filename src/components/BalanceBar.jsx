import React from 'react';
import { ChevronRight, Gauge } from 'lucide-react';
import { ntd } from '../split';

/**
 * 記錄頁上方的分攤餘額列 + 里程入口。
 * 餘額使用全域未結清記錄，不受月份篩選影響（與 iOS RecordsView 一致）。
 */
export default function BalanceBar({ balance, pending, onOpen, onOpenMileage }) {
  return (
    <div className="flex gap-2 mb-4">
      <button
        onClick={onOpen}
        className="flex-1 flex items-center gap-3 bg-ww-card border border-ww-line rounded-ww-list
                   px-4 py-3 text-left hover:border-ww-line2 transition-colors"
      >
        <div className="flex-1 min-w-0">
          {pending ? (
            <>
              <div className="text-[11px] text-ww-sub mb-0.5">待確認付款</div>
              <div className="text-sm text-ww-ink truncate">
                <span className="font-semibold">{pending.debtorUser}</span>
                <span className="text-ww-sub"> 應付 </span>
                <span className="font-semibold">{pending.creditorUser}</span>
                <span className="font-semibold text-ww-danger"> {ntd(pending.amount)}</span>
              </div>
            </>
          ) : balance ? (
            <>
              <div className="text-[11px] text-ww-sub mb-0.5">目前未結清</div>
              <div className="text-sm text-ww-ink truncate">
                <span className="font-semibold">{balance.debtor}</span>
                <span className="text-ww-sub"> 欠 </span>
                <span className="font-semibold">{balance.creditor}</span>
                <span className="font-semibold text-ww-danger"> {ntd(balance.amount)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] text-ww-sub mb-0.5">分攤結清</div>
              <div className="text-sm text-ww-ink2">目前沒有待結清的分攤</div>
            </>
          )}
        </div>
        <ChevronRight size={18} className="text-ww-faint shrink-0" />
      </button>

      <button
        onClick={onOpenMileage}
        aria-label="里程記錄"
        className="w-[52px] shrink-0 bg-ww-card border border-ww-line rounded-ww-list
                   flex flex-col items-center justify-center gap-1 text-ww-ink2
                   hover:border-ww-line2 transition-colors"
      >
        <Gauge size={18} />
        <span className="text-[10px] font-medium">里程</span>
      </button>
    </div>
  );
}
