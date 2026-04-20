import React, { useState, useRef, useEffect } from 'react';

export default function MultiSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  // value=[] means "all selected"
  const allSelected = value.length === 0;
  const isChecked = v => allSelected || value.includes(v);

  const toggle = v => {
    if (allSelected) {
      const next = options.map(o => o.value).filter(x => x !== v);
      onChange(next.length === options.length ? [] : next);
    } else if (value.includes(v)) {
      const next = value.filter(x => x !== v);
      onChange(next);
    } else {
      const next = [...value, v];
      onChange(next.length === options.length ? [] : next);
    }
  };

  const label = allSelected
    ? '全部'
    : value.length === 1
    ? (options.find(o => o.value === value[0])?.label ?? value[0])
    : `${value.length} 項`;

  const btnCls = 'text-sm border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-800 flex items-center gap-1.5 select-none cursor-pointer';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className={btnCls + ' text-gray-600 dark:text-neutral-300'}
      >
        <span>{placeholder}：{label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div onClick={e => e.stopPropagation()} className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-lg z-30 min-w-[150px] py-1">
          <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => onChange([])}
              className="accent-tesla"
            />
            <span className="text-sm text-gray-700 dark:text-neutral-200">全部</span>
          </label>
          <div className="border-t border-gray-100 dark:border-neutral-700 my-1" />
          {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked(opt.value)}
                onChange={() => toggle(opt.value)}
                className="accent-tesla"
              />
              <span className="text-sm text-gray-700 dark:text-neutral-200">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
