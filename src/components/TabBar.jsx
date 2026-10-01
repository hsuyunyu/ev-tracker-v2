import React from 'react';
import BrandMark from './BrandMark';

/**
 * 底部分頁列：對應 iOS WattTabBar（4 個單字分頁 + 中央凸起的葉形 FAB）。
 * 底色填滿安全區，內容往上墊，避免文字被 home indicator 切到。
 */
const TABS = [
  { id: 'home',      mono: '覽', label: '總覽' },
  { id: 'records',   mono: '記', label: '記錄' },
  { id: 'analytics', mono: '析', label: '分析' },
  { id: 'settings',  mono: '設', label: '設定' },
];

export default function TabBar({ tab, onChange, dueCount = 0, onAdd }) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      {/* FAB 凸出半顆，列本身 54px */}
      <div className="relative pt-[29px]">
        <div className="pointer-events-auto bg-ww-barbg/[0.93] backdrop-blur-md border-t border-ww-line ww-safe-bottom">
          <div className="max-w-app mx-auto flex h-[54px]">
            {TABS.slice(0, 2).map(t => (
              <TabButton key={t.id} mono={t.mono} label={t.label} active={tab === t.id}
                badge={t.id === 'home' ? dueCount : 0} onClick={() => onChange(t.id)} />
            ))}
            <div className="w-[74px] shrink-0" />
            {TABS.slice(2).map(t => (
              <TabButton key={t.id} mono={t.mono} label={t.label} active={tab === t.id} badge={0}
                onClick={() => onChange(t.id)} />
            ))}
          </div>
        </div>

        <button
          onClick={onAdd} aria-label="新增記錄"
          className="pointer-events-auto absolute top-0 left-1/2 -translate-x-1/2 w-[58px] h-[58px]
                     rounded-full bg-ww-brand flex items-center justify-center
                     shadow-[0_8px_16px_rgba(110,146,102,.55)] active:scale-95 transition-transform"
        >
          <BrandMark size={35} variant="white" />
        </button>
      </div>
    </div>
  );
}

function TabButton({ mono, label, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-[5px] transition-colors ${
        active ? 'text-ww-brand' : 'text-ww-faint'
      }`}
    >
      <span className="relative text-[19px] font-bold leading-none">
        {mono}
        {badge > 0 && (
          <span className="absolute -top-[7px] left-full -ml-[6px] bg-ww-danger text-white text-[9px] font-bold
                           px-1 py-px rounded-full leading-none">
            {badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </button>
  );
}
