import React from 'react';
import BrandMark from './BrandMark';

/**
 * 底部分頁列：對應 iOS WattTabBar（液態玻璃）。
 * 左邊一條浮動的玻璃膠囊放 4 個單字分頁，右邊獨立的葉形玻璃圓鈕新增記錄。
 * 內容會從列的下方透出來。網頁沒有系統的 Liquid Glass，用背景模糊 + 半透明底 + 高光邊模擬。
 */
const TABS = [
  { id: 'home',      mono: '覽', label: '總覽' },
  { id: 'records',   mono: '記', label: '記錄' },
  { id: 'analytics', mono: '析', label: '分析' },
  { id: 'settings',  mono: '設', label: '設定' },
];

/** 玻璃質感：背景模糊加飽和、上緣高光、柔和陰影 */
const GLASS = `backdrop-blur-xl backdrop-saturate-[1.8]
  shadow-[inset_0_1px_0_rgba(255,255,255,.45),inset_0_0_0_0.5px_rgba(255,255,255,.28),0_8px_24px_rgba(0,0,0,.14)]`;

export default function TabBar({ tab, onChange, dueCount = 0, onAdd }) {
  const index = Math.max(0, TABS.findIndex(t => t.id === tab));

  return (
    // 有 home indicator 時稍微沉進安全區，位置與 iOS 的分頁列接近
    <div className="fixed inset-x-0 z-40 pointer-events-none
                    bottom-[max(calc(env(safe-area-inset-bottom)-12px),10px)]">
      <div className="max-w-app mx-auto px-4 flex items-center gap-[10px]">
        <div className={`pointer-events-auto relative flex-1 h-[62px] p-1 rounded-full bg-ww-card/60 ${GLASS}`}>
          <div className="relative flex h-full">
            {/* 選取中的分頁：一塊會滑動的品牌色膠囊 */}
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1/4 rounded-full bg-ww-brand/[0.16]
                         transition-transform duration-300 ease-out"
              style={{ transform: `translateX(${index * 100}%)` }}
            />
            {TABS.map(t => (
              <TabButton key={t.id} mono={t.mono} label={t.label} active={tab === t.id}
                badge={t.id === 'home' ? dueCount : 0} onClick={() => onChange(t.id)} />
            ))}
          </div>
        </div>

        <button
          onClick={onAdd} aria-label="新增記錄"
          className={`pointer-events-auto shrink-0 w-[62px] h-[62px] rounded-full bg-ww-brand/90
                      flex items-center justify-center active:scale-95 transition-transform ${GLASS}`}
        >
          <BrandMark size={32} variant="white" />
        </button>
      </div>
    </div>
  );
}

function TabButton({ mono, label, active, badge, onClick }) {
  return (
    <button
      onClick={onClick} aria-current={active ? 'page' : undefined}
      className={`relative flex-1 flex flex-col items-center justify-center gap-[3px] rounded-full transition-colors ${
        active ? 'text-ww-brand' : 'text-ww-ink2'
      }`}
    >
      <span className="relative text-[18px] font-bold leading-none">
        {mono}
        {badge > 0 && (
          <span className="absolute -top-[6px] left-full -ml-[6px] bg-ww-danger text-white text-[9px] font-bold
                           px-1 py-px rounded-full leading-none">
            {badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </button>
  );
}
