import React from 'react';

const TYPES = [
  { value: 'all',         label: '全部' },
  { value: 'charging',    label: '⚡ 充電' },
  { value: 'tolls',       label: '🛣️ 過路費' },
  { value: 'maintenance', label: '🔧 保養' },
  { value: 'insurance',   label: '🛡️ 保險' },
  { value: 'other',       label: '📋 其他' },
];

export default function FilterBar({ filters, onFilter, definedUsers }) {
  const hasFilter = filters.type !== 'all' || filters.user !== 'all' || filters.month;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-4 mb-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => onFilter(f => ({ ...f, type: t.value }))}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.type === t.value
                ? 'bg-tesla text-white'
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filters.user}
          onChange={e => onFilter(f => ({ ...f, user: e.target.value }))}
          className="text-sm border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-gray-600 dark:text-neutral-300 bg-white dark:bg-neutral-800"
        >
          <option value="all">所有使用者</option>
          {definedUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        <input
          type="month"
          value={filters.month}
          onChange={e => onFilter(f => ({ ...f, month: e.target.value }))}
          className="text-sm border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-gray-600 dark:text-neutral-300 bg-white dark:bg-neutral-800"
        />

        {hasFilter && (
          <button
            onClick={() => onFilter({ type: 'all', user: 'all', month: '' })}
            className="text-xs text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300 underline"
          >
            清除篩選
          </button>
        )}
      </div>
    </div>
  );
}
