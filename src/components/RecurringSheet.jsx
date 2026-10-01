import React from 'react';
import { RotateCw } from 'lucide-react';
import { buildTypeMap } from '../typeConfig';
import { normalizeDue, needsConfirm, intervalMonths } from '../recurring';
import { fmtInt, daysFromToday, shortDate } from '../format';
import { MonoTile, NavButton, Sheet, SheetNav } from './ui';

/**
 * 週期項目 —— 對應 iOS RecurringView。
 * 卡片列（單字圖示 + 到期 badge + 頻率 + 金額 + 啟用 pill）+ 虛線新增按鈕。
 */
export default function RecurringSheet({
  items, settings, onClose, onAdd, onEdit, onToggle, onConfirm, onSkip,
}) {
  const typeMap = buildTypeMap(settings.definedTypes);

  // 啟用中的排前面（對應 iOS sortedRecurring）
  const sorted = [...items].sort((a, b) => {
    if (!!a.active !== !!b.active) return a.active ? -1 : 1;
    return String(a.nextDue || '').localeCompare(String(b.nextDue || ''));
  });

  return (
    <Sheet onClose={onClose} tall>
      <SheetNav title="週期項目" left={<NavButton onClick={onClose}>關閉</NavButton>} />

      <div className="px-[22px] pt-1.5 pb-[calc(28px+env(safe-area-inset-bottom))]">
        <p className="px-0.5 pb-3.5 text-[12.5px] text-ww-sub">保險、保養、儲值等定期費用</p>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 py-9">
            <RotateCw size={36} className="text-ww-faint" />
            <span className="text-[15px] font-semibold text-ww-sub">尚無週期項目</span>
          </div>
        ) : (
          <div className="flex flex-col gap-[11px]">
            {sorted.map(item => (
              <RecurringCard key={item.id} item={item} type={typeMap[item.type]}
                onEdit={() => onEdit(item)} onToggle={() => onToggle(item)}
                onConfirm={() => onConfirm(item)} onSkip={() => onSkip(item)} />
            ))}
          </div>
        )}

        <button onClick={onAdd}
          className={`w-full py-3.5 rounded-ww-sm border-[1.5px] border-dashed border-ww-line2
                      text-ww-brand text-[14px] font-semibold active:opacity-70 ${
            items.length === 0 ? 'mt-3' : 'mt-[17px]'
          }`}>
          ＋ 新增週期項目
        </button>
      </div>
    </Sheet>
  );
}

function RecurringCard({ item, type: t, onEdit, onToggle, onConfirm, onSkip }) {
  const due = dueInfo(item);
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <div role="button" tabIndex={0} onClick={onEdit}
      onKeyDown={e => e.key === 'Enter' && onEdit()}
      className="bg-ww-card border border-ww-line rounded-ww-list p-[15px] cursor-pointer active:opacity-80">
      <div className="flex items-center gap-3.5">
        <MonoTile type={t} radius={13} dim={!item.active} />
        <div className="min-w-0 flex-1">
          <div className={`text-[15px] font-semibold truncate ${item.active ? 'text-ww-ink' : 'text-ww-sub'}`}>
            {item.vendor || t?.label || item.type}
          </div>
          <div className="mt-1 flex items-center gap-[7px]">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
              style={{ color: due.color, backgroundColor: due.color + '1F' }}>
              {due.text}
            </span>
            <span className="text-[12px] text-ww-sub truncate">
              {intervalLabel(item)}{item.autoRecord ? '・自動記帳' : ''}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-[5px] shrink-0">
          <span className={`text-[15px] font-extrabold tabular-nums ${item.active ? 'text-ww-ink' : 'text-ww-sub'}`}>
            NT$ {fmtInt(item.cost)}
          </span>
          <button onClick={stop(onToggle)}
            className={`px-[9px] py-[3px] rounded-full text-[10.5px] font-bold ${
              item.active ? 'bg-ww-brand/[0.12] text-ww-brand' : 'bg-ww-seg text-ww-sub'
            }`}>
            {item.active ? '啟用中' : '已停用'}
          </button>
        </div>
      </div>

      {/* 已到期且沒開自動記帳：在這裡確認記帳或跳過這一期 */}
      {needsConfirm(item) && (
        <div className="mt-3 pt-3 border-t border-dashed border-ww-line2 flex items-center gap-2">
          <span className="text-[11.5px] text-ww-sub mr-auto">這一期還沒記帳</span>
          <button onClick={stop(onSkip)}
            className="px-3 py-1.5 rounded-full bg-ww-seg text-ww-ink2 text-[12px] font-semibold">
            跳過
          </button>
          <button onClick={stop(onConfirm)}
            className="px-3 py-1.5 rounded-full bg-ww-brand text-white text-[12px] font-bold">
            確認記帳
          </button>
        </div>
      )}
    </div>
  );
}

function dueInfo(item) {
  const due = normalizeDue(item.nextDue);
  if (!item.active || !due) return { text: '已停用', color: '#8C8579' };
  const days = daysFromToday(due);
  if (days < 0)  return { text: `已逾期 ${-days} 天`, color: '#C0463F' };
  if (days === 0) return { text: '今天到期', color: '#C8A24C' };
  if (days <= 7) return { text: `${days} 天後`, color: '#C8A24C' };
  return { text: `${shortDate(due)} 到期`, color: '#6E9266' };
}

function intervalLabel(item) {
  switch (item.interval) {
    case 'monthly':   return '每月';
    case 'quarterly': return '每季';
    case 'yearly':    return '每年';
    default:          return `每 ${intervalMonths(item)} 個月`;
  }
}
