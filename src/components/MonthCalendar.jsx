import React from 'react';
import { pad2 } from '../format';

/**
 * 月曆 —— 對應 iOS RecordsView 的 MonthCalendarView。
 * 每格顯示日期與當日支出小計，可點選單日篩選；點前/後月的灰色日期會切換月份。
 * 月份切換按鈕在記錄頁標題列（與 iOS 相同），這裡只有星期列與日期格。
 */
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

const daysIn = (y, m) => new Date(y, m, 0).getDate();

/** 該月 1 號的星期偏移（週一為 0，與 iOS 相同） */
const firstOffset = (y, m) => (new Date(y, m - 1, 1).getDay() + 6) % 7;

function isWeekend(y, m, d) {
  const wd = new Date(y, m - 1, d).getDay();
  return wd === 0 || wd === 6;
}

export const prevMonth = (y, m) => (m === 1 ? [y - 1, 12] : [y, m - 1]);
export const nextMonth = (y, m) => (m === 12 ? [y + 1, 1] : [y, m + 1]);

export default function MonthCalendar({
  records, year, month, selectedDate, onSelectDate, onChangeMonth,
}) {
  const monthStr = `${year}-${pad2(month)}`;

  // 當月每日支出小計
  const dailyTotals = {};
  for (const r of records) {
    if (!r.date?.startsWith(monthStr)) continue;
    const d = Number(r.date.slice(8, 10));
    dailyTotals[d] = (dailyTotals[d] || 0) + (r.cost || 0);
  }

  const offset   = firstOffset(year, month);
  const total    = daysIn(year, month);
  const [py, pm] = prevMonth(year, month);
  const [ny, nm] = nextMonth(year, month);
  const prevDays = daysIn(py, pm);
  const trailing = (offset + total) % 7 === 0 ? 0 : 7 - ((offset + total) % 7);

  const now = new Date();
  const isThisMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const cells = [];

  for (let i = 0; i < offset; i++) {
    const d = prevDays - offset + 1 + i;
    cells.push(
      <DayCell key={`p${d}`} label={d} gray weekend={isWeekend(py, pm, d)}
        onClick={() => onChangeMonth(py, pm)} />
    );
  }

  for (let d = 1; d <= total; d++) {
    const dateStr = `${monthStr}-${pad2(d)}`;
    const selected = selectedDate === dateStr;
    cells.push(
      <DayCell
        key={d} label={d} total={dailyTotals[d]}
        weekend={isWeekend(year, month, d)}
        selected={selected} today={isThisMonth && d === now.getDate()}
        onClick={() => onSelectDate(selected ? '' : dateStr)}
      />
    );
  }

  for (let d = 1; d <= trailing; d++) {
    cells.push(
      <DayCell key={`n${d}`} label={d} gray weekend={isWeekend(ny, nm, d)}
        onClick={() => onChangeMonth(ny, nm)} />
    );
  }

  return (
    <div className="bg-ww-card border border-ww-line rounded-[20px] px-3.5 pt-3.5 pb-4">
      <div className="grid grid-cols-7 mb-2.5">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`text-center text-[10px] font-semibold ${
            i >= 5 ? 'text-ww-brand' : 'text-ww-sub'
          }`}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">{cells}</div>
    </div>
  );
}

function DayCell({ label, total, gray, weekend, selected, today, onClick }) {
  const textCls = selected ? 'text-white'
    : gray    ? 'text-ww-faint/50'
    : today   ? 'text-ww-brand font-bold'
    : weekend ? 'text-ww-brand'
    : 'text-ww-ink';

  return (
    <button
      onClick={onClick}
      className={`min-h-[46px] rounded-lg flex flex-col items-center justify-center gap-px ${
        selected ? 'bg-ww-brand' : ''
      }`}
      style={today && !selected ? { boxShadow: 'inset 0 0 0 1.5px #6E9266' } : undefined}
    >
      <span className={`text-[15px] leading-tight ${textCls}`}>{label}</span>
      {total > 0 && !gray ? (
        <span className={`text-[8px] leading-none h-[10px] tabular-nums ${
          selected ? 'text-white/85' : 'text-ww-sub'
        }`}>
          {total >= 10000 ? `-${Math.trunc(total / 1000)}k` : `-${Math.trunc(total)}`}
        </span>
      ) : (
        <span className="h-[10px]" />
      )}
    </button>
  );
}
