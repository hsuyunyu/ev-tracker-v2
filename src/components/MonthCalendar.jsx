import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * 月曆卡 —— 對應 iOS RecordsView 的 MonthCalendarView。
 * 每格顯示日期與當日支出小計，可點選單日篩選；點前/後月的灰色日期會切換月份。
 */
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

const daysIn = (y, m) => new Date(y, m, 0).getDate();

/** 該月 1 號的星期偏移（週一為 0，與 iOS 相同） */
function firstOffset(y, m) {
  const wd = new Date(y, m - 1, 1).getDay();  // 0=週日
  return (wd + 6) % 7;
}

function isWeekend(y, m, d) {
  const wd = new Date(y, m - 1, d).getDay();
  return wd === 0 || wd === 6;
}

export default function MonthCalendar({
  records, year, month, selectedDate, onSelectDate, onChangeMonth,
}) {
  const monthStr = `${year}-${pad(month)}`;

  // 當月每日支出小計
  const dailyTotals = {};
  for (const r of records) {
    if (!r.date?.startsWith(monthStr)) continue;
    const d = Number(r.date.slice(8, 10));
    dailyTotals[d] = (dailyTotals[d] || 0) + (r.cost || 0);
  }

  const offset   = firstOffset(year, month);
  const total    = daysIn(year, month);
  const prevDays = daysIn(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
  const trailing = (offset + total) % 7 === 0 ? 0 : 7 - ((offset + total) % 7);

  const now = new Date();
  const today = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };

  const movePrev = () => onChangeMonth(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
  const moveNext = () => onChangeMonth(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);

  const cells = [];

  // 上個月的尾巴
  for (let i = 0; i < offset; i++) {
    const d = prevDays - offset + 1 + i;
    cells.push(
      <DayCell key={`p${d}`} label={d} gray onClick={movePrev}
        weekend={isWeekend(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1, d)} />
    );
  }

  // 當月
  for (let d = 1; d <= total; d++) {
    const dateStr = ymd(year, month, d);
    const selected = selectedDate === dateStr;
    const isToday = year === today.y && month === today.m && d === today.d;
    cells.push(
      <DayCell
        key={d} label={d} total={dailyTotals[d]}
        weekend={isWeekend(year, month, d)}
        selected={selected} today={isToday}
        onClick={() => onSelectDate(selected ? '' : dateStr)}
      />
    );
  }

  // 下個月的開頭
  for (let d = 1; d <= trailing; d++) {
    cells.push(
      <DayCell key={`n${d}`} label={d} gray onClick={moveNext}
        weekend={isWeekend(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, d)} />
    );
  }

  return (
    <div className="bg-ww-card border border-ww-line rounded-ww-list p-3">
      {/* 月份切換 */}
      <div className="flex items-center justify-between px-1 mb-2">
        <button onClick={movePrev} aria-label="上個月"
          className="w-8 h-8 flex items-center justify-center rounded-full text-ww-faint
                     hover:text-ww-ink hover:bg-ww-seg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold text-ww-ink tabular-nums">{year} 年 {month} 月</span>
        <button onClick={moveNext} aria-label="下個月"
          className="w-8 h-8 flex items-center justify-center rounded-full text-ww-faint
                     hover:text-ww-ink hover:bg-ww-seg transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 星期列 */}
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`text-center text-[10px] font-semibold pb-1 ${
            i >= 5 ? 'text-ww-brand' : 'text-ww-sub'
          }`}>{w}</div>
        ))}
      </div>

      {/* 日期格 */}
      <div className="grid grid-cols-7 gap-0.5">{cells}</div>
    </div>
  );
}

function DayCell({ label, total, gray, weekend, selected, today, onClick }) {
  const textCls = selected ? 'text-white'
    : gray    ? 'text-ww-faint/50'
    : today   ? 'text-ww-brand font-bold'
    : weekend ? 'text-ww-brand'
    : 'text-ww-ink';

  const boxCls = selected ? 'bg-ww-brand'
    : today   ? 'ring-1.5 ring-ww-brand ring-inset'
    : '';

  return (
    <button
      onClick={onClick}
      className={`min-h-[46px] rounded-lg flex flex-col items-center justify-center gap-px
                  transition-colors ${boxCls} ${!selected && !gray ? 'hover:bg-ww-seg' : ''}`}
      style={today && !selected ? { boxShadow: 'inset 0 0 0 1.5px #6E9266' } : undefined}
    >
      <span className={`text-sm leading-none ${textCls}`}>{label}</span>
      {total > 0 && !gray ? (
        <span className={`text-[8px] leading-none tabular-nums ${
          selected ? 'text-white/85' : 'text-ww-sub'
        }`}>
          {total >= 10000 ? `-${Math.round(total / 1000)}k` : `-${Math.round(total)}`}
        </span>
      ) : (
        <span className="h-[10px]" />
      )}
    </button>
  );
}
