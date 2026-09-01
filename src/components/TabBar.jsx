import React from 'react';
import { Plus } from 'lucide-react';

/**
 * 底部分頁列：對應 iOS WattTabBar（4 個分頁 + 中央凸起 FAB）。
 * 底色填滿安全區，內容往上墊，避免文字被 home indicator 切到。
 */
const TABS = [
  { key: 'home',      mono: '覽', label: '總覽' },
  { key: 'records',   mono: '記', label: '記錄' },
  { key: 'analytics', mono: '析', label: '分析' },
  { key: 'settings',  mono: '設', label: '設定' },
];

export default function TabBar({ tab, onChange, dueCount = 0, onAdd }) {
  const left  = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <div className="fixed bottom-0 inset-x-0 z-40">
      <div className="relative bg-ww-barbg/95 backdrop-blur border-t border-ww-line ww-safe-bottom">
        <div className="max-w-4xl mx-auto flex items-end h-[54px]">
          {left.map(t => (
            <TabButton key={t.key} mono={t.mono} label={t.label} active={tab === t.key}
              badge={t.key === 'home' ? dueCount : 0}
              onClick={() => onChange(t.key)} />
          ))}

          {/* 中央 FAB 佔位 */}
          <div className="w-[74px] shrink-0" />

          {right.map(t => (
            <TabButton key={t.key} mono={t.mono} label={t.label} active={tab === t.key}
              badge={0} onClick={() => onChange(t.key)} />
          ))}
        </div>

        {/* 中央 FAB（凸起） */}
        <button
          onClick={onAdd}
          aria-label="新增"
          className="absolute left-1/2 -translate-x-1/2 -top-[29px] w-[58px] h-[58px] rounded-full
                     bg-ww-brand hover:bg-ww-brandhover text-white shadow-lg shadow-ww-brand/50
                     flex items-center justify-center transition-colors"
        >
          <Plus size={26} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}

function TabButton({ mono, label, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 h-[54px] flex flex-col items-center justify-center gap-[3px] transition-colors ${
        active ? 'text-ww-brand' : 'text-ww-faint hover:text-ww-ink2'
      }`}
    >
      <span className="relative text-[19px] font-bold leading-none">
        {mono}
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-3 bg-ww-danger text-white text-[9px] font-bold
                           px-1 py-px rounded-full leading-none">
            {badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </button>
  );
}
