import React from 'react';
import { buildTypeMap } from '../typeConfig';

export default function DueBanner({ items, onConfirm, onSkip, definedTypes }) {
  const typeMap = buildTypeMap(definedTypes);
  return (
    <div className="bg-tesla/10 dark:bg-tesla/20 border border-tesla/30 rounded-xl p-4 mb-4">
      <p className="text-sm font-semibold text-tesla mb-3">
        🔔 {items.length} 筆週期費用待確認
      </p>
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className="bg-white dark:bg-neutral-900 rounded-lg px-3 py-2.5 flex items-center gap-3 border border-gray-200 dark:border-neutral-800"
          >
            <span className="text-base">{typeMap[item.type]?.icon ?? '📋'}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {item.vendor || item.type}
              </span>
              <span className="text-xs text-gray-400 dark:text-neutral-500 ml-2">
                ${item.cost?.toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => onSkip(item)}
                className="text-xs text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
              >
                略過
              </button>
              <button
                onClick={() => onConfirm(item)}
                className="text-xs bg-tesla text-white px-3 py-1 rounded-lg hover:bg-tesla-hover transition-colors"
              >
                確認記帳
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
