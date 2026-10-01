import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { monoOf } from '../format';

/**
 * 共用 UI 元件 —— 對應 iOS 各 View 重複出現的樣式
 *（底部 sheet、欄位卡、分段控制、開關、單字圖示、頭像、篩選 chip）。
 */

// MARK: - Sheet（對應 SwiftUI .sheet）

const sheetStack = [];

/**
 * 底部 sheet：手機由下往上滑出、上緣圓角 30；桌機置中成一張卡。
 * `tall` 對應 iOS 的 .large detent（表單類），否則依內容高度（.medium）。
 */
export function Sheet({ onClose, children, footer, tall = false }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    sheetStack.push(closeRef);
    document.documentElement.style.overflow = 'hidden';
    // 疊了多層 sheet 時，Esc 只關最上面那一層
    const onKey = (e) => {
      if (e.key === 'Escape' && sheetStack[sheetStack.length - 1] === closeRef) closeRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      sheetStack.splice(sheetStack.indexOf(closeRef), 1);
      if (sheetStack.length === 0) document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="ww-sheet-backdrop absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        role="dialog" aria-modal="true"
        className={`ww-sheet-panel relative w-full max-w-app bg-ww-bg flex flex-col overflow-hidden
                    rounded-t-ww-sheet sm:rounded-ww-sheet shadow-2xl
                    max-h-[94dvh] sm:max-h-[88vh] ${tall ? 'h-[94dvh] sm:h-[88vh]' : ''}`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{children}</div>
        {footer}
      </div>
    </div>
  );
}

/** sheet 頂部導覽列：左（取消/關閉）· 標題 · 右（儲存） */
export function SheetNav({ title, left, right }) {
  return (
    <div className="sticky top-0 z-10 bg-ww-bg grid grid-cols-[1fr_auto_1fr]
                    items-center px-[22px] pt-[18px] pb-2.5">
      <div className="justify-self-start">{left}</div>
      <div className="text-[16px] font-bold text-ww-ink">{title}</div>
      <div className="justify-self-end">{right}</div>
    </div>
  );
}

export function NavButton({ children, onClick, strong = false, disabled = false }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className={`text-[15px] py-1 transition-opacity ${strong ? 'font-bold' : 'font-medium'} ${
        disabled ? 'text-ww-faint' : 'text-ww-brand active:opacity-60'
      }`}
    >
      {children}
    </button>
  );
}

// MARK: - 卡片 / 列

export function Card({ children, className = '', radius = 16, border = true, padX = true }) {
  return (
    <div
      className={`bg-ww-card ${border ? 'border border-ww-line' : ''} ${padX ? 'px-4' : ''} ${className}`}
      style={{ borderRadius: radius }}
    >
      {children}
    </div>
  );
}

export const Divider = () => <div className="h-px bg-ww-line3" />;

/** 區塊小標（設定頁、表單），對應 iOS section() 的標題 */
export function SectionLabel({ children, size = 11 }) {
  return (
    <div className="px-1 font-bold text-ww-sub tracking-[0.5px]" style={{ fontSize: size }}>
      {children}
    </div>
  );
}

export function Section({ title, children, radius = 16, gap = 7, footnote }) {
  return (
    <div className="flex flex-col" style={{ gap }}>
      <SectionLabel>{title}</SectionLabel>
      <Card radius={radius}>{children}</Card>
      {footnote && <p className="px-1 pt-0.5 text-[11.5px] text-ww-faint">{footnote}</p>}
    </div>
  );
}

/** 設定頁的點擊列：標籤 + 值 + 箭頭 */
export function TapRow({ label, value, valueClass = 'text-ww-sub', chevron = true, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-2 py-[13px] text-left active:opacity-60">
      <span className="text-[14px] text-ww-ink shrink-0">{label}</span>
      <span className={`ml-auto min-w-0 truncate text-[13px] ${valueClass}`}>{value}</span>
      {chevron && <ChevronRight size={14} strokeWidth={2.6} className="text-ww-faint shrink-0" />}
    </button>
  );
}

// MARK: - 控制項

/** iOS 樣式開關 */
export function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative w-[51px] h-[31px] rounded-full shrink-0 transition-colors ${
        on ? 'bg-ww-brand' : 'bg-ww-line2'
      }`}
    >
      <span className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white
                        shadow-[0_2px_4px_rgba(0,0,0,.2)] transition-transform ${
        on ? 'translate-x-[20px]' : ''
      }`} />
    </button>
  );
}

/** 分段控制：options = [[value, label]] */
export function Segmented({ options, value, onChange, padX = 11 }) {
  return (
    <div className="inline-flex gap-[3px] p-[3px] bg-ww-seg rounded-[10px]">
      {options.map(([v, l]) => {
        const active = v === value;
        return (
          <button
            key={v} type="button" onClick={() => onChange(v)}
            className={`py-[6px] rounded-[7px] text-[12px] font-semibold whitespace-nowrap transition-colors ${
              active ? 'bg-ww-seg2 text-ww-ink shadow-[0_1px_1px_rgba(0,0,0,.08)]' : 'text-ww-sub'
            }`}
            style={{ paddingLeft: padX, paddingRight: padX }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

export function StepButton({ children, onClick, size = 30 }) {
  return (
    <button
      type="button" onClick={onClick}
      className="bg-ww-seg text-ww-ink font-bold rounded-[9px] flex items-center justify-center
                 active:opacity-60 shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.56 }}
    >
      {children}
    </button>
  );
}

// MARK: - 圖示 / 頭像

/** 類型單字圖示：圓角方塊 + 標籤首字，底色為類型色 12% */
export function MonoTile({ type, size = 44, radius = 14, fontSize = 17, dim = false, alpha = '1F' }) {
  const color = type?.color ?? '#8C8579';
  return (
    <span
      className={`flex items-center justify-center font-bold shrink-0 ${dim ? 'bg-ww-seg text-ww-faint' : ''}`}
      style={{
        width: size, height: size, borderRadius: radius, fontSize,
        ...(dim ? {} : { backgroundColor: color + alpha, color }),
      }}
    >
      {monoOf(type)}
    </span>
  );
}

// 對應 iOS UserAvatarView 的系統色盤
const AVATAR_COLORS = [
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF3B30',
  '#FF9500', '#D4A200', '#34C759', '#30B0C7', '#32ADE6',
];

/** 使用者頭像：名稱首字，顏色由名稱決定（同一個人永遠同色） */
export function UserAvatar({ name, size = 30 }) {
  const s = String(name ?? '').trim();
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  const color = AVATAR_COLORS[h % AVATAR_COLORS.length];
  return (
    <span
      className="rounded-full flex items-center justify-center font-semibold font-rounded shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42, backgroundColor: color + '33', color }}
    >
      {s ? s.charAt(0).toUpperCase() : '?'}
    </span>
  );
}

/** 深色圓形個人頭像（首頁右上、設定頁帳號卡） */
export function DarkAvatar({ initial, size = 40, fontSize = 15 }) {
  return (
    <span
      className="rounded-full bg-[#211D17] text-white font-extrabold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize }}
    >
      {initial}
    </span>
  );
}

// MARK: - 篩選 chip + 下拉選單（對應 SwiftUI Menu + FilterChip）

export function FilterChip({ label, active, icon }) {
  return (
    <span className={`inline-flex items-center gap-[5px] px-[13px] py-[7px] rounded-full border
                      text-[13px] font-medium whitespace-nowrap ${
      active
        ? 'bg-ww-brand/[0.12] border-ww-brand/30 text-ww-brand'
        : 'bg-ww-card border-ww-line2 text-ww-ink2'
    }`}>
      {icon}
      {label}
      <ChevronDown size={11} strokeWidth={2.6} />
    </span>
  );
}

/**
 * 下拉選單。
 * @param options  [{ value, label }]
 * @param value    多選時為陣列（空陣列 = 全部）；單選時為字串（'' = 全部）
 */
export function FilterMenu({ label, allLabel, options, value, onChange, multi = false, icon, align = 'left', trigger }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const selected = multi ? value : (value ? [value] : []);
  const isAll = selected.length === 0;

  const pick = (v) => {
    if (multi) {
      onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
    } else {
      onChange(v);
      setOpen(false);
    }
  };

  const chipLabel = isAll ? label
    : selected.length === 1 ? (options.find(o => o.value === selected[0])?.label ?? selected[0])
    : `${label} (${selected.length})`;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="block">
        {trigger ?? <FilterChip label={chipLabel} active={!isAll} icon={icon} />}
      </button>

      {open && (
        <div className={`absolute top-full mt-1.5 z-[45] min-w-[168px] max-h-[320px] overflow-y-auto
                         bg-ww-card border border-ww-line2 rounded-[14px] py-1
                         shadow-[0_12px_30px_-8px_rgba(0,0,0,.28)] ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {allLabel && (
            <>
              <MenuItem label={allLabel} checked={isAll}
                onClick={() => { onChange(multi ? [] : ''); if (!multi) setOpen(false); }} />
              <div className="h-px bg-ww-line3 my-1" />
            </>
          )}
          {options.map(o => (
            <MenuItem key={o.value} label={o.label} checked={selected.includes(o.value)}
              onClick={() => pick(o.value)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, checked, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-[14px] text-ww-ink
                 hover:bg-ww-seg/60 active:bg-ww-seg">
      <span className="w-4 shrink-0 text-ww-brand">
        {checked && <Check size={15} strokeWidth={3} />}
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

/** 列表工具列上的膠囊按鈕（分攤細節 / 排序） */
export function PillButton({ children, active = false, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-[6px] rounded-full text-[12px] font-semibold border whitespace-nowrap transition-colors ${
        active ? 'bg-ww-brand border-transparent text-white' : 'bg-ww-card border-ww-line2 text-ww-ink2'
      }`}>
      {children}
    </button>
  );
}

/** 頁面大標題（費用記錄 / 數據分析 / 設定） */
export function PageTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between px-0.5 pt-2">
      <h1 className="text-[26px] font-extrabold text-ww-ink tracking-[-0.02em]">{children}</h1>
      {right}
    </div>
  );
}

export const SORT_OPTIONS = [
  { value: 'date_desc',   label: '按日期降序（預設）', short: '日期降序' },
  { value: 'date_asc',    label: '按日期升序',         short: '日期升序' },
  { value: 'type',        label: '按分類',             short: '按分類' },
  { value: 'amount_desc', label: '按金額（高→低）',     short: '金額高→低' },
  { value: 'amount_asc',  label: '按金額（低→高）',     short: '金額低→高' },
];

/** 對應 iOS displayRecords / sortedFiltered 的排序 */
export function sortRecords(list, mode, typeMap) {
  const byDate = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));
  const out = [...list];
  switch (mode) {
    case 'date_asc':    return out.sort((a, b) => -byDate(a, b));
    case 'type':        return out.sort((a, b) => {
      const la = typeMap[a.type]?.label ?? a.type ?? '';
      const lb = typeMap[b.type]?.label ?? b.type ?? '';
      return la === lb ? byDate(a, b) : la.localeCompare(lb);
    });
    case 'amount_desc': return out.sort((a, b) => (b.cost || 0) - (a.cost || 0));
    case 'amount_asc':  return out.sort((a, b) => (a.cost || 0) - (b.cost || 0));
    default:            return out.sort(byDate);
  }
}
