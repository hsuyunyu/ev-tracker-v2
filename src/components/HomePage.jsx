import React, { useState } from 'react';
import { ArrowLeftRight, SquarePen } from 'lucide-react';
import { buildTypeMap, resolveTypes } from '../typeConfig';
import { normalizeDue } from '../recurring';
import { displayMileage } from '../mileage';
import { fmtInt, fmtNum, pad2, shortDate, daysFromToday } from '../format';
import BrandMark from './BrandMark';
import { DarkAvatar, MonoTile } from './ui';

/**
 * 總覽頁 —— 對應 iOS HomeView。
 * 版面順序：頁首(問候+月份切換+頭像) → 本月支出綠卡 → 待結清 → 週期到期
 *          → 車輛卡 → 快速記一筆 → 最近記錄
 */

function greetingText(name) {
  const h = new Date().getHours();
  // 時段用語與 iOS HomeView.greeting 一致
  const g = h < 5 ? '夜深了' : h < 11 ? '早安' : h < 14 ? '午安' : h < 18 ? '下午好' : '晚安';
  return name ? `${g}，${name}` : g;
}

export default function HomePage({
  records, vehicles, mileageLogs, dueItems, balance, settings,
  displayName, defaultVehicleId,
  onOpenSettlement, onOpenRecurring, onOpenMileage, onOpenSettings,
  onQuickAdd, onOpenRecord, onSeeAllRecords,
}) {
  const [monthOffset, setMonthOffset] = useState(0);

  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + monthOffset);
  const monthPrefix = `${base.getFullYear()}-${pad2(base.getMonth() + 1)}`;
  const monthLabel  = `${base.getFullYear()}年${base.getMonth() + 1}月`;

  const typeMap = buildTypeMap(settings.definedTypes);
  const types   = resolveTypes(settings.definedTypes);

  const monthRecords = records.filter(r => r.date?.startsWith(monthPrefix));
  const monthCost = monthRecords.reduce((s, r) => s + (r.cost || 0), 0);
  const monthKwh  = monthRecords.reduce((s, r) => s + (r.kwh  || 0), 0);
  // 平均電價只計充電費用，避免保險等非充電支出灌水（與 iOS 相同）
  const chargingCost = monthRecords.filter(r => (r.kwh || 0) > 0).reduce((s, r) => s + (r.cost || 0), 0);
  const avgPrice = monthKwh > 0 ? chargingCost / monthKwh : 0;

  const recent = records.slice(0, 3);

  const vehicle = vehicles.find(v => v.id === defaultVehicleId) ?? vehicles[0];
  const latestMileage = displayMileage(records, mileageLogs, vehicle?.id, defaultVehicleId);

  const name = displayName || settings.definedUsers?.[0] || '';
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <div>
      {/* 頁首 */}
      <div className="flex items-start justify-between px-0.5 pt-2">
        <div>
          <p className="text-[13px] font-medium text-ww-sub">{greetingText(name)}</p>
          <div className="flex items-center gap-2.5 mt-[3px]">
            <button onClick={() => setMonthOffset(o => o - 1)} aria-label="上個月"
              className="text-ww-faint text-[17px] font-bold leading-none px-0.5">‹</button>
            <span className="text-[21px] font-extrabold text-ww-ink min-w-[104px] text-center tabular-nums">
              {monthLabel}
            </span>
            <button onClick={() => setMonthOffset(o => o + 1)} disabled={monthOffset >= 0} aria-label="下個月"
              className={`text-[17px] font-bold leading-none px-0.5 ${
                monthOffset < 0 ? 'text-ww-faint' : 'text-ww-faint/40'
              }`}>›</button>
          </div>
        </div>
        <button onClick={onOpenSettings} aria-label="設定">
          <DarkAvatar initial={initial} />
        </button>
      </div>

      {/* 本月支出大綠卡 */}
      <div className="relative overflow-hidden bg-ww-greenbg border border-ww-greenline
                      rounded-ww-lg px-6 py-[22px] mt-[18px]">
        <div className="absolute -top-[30px] -right-[30px] w-[140px] h-[140px] rounded-full bg-ww-brand/[0.12] pointer-events-none" />
        <div className="relative">
          <p className="text-[12.5px] font-semibold text-ww-greentitle">本月支出</p>
          <div className="flex items-baseline gap-1 mt-[7px]">
            <span className="text-[21px] font-bold text-ww-brand">NT$</span>
            <span className="text-[42px] leading-none font-extrabold text-ww-ink tabular-nums tracking-[-0.02em]">
              {fmtInt(monthCost)}
            </span>
          </div>
          <div className="flex gap-2.5 mt-[18px]">
            <StatCell value={fmtNum(monthKwh)} unit=" kWh" label="本月充電" />
            <StatCell value={`$${fmtNum(avgPrice)}`} unit="/kWh" label="平均電價" />
          </div>
        </div>
      </div>

      {/* 待結清 */}
      {balance && (
        <button onClick={onOpenSettlement}
          className="w-full mt-[13px] flex items-center gap-3 px-4 py-[13px] rounded-[18px]
                     bg-ww-brand/10 border border-ww-brand/[0.22] text-left active:opacity-70">
          <span className="w-[34px] h-[34px] rounded-[10px] bg-ww-brand text-white
                           flex items-center justify-center shrink-0">
            <ArrowLeftRight size={15} strokeWidth={2.6} />
          </span>
          <span className="text-[13.5px] font-semibold text-ww-ink truncate">
            {balance.debtor} 還需付給 {balance.creditor} NT${fmtInt(balance.amount)}
          </span>
          <span className="ml-auto text-[12px] font-bold text-ww-brand shrink-0">結帳 ›</span>
        </button>
      )}

      {/* 週期到期 */}
      {dueItems.length > 0 && (
        <button onClick={onOpenRecurring}
          className="w-full mt-2.5 flex items-center gap-2.5 px-3.5 py-[11px] rounded-ww-sm
                     bg-ww-card shadow-[0_1px_3px_rgba(0,0,0,.05)] text-left active:opacity-70">
          <span className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: typeMap[dueItems[0].type]?.color ?? '#C8A24C' }} />
          <span className="text-[12.5px] font-semibold text-ww-ink2 truncate">
            {dueText(dueItems[0], typeMap)}
          </span>
          <span className="ml-auto text-[11px] font-bold text-ww-sub shrink-0">查看</span>
        </button>
      )}

      {/* 車輛卡 */}
      {vehicle && (
        <button onClick={onOpenMileage}
          className="w-full mt-[13px] relative overflow-hidden rounded-[20px] px-[18px] py-[17px]
                     flex items-center gap-3.5 text-left bg-[#637558] active:opacity-90">
          <span className="absolute -bottom-[30px] -right-[24px] w-[120px] h-[120px] rounded-full bg-white/5 pointer-events-none" />
          <span className="relative w-[46px] h-[46px] rounded-[13px] bg-ww-brand
                           flex items-center justify-center shrink-0">
            <BrandMark size={28} variant="white" />
          </span>
          <span className="relative min-w-0">
            <span className="block text-[15px] font-bold text-white truncate">
              {vehicle.name || vehicle.licensePlate || '車輛'}
            </span>
            <span className="block mt-0.5 text-[12px] font-medium text-[#B6AE9E] truncate">
              {vehicle.licensePlate}
            </span>
          </span>
          <span className="relative ml-auto text-right shrink-0">
            <span className="flex items-center justify-end gap-[5px]">
              <span className="text-[17px] font-extrabold text-white tabular-nums">{latestMileage}</span>
              <SquarePen size={12} className="text-[#B6AE9E]" strokeWidth={2.6} />
            </span>
            <span className="block mt-px text-[10.5px] font-medium text-[#B6AE9E]">目前里程 km</span>
          </span>
        </button>
      )}

      {/* 快速記一筆 */}
      <h2 className="text-[16px] font-extrabold text-ww-ink mt-[22px] mb-3 px-0.5">快速記一筆</h2>
      <div className="ww-noscroll flex gap-2.5 overflow-x-auto pb-0.5 px-0.5">
        {types.filter(t => t.id !== 'other').map(t => (
          <button key={t.id} onClick={() => onQuickAdd(t.id)}
            className="shrink-0 w-[66px] flex flex-col items-center gap-[7px] active:opacity-70">
            <MonoTile type={t} size={54} radius={17} fontSize={20} />
            <span className="text-[11px] font-medium text-ww-ink2 truncate w-full text-center">
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* 最近記錄 */}
      <div className="flex items-center justify-between mt-6 mb-0.5 px-0.5">
        <h2 className="text-[16px] font-extrabold text-ww-ink">最近記錄</h2>
        <button onClick={onSeeAllRecords} className="text-[12px] font-semibold text-ww-brand">
          查看全部 ›
        </button>
      </div>

      {recent.length === 0 ? (
        <p className="text-center text-[13px] text-ww-sub py-7">還沒有記錄</p>
      ) : recent.map(r => {
        const t = typeMap[r.type];
        return (
          <button key={r.id} onClick={() => onOpenRecord(r)}
            className="w-full flex items-center gap-3.5 py-3.5 border-b border-ww-line text-left active:opacity-70">
            <MonoTile type={t} />
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold text-ww-ink truncate">
                {r.vendor || t?.label || r.type}
              </span>
              <span className="block mt-1 text-[12px] font-medium text-ww-sub truncate">
                {shortDate(r.date)}・{r.note || t?.label || r.type}
              </span>
            </span>
            <span className="text-[16px] font-extrabold text-ww-ink tabular-nums shrink-0">
              NT$ {fmtInt(r.cost)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StatCell({ value, unit, label }) {
  return (
    <div className="flex-1 bg-ww-card rounded-ww-inner px-[13px] py-[11px]">
      <div className="flex items-baseline">
        <span className="text-[18px] font-extrabold text-ww-ink tabular-nums">{value}</span>
        <span className="text-[11px] font-semibold text-ww-sub whitespace-pre">{unit}</span>
      </div>
      <p className="text-[11px] text-ww-sub mt-0.5">{label}</p>
    </div>
  );
}

function dueText(item, typeMap) {
  if (!item) return '';
  const label = typeMap[item.type]?.label ?? item.type;
  const name  = item.vendor || label;
  const due   = normalizeDue(item.nextDue);

  let when = '到期';
  if (due) {
    const days = daysFromToday(due);
    when = days < 0 ? `已逾期 ${-days} 天` : days === 0 ? '今天到期' : `${days} 天後到期`;
  }
  return `${name}・${when}・NT$${fmtInt(item.cost)}`;
}
