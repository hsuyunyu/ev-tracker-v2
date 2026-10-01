import React, { useMemo, useState } from 'react';
import { Search, XCircle, CreditCard } from 'lucide-react';
import { buildTypeMap, resolveTypes } from '../typeConfig';
import { hasSplit } from '../split';
import { fmtInt, pad2, shortDateWeekday, longDateWeekday } from '../format';
import MonthCalendar, { prevMonth, nextMonth } from './MonthCalendar';
import {
  FilterMenu, MonoTile, PageTitle, PillButton, SORT_OPTIONS, sortRecords,
} from './ui';

/**
 * 記錄頁 —— 對應 iOS RecordsView。
 * 大標題 + 迷你月份切換 → 搜尋卡 → 月曆卡 → 選定日 chip → 篩選 chips → 列表工具列 → 記錄卡。
 * 到期提醒與待結清在總覽頁（與 iOS 相同）。
 */
export default function RecordsPage({
  records, vehicles, settings,
  calYear, calMonth, selectedDay, onSelectDay, onChangeMonth,
  onOpenRecord,
}) {
  const [filterTypes, setFilterTypes]     = useState([]);
  const [filterUsers, setFilterUsers]     = useState([]);
  const [filterVehicle, setFilterVehicle] = useState('');
  const [search, setSearch]               = useState('');
  const [sortMode, setSortMode]           = useState('date_desc');
  const [showSplit, setShowSplit]         = useState(false);

  const types   = resolveTypes(settings.definedTypes);
  const typeMap = buildTypeMap(settings.definedTypes);
  const members = settings.definedUsers;
  const monthStr = `${calYear}-${pad2(calMonth)}`;

  const extraFiltering =
    filterTypes.length > 0 || filterUsers.length > 0 || !!filterVehicle || !!selectedDay || !!search;

  const clearFilters = () => {
    setFilterTypes([]); setFilterUsers([]); setFilterVehicle(''); setSearch(''); onSelectDay('');
  };

  // 類型 / 成員 / 車輛篩選（成員：主要支出人 OR 金額 > 0 的分攤參與者）
  const matchesChips = (r) => {
    if (filterTypes.length && !filterTypes.includes(r.type)) return false;
    if (filterVehicle && r.vehicleId !== filterVehicle) return false;
    if (filterUsers.length) {
      const main  = filterUsers.includes(r.user);
      const split = (r.splitEntries || []).some(e => filterUsers.includes(e.user) && e.amount > 0);
      if (!main && !split) return false;
    }
    return true;
  };

  // 月曆上的小計套用 chips 篩選，但不受選定日與搜尋影響
  const calendarRecords = useMemo(
    () => records.filter(matchesChips),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, filterTypes, filterUsers, filterVehicle]
  );

  const display = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = calendarRecords.filter(r => {
      if (!r.date?.startsWith(monthStr)) return false;
      if (selectedDay && !r.date.startsWith(selectedDay)) return false;
      if (q) {
        const hit = (r.vendor || '').toLowerCase().includes(q)
          || (r.note || '').toLowerCase().includes(q)
          || String(Math.trunc(r.cost || 0)).includes(q);
        if (!hit) return false;
      }
      return true;
    });
    return sortRecords(filtered, sortMode, typeMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarRecords, monthStr, selectedDay, search, sortMode]);

  const sortShort = SORT_OPTIONS.find(o => o.value === sortMode)?.short ?? '日期降序';

  return (
    <div>
      <PageTitle right={
        <div className="flex items-center gap-2">
          <button onClick={() => onChangeMonth(...prevMonth(calYear, calMonth))} aria-label="上個月"
            className="text-[16px] font-bold text-ww-faint px-1">‹</button>
          <span className="text-[13px] font-bold text-ww-ink2 tabular-nums">{calYear}年{calMonth}月</span>
          <button onClick={() => onChangeMonth(...nextMonth(calYear, calMonth))} aria-label="下個月"
            className="text-[16px] font-bold text-ww-faint px-1">›</button>
        </div>
      }>
        費用記錄
      </PageTitle>

      {/* 搜尋卡 */}
      <label className="mt-3 flex items-center gap-2.5 px-3.5 py-[11px] bg-ww-card border border-ww-line rounded-[14px]">
        <Search size={15} strokeWidth={2.6} className="text-ww-faint shrink-0" />
        <input
          type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜尋商家、備註或金額" enterKeyHint="search"
          className="flex-1 min-w-0 bg-transparent text-[14px] text-ww-ink outline-none
                     [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} aria-label="清除搜尋">
            <XCircle size={17} className="text-ww-sub" fill="currentColor" stroke="rgb(var(--ww-card))" />
          </button>
        )}
      </label>

      {/* 月曆卡 */}
      <div className="mt-3.5">
        <MonthCalendar
          records={calendarRecords} year={calYear} month={calMonth}
          selectedDate={selectedDay} onSelectDate={onSelectDay} onChangeMonth={onChangeMonth}
        />
      </div>

      {/* 選定日 chip */}
      {selectedDay && (
        <div className="mt-3 flex items-center gap-2">
          <span className="px-[13px] py-[6px] rounded-full bg-ww-brand/10 text-ww-brand text-[13px] font-bold">
            {longDateWeekday(selectedDay)}
          </span>
          <button onClick={() => onSelectDay('')} className="text-[12px] font-semibold text-ww-sub">
            清除 ✕
          </button>
        </div>
      )}

      {/* 篩選 chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2 px-0.5">
        <FilterMenu
          label="類型" allLabel="全部類型" multi
          options={types.map(t => ({ value: t.id, label: t.label }))}
          value={filterTypes} onChange={setFilterTypes}
        />
        <FilterMenu
          label="成員" allLabel="全部成員" multi
          options={members.map(u => ({ value: u, label: u }))}
          value={filterUsers} onChange={setFilterUsers}
        />
        {vehicles.length > 1 && (
          <FilterMenu
            label="車輛" allLabel="全部車輛"
            options={vehicles.map(v => ({ value: v.id, label: v.name || v.licensePlate }))}
            value={filterVehicle} onChange={setFilterVehicle}
          />
        )}
        {extraFiltering && (
          <button onClick={clearFilters} aria-label="清除篩選">
            <XCircle size={24} className="text-ww-sub" fill="currentColor" stroke="rgb(var(--ww-bg))" />
          </button>
        )}
      </div>

      {/* 列表工具列 */}
      <div className="mt-3.5 flex items-center justify-between px-0.5">
        <span className="text-[12.5px] font-semibold text-ww-sub">{display.length} 筆</span>
        <div className="flex items-center gap-2">
          <PillButton active={showSplit} onClick={() => setShowSplit(v => !v)}>分攤細節</PillButton>
          <FilterMenu
            align="right" options={SORT_OPTIONS} value={sortMode} onChange={setSortMode}
            trigger={
              <span className="block px-3 py-[6px] rounded-full text-[12px] font-semibold border
                               bg-ww-card border-ww-line2 text-ww-ink2 whitespace-nowrap">
                ⇅ {sortShort}
              </span>
            }
          />
        </div>
      </div>

      {/* 記錄卡 */}
      {display.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12">
          {extraFiltering
            ? <Search size={40} className="text-ww-faint" />
            : <CreditCard size={40} className="text-ww-faint" />}
          <p className="text-[15px] font-semibold text-ww-sub">
            {extraFiltering ? '找不到符合的記錄' : '本月尚無費用記錄'}
          </p>
          {extraFiltering && (
            <button onClick={clearFilters} className="text-[15px] text-ww-brand">清除篩選</button>
          )}
        </div>
      ) : (
        <div className="mt-1.5 flex flex-col gap-2">
          {display.map(r => (
            <RecordCard key={r.id} record={r} type={typeMap[r.type]} showSplit={showSplit}
              onClick={() => onOpenRecord(r)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecordCard({ record: r, type: t, showSplit, onClick }) {
  const split = hasSplit(r);
  const extra = r.note || t?.label || '';
  const date  = shortDateWeekday(r.date);

  return (
    <button onClick={onClick}
      className="w-full text-left bg-ww-card border border-ww-line rounded-[14px] px-3.5 py-3 active:opacity-70">
      <div className="flex items-center gap-3.5">
        <MonoTile type={t} size={42} radius={13} fontSize={16} />
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold text-ww-ink truncate">
            {r.vendor || t?.label || r.type}
          </div>
          <div className="mt-1 flex items-center gap-[7px] min-w-0">
            {split && (
              <span className="px-[7px] py-[2px] rounded-[6px] bg-ww-brand/10 text-ww-brand
                               text-[10px] font-bold shrink-0">分攤</span>
            )}
            <span className="text-[12px] font-medium text-ww-sub truncate">
              {extra ? `${date}・${extra}` : date}
            </span>
          </div>
        </div>
        <div className="text-[16px] font-extrabold text-ww-ink tabular-nums shrink-0">
          NT$ {fmtInt(r.cost)}
        </div>
      </div>

      {showSplit && split && (
        <div className="mt-2.5 pt-2.5 border-t border-dashed border-ww-line2">
          <div className="text-[10.5px] font-semibold text-ww-sub tracking-[0.4px] mb-1">分攤金額</div>
          {r.splitEntries.filter(e => e.amount > 0).map(e => (
            <div key={e.user} className="flex justify-between py-0.5 text-[11.5px] text-ww-ink2">
              <span>{e.user}</span>
              <span className="tabular-nums">NT$ {fmtInt(e.amount)}</span>
            </div>
          ))}
          {r.paidBy && (
            <div className="mt-1.5 pt-1.5 border-t border-ww-line flex justify-between items-center">
              <span className="text-[10.5px] font-semibold text-ww-sub">代墊：{r.paidBy}</span>
              <span className="text-[11px] font-semibold text-ww-ink2 tabular-nums">NT$ {fmtInt(r.cost)}</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}
