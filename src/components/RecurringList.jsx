import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { buildTypeMap, TypeIcon } from '../typeConfig';
import { ntd } from '../split';

function getIntervalLabel(item) {
  const months = item.intervalMonths ||
    { monthly: 1, quarterly: 3, yearly: 12 }[item.interval] || 1;
  const dayStr = item.dayOfMonth ? `，${item.dayOfMonth} 日` : '';
  return `每 ${months} 個月${dayStr}`;
}

export default function RecurringList({ items, onDelete, onToggle, onEdit, definedTypes }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-ww-sub">
        <p className="text-sm">尚無週期項目</p>
        <p className="text-xs mt-1 text-ww-faint">點下方 + 開始設定</p>
      </div>
    );
  }

  const typeMap = buildTypeMap(definedTypes);
  const today = new Date().toISOString().slice(0, 10);

  // 啟用中的排前面（對應 iOS sortedRecurring）
  const sorted = [...items].sort((a, b) => {
    if (!!a.active !== !!b.active) return a.active ? -1 : 1;
    return (a.nextDue || '').localeCompare(b.nextDue || '');
  });

  return (
    <div className="space-y-2">
      {sorted.map(item => {
        const isDue = item.active && item.nextDue <= today;
        const t = typeMap[item.type];

        return (
          <div
            key={item.id}
            className={`bg-ww-card border rounded-ww-list px-4 py-3 flex items-center gap-3 transition-colors ${
              isDue ? 'border-ww-brand/50' : 'border-ww-line'
            }`}
          >
            <span
              className={`w-9 h-9 flex items-center justify-center rounded-full shrink-0 ${item.active ? '' : 'opacity-40'}`}
              style={{ backgroundColor: (t?.color ?? '#8C8579') + '22', color: t?.color ?? '#8C8579' }}
            >
              <TypeIcon icon={t?.icon} size={17} />
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium ${item.active ? 'text-ww-ink' : 'text-ww-faint'}`}>
                  {item.vendor || item.type}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-ww-seg text-ww-ink2">
                  {getIntervalLabel(item)}
                </span>
                {isDue && (
                  <span className="text-[10px] bg-ww-brand/15 text-ww-brand px-2 py-0.5 rounded-full">待確認</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-ww-sub">下次：{item.nextDue}</span>
                {item.note && <span className="text-xs text-ww-sub truncate">{item.note}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-sm font-bold text-ww-ink tabular-nums">{ntd(item.cost)}</span>

              <button
                onClick={() => onEdit(item)}
                className="text-ww-faint hover:text-ww-brand transition-colors p-1"
                title="編輯"
              >
                <Pencil size={14} />
              </button>

              <button
                onClick={() => onToggle(item)}
                title={item.active ? '停用' : '啟用'}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  item.active ? 'bg-ww-brand' : 'bg-ww-seg2 border border-ww-line2'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  item.active ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>

              <button
                onClick={() => onDelete(item.id)}
                className="text-ww-faint hover:text-ww-danger transition-colors p-1"
                title="刪除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
