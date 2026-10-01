import React from 'react';

/**
 * WattWise 葉形標誌（與 iOS Assets 的 BrandMark / BrandMarkWhite 同一份圖形）。
 * variant="color"：森林綠葉 + 白閃電；variant="white"：白葉 + 森林綠閃電（放在綠底上用）。
 */
export default function BrandMark({ size = 28, variant = 'color', className = '' }) {
  const white = variant === 'white';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d="M50 16 A 37 37 0 0 1 50 84 A 37 37 0 0 1 50 16 Z"
        fill={white ? '#fff' : '#5F8A57'}
      />
      <path
        d="M55 32 L41 53 L51 53 L46 69"
        fill="none" stroke={white ? '#5F8A57' : '#fff'} strokeWidth="6"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

/** 森林綠圓角方塊 + 白葉（登入頁、載入頁），對應 iOS LeafBadge */
export function LeafBadge({ side = 88, corner = 27, leaf = 50, className = '', style }) {
  return (
    <span
      className={`inline-flex items-center justify-center bg-ww-forest ${className}`}
      style={{ width: side, height: side, borderRadius: corner, ...style }}
    >
      <BrandMark size={leaf} variant="white" />
    </span>
  );
}
