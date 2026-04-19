import React from 'react';
import { Pencil } from 'lucide-react';

const TYPE_ICONS = { charging: '⚡', tolls: '🛣️', maintenance: '🔧', insurance: '🛡️', other: '📋' };

function getIntervalLabel(item) {
  if (item.intervalMonths) return `每 ${item.intervalMonths} 個月`;
  return { monthly: '每月', quarterly: '每季', yearly: '每年' }[item.interval] ?? '每月';
}

const INTERVAL_COLOR = 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400';

export default function RecurringList({ items, onDelete, onToggle, onEdit }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-neutral-600">
        <div className="text-4xl mb-3">🔄</div>
        <p className="text-sm">尚無週期項目</p>
        <p className="text-xs mt-1 text-gray-300 dark:text-neutral-700">點右上角「+ 新增週期」開始設定</p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-2">
      {items.map(item => {
        const isDue = item.active && item.nextDue <= today;

        return (
          <div
            key={item.id}
            className={`bg-white dark:bg-neutral-900 border rounded-xl px-4 py-3 flex items-center gap-3 transition-colors ${
              isDue
                ? 'border-tesla/40 dark:border-tesla/40'
                : 'border-gray-200 dark:border-neutral-800'
            }`}
          >
            <span className={`text-base w-9 h-9 flex items-center justify-center rounded-full shrink-0 ${
              item.active ? 'bg-gray-100 dark:bg-neutral-800' : 'bg-gray-50 dark:bg-neutral-900 opacity-40'
            }`}>
              {TYPE_ICONS[item.type] ?? '📋'}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium ${item.active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-neutral-600'}`}>
                  {item.vendor || item.type}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${INTERVAL_COLOR}`}>
                  {getIntervalLabel(item)}
                </span>
                {isDue && (
                  <span className="text-xs bg-tesla/10 text-tesla px-2 py-0.5 rounded-full">待確認</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400 dark:text-neutral-500">
                  下次：{item.nextDue}
                </span>
                {item.note && (
                  <span className="text-xs text-gray-400 dark:text-neutral-500">{item.note}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                ${(item.cost ?? 0).toLocaleString()}
              </span>

              <button
                onClick={() => onEdit(item)}
                className="text-gray-400 dark:text-neutral-600 hover:text-tesla transition-colors p-1"
                title="編輯"
              >
                <Pencil size={14} />
              </button>

              {/* Active toggle */}
              <button
                onClick={() => onToggle(item)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  item.active ? 'bg-tesla' : 'bg-gray-200 dark:bg-neutral-700'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  item.active ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>

              <button
                onClick={() => onDelete(item.id)}
                className="text-gray-300 dark:text-neutral-700 hover:text-tesla transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
