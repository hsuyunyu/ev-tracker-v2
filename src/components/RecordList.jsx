import React from 'react';
import { format } from 'date-fns';

const TYPE_CONFIG = {
  charging:    { label: '充電',   icon: '⚡', bg: 'bg-blue-100',   text: 'text-blue-700' },
  tolls:       { label: '過路費', icon: '🛣️', bg: 'bg-orange-100', text: 'text-orange-700' },
  maintenance: { label: '保養',   icon: '🔧', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  insurance:   { label: '保險',   icon: '🛡️', bg: 'bg-purple-100', text: 'text-purple-700' },
  other:       { label: '其他',   icon: '📋', bg: 'bg-gray-100',   text: 'text-gray-600' },
};

const USER_COLORS = {
  '所有人': 'bg-green-100 text-green-700',
  'Rose':   'bg-pink-100 text-pink-700',
  '1+':     'bg-indigo-100 text-indigo-700',
};

function formatDate(dateStr) {
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd');
  } catch {
    return dateStr?.slice(0, 10) ?? '';
  }
}

export default function RecordList({ records, onDelete }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-3">📭</div>
        <p className="text-sm">沒有符合條件的記錄</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {records.map(record => {
        const tc = TYPE_CONFIG[record.type] ?? TYPE_CONFIG.other;
        const userColor = USER_COLORS[record.user] ?? 'bg-gray-100 text-gray-600';

        return (
          <div
            key={record.id}
            className="bg-white rounded-xl border px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow"
          >
            <span className={`text-lg w-9 h-9 flex items-center justify-center rounded-full shrink-0 ${tc.bg}`}>
              {tc.icon}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-800">
                  {record.vendor || tc.label}
                </span>
                {record.note && (
                  <span className="text-xs text-gray-400 truncate max-w-[120px]">{record.note}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-gray-400">{formatDate(record.date)}</span>
                {record.kwh > 0 && (
                  <span className="text-xs text-blue-500">{record.kwh} kWh</span>
                )}
                {record.mileage && (
                  <span className="text-xs text-gray-400">{record.mileage} km</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full ${userColor}`}>
                {record.user}
              </span>
              <span className="text-sm font-bold text-gray-800 min-w-[52px] text-right">
                ${(record.cost ?? 0).toLocaleString()}
              </span>
              <button
                onClick={() => onDelete(record.id)}
                className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none ml-1"
                title="刪除"
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
