import React from 'react';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';
import { buildTypeMap } from '../typeConfig';

const USER_COLORS = {
  '所有人': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  'Rose':   'bg-pink-50 text-pink-600 dark:bg-pink-950 dark:text-pink-400',
  '1+':     'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
};

function formatDate(dateStr) {
  try { return format(new Date(dateStr), 'yyyy-MM-dd'); }
  catch { return dateStr?.slice(0, 10) ?? ''; }
}

export default function RecordList({ records, onDelete, onEdit, definedTypes }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-neutral-600">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-sm">沒有符合條件的記錄</p>
      </div>
    );
  }

  const typeMap = buildTypeMap(definedTypes);
  const fallback = { label: '其他', icon: '📋', color: '#6b7280' };

  return (
    <div className="space-y-2">
      {records.map(record => {
        const tc = typeMap[record.type] ?? fallback;
        const userColor = USER_COLORS[record.user] ?? 'bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-neutral-400';

        return (
          <div
            key={record.id}
            className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-gray-300 dark:hover:border-neutral-700 transition-colors"
          >
            <span
              className="text-base w-9 h-9 flex items-center justify-center rounded-full shrink-0"
              style={{ backgroundColor: tc.color + '22', color: tc.color }}
            >
              {tc.icon}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {record.vendor || tc.label || record.type}
                </span>
                {record.note && (
                  <span className="text-xs text-gray-400 dark:text-neutral-500 truncate max-w-[120px]">
                    {record.note}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-gray-400 dark:text-neutral-500">{formatDate(record.date)}</span>
                {record.kwh > 0 && (
                  <span className="text-xs text-blue-500 dark:text-blue-400">{record.kwh} kWh</span>
                )}
                {record.mileage && (
                  <span className="text-xs text-gray-400 dark:text-neutral-500">{record.mileage} km</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full ${userColor}`}>
                {record.user}
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-white min-w-[52px] text-right">
                ${(record.cost ?? 0).toLocaleString()}
              </span>
              <button
                onClick={() => onEdit(record)}
                className="text-gray-300 dark:text-neutral-700 hover:text-tesla transition-colors p-1"
                title="編輯"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDelete(record.id)}
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
