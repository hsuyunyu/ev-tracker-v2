import React from 'react';
import { resolveTypes, TypeIcon } from '../typeConfig';

export default function FilterBar({ filters, onFilter, definedUsers, definedTypes }) {
  const typeList = [{ id: 'all', label: '全部', icon: null }, ...resolveTypes(definedTypes)];
  const hasFilter = filters.type !== 'all' || filters.user !== 'all' || filters.month;

  const selectCls =
    'text-sm border border-ww-line2 rounded-ww-inner px-3 py-1.5 text-ww-ink2 bg-ww-field ' +
    'focus:outline-none focus:border-ww-brand transition-colors';

  return (
    <div className="bg-ww-card border border-ww-line rounded-ww-list p-4 mb-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {typeList.map(t => {
          const active = filters.type === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onFilter(f => ({ ...f, type: t.id }))}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                active
                  ? 'bg-ww-brand text-white'
                  : 'bg-ww-seg text-ww-ink2 hover:bg-ww-seg2'
              }`}
            >
              {t.icon && <TypeIcon icon={t.icon} size={13} />}
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2.5 items-center">
        <select
          value={filters.user}
          onChange={e => onFilter(f => ({ ...f, user: e.target.value }))}
          className={selectCls}
        >
          <option value="all">所有成員</option>
          {definedUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        <input
          type="month"
          value={filters.month}
          onChange={e => onFilter(f => ({ ...f, month: e.target.value }))}
          className={selectCls}
        />

        {hasFilter && (
          <button
            onClick={() => onFilter({ type: 'all', user: 'all', month: '' })}
            className="text-xs text-ww-sub hover:text-ww-ink underline transition-colors"
          >
            清除篩選
          </button>
        )}
      </div>
    </div>
  );
}
