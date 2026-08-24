import React from 'react';

/** WattWise 葉形標誌（與 iOS Assets 的 mark-color.svg 同一份圖形） */
export default function BrandMark({ size = 28, mono = false, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d="M50 16 A 37 37 0 0 1 50 84 A 37 37 0 0 1 50 16 Z"
        fill={mono ? 'currentColor' : '#5F8A57'}
      />
      <path
        d="M55 32 L41 53 L51 53 L46 69"
        fill="none" stroke="#fff" strokeWidth="6"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
