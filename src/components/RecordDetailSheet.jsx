import React from 'react';
import { hasSplit } from '../split';
import { fmtInt, fmtNum, fullDate, splitMethodLabel } from '../format';
import { Card, Divider, MonoTile, Sheet } from './ui';

/**
 * 單筆費用詳情 —— 對應 iOS RecordDetailView。
 * 大圖示 + 金額 + 資訊卡 + 分攤明細 + 刪除/編輯。
 */
export default function RecordDetailSheet({ record: r, type: t, onClose, onEdit, onDelete }) {
  let extraLabel = '備註';
  let extraValue = r.note || '—';
  if (r.type === 'charging' && (r.kwh || 0) > 0) {
    extraLabel = '充電度數';
    extraValue = `${fmtNum(r.kwh)} kWh`;
  } else if (r.mileage) {
    extraLabel = '里程數';
    extraValue = `${r.mileage} km`;
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex flex-col items-center pt-3">
        <span className="w-10 h-[5px] rounded-full bg-[#DCD5C8] dark:bg-ww-line2" />

        <div className="mt-[18px]">
          <MonoTile type={t} size={60} radius={18} fontSize={24} alpha="26" />
        </div>
        <div className="mt-3 px-6 text-[18px] font-bold text-ww-ink text-center">
          {r.vendor || t?.label || r.type}
        </div>
        <div className="mt-1.5 mb-2 text-[38px] leading-tight font-extrabold font-rounded text-ww-ink tabular-nums">
          NT${fmtInt(r.cost)}
        </div>
      </div>

      <div className="px-6 pb-[calc(24px+env(safe-area-inset-bottom))] flex flex-col gap-3">
        <Card border={false}>
          <InfoRow label="類別" value={t?.label ?? r.type} />
          <Divider />
          <InfoRow label="日期" value={fullDate(r.date)} />
          <Divider />
          <InfoRow label="付款人" value={r.paidBy || r.user} />
          <Divider />
          <InfoRow label={extraLabel} value={extraValue} />
        </Card>

        {hasSplit(r) && (
          <div className="rounded-ww-sm px-4 py-3.5 bg-ww-brand/[0.06] border border-ww-brand/[0.15]">
            <div className="text-[12px] font-bold text-[#4F6E48] dark:text-ww-greentitle mb-2">
              分攤明細 · {splitMethodLabel(r.splitMethod)}
            </div>
            {r.splitEntries.map(e => (
              <div key={e.id || e.user} className="flex justify-between py-[3px] text-[13px] font-semibold text-ww-ink">
                <span>{e.user}</span>
                <span className="tabular-nums">NT${fmtInt(e.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2.5 mt-0.5">
          <button onClick={() => onDelete(r)}
            className="flex-1 py-3.5 rounded-ww-inner bg-ww-card text-ww-danger text-[14px] font-bold active:opacity-70">
            刪除
          </button>
          <button onClick={() => onEdit(r)}
            className="flex-1 py-3.5 rounded-ww-inner bg-ww-greenbg text-[#4F6E48] dark:text-ww-greentitle
                       text-[14px] font-bold active:opacity-70">
            編輯這筆記錄
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-[13px] text-ww-sub shrink-0">{label}</span>
      <span className="text-[13px] font-semibold text-ww-ink text-right truncate">{value}</span>
    </div>
  );
}
