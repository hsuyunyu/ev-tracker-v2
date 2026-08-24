import React from 'react';
import { Bell } from 'lucide-react';
import { buildTypeMap, TypeIcon } from '../typeConfig';
import { ntd } from '../split';

export default function DueBanner({ items, onConfirm, onSkip, definedTypes }) {
  const typeMap = buildTypeMap(definedTypes);

  return (
    <div className="bg-ww-greenbg border border-ww-greenline rounded-ww-list p-4 mb-4">
      <p className="text-sm font-semibold text-ww-greentitle mb-3 flex items-center gap-1.5">
        <Bell size={15} />
        {items.length} 筆週期費用待確認
      </p>

      <div className="space-y-2">
        {items.map(item => {
          const t = typeMap[item.type];
          return (
            <div
              key={item.id}
              className="bg-ww-card rounded-ww-inner px-3 py-2.5 flex items-center gap-3 border border-ww-line"
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: (t?.color ?? '#8C8579') + '22', color: t?.color ?? '#8C8579' }}
              >
                <TypeIcon icon={t?.icon} size={15} />
              </span>

              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-ww-ink">{item.vendor || item.type}</span>
                <span className="text-xs text-ww-sub ml-2 tabular-nums">{ntd(item.cost)}</span>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onSkip(item)}
                  className="text-xs text-ww-sub hover:text-ww-ink px-2 py-1 rounded-ww-inner
                             hover:bg-ww-seg transition-colors"
                >
                  略過
                </button>
                <button
                  onClick={() => onConfirm(item)}
                  className="text-xs bg-ww-brand hover:bg-ww-brandhover text-white px-3 py-1
                             rounded-ww-inner transition-colors"
                >
                  確認記帳
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
