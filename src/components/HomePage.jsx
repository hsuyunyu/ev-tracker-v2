import React, { useState } from 'react';
import { ArrowLeftRight, SquarePen, ChevronRight } from 'lucide-react';
import { buildTypeMap, resolveTypes } from '../typeConfig';
import { ntd } from '../split';
import { normalizeDue } from '../recurring';
import BrandMark from './BrandMark';

/**
 * 總覽頁 —— 對應 iOS HomeView。
 * 版面順序：頁首(問候+月份切換+頭像) → 本月支出綠卡 → 待結清 → 週期到期
 *          → 車輛卡 → 快速記一筆 → 最近記錄
 */

const pad = (n) => String(n).padStart(2, '0');

function greetingText() {
  const h = new Date().getHours();
  if (h < 5)  return '夜深了';
  if (h < 11) return '早安';
  if (h < 14) return '午安';
  if (h < 18) return '午後好';
  return '晚安';
}

const fmtInt = (v) => Math.round(v || 0).toLocaleString('en-US');
const fmtNum = (v) => (v === Math.round(v) ? String(Math.round(v)) : v.toFixed(1));

export default function HomePage({
  records, vehicles, mileageLogs, recurring, dueItems, balance, settings,
  user, defaultVehicleId,
  onOpenSettlement, onOpenRecurring, onOpenMileage, onOpenSettings,
  onQuickAdd, onOpenRecord, onSeeAllRecords,
}) {
  const [monthOffset, setMonthOffset] = useState(0);

  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + monthOffset);
  const monthPrefix = `${base.getFullYear()}-${pad(base.getMonth() + 1)}`;
  const monthLabel  = `${base.getFullYear()} 年 ${base.getMonth() + 1} 月`;

  const typeMap = buildTypeMap(settings.definedTypes);
  const types   = resolveTypes(settings.definedTypes);

  const monthRecords = records.filter(r => r.date?.startsWith(monthPrefix));
  const monthCost = monthRecords.reduce((s, r) => s + (r.cost || 0), 0);
  const monthKwh  = monthRecords.reduce((s, r) => s + (r.kwh  || 0), 0);
  // 平均電價只計充電費用，避免保險等非充電支出灌水（與 iOS 相同）
  const chargingCost = monthRecords.filter(r => (r.kwh || 0) > 0).reduce((s, r) => s + (r.cost || 0), 0);
  const avgPrice = monthKwh > 0 ? chargingCost / monthKwh : 0;

  const recent = records.slice(0, 5);

  const vehicle = vehicles.find(v => v.id === defaultVehicleId) ?? vehicles[0];
  const latestMileage = (() => {
    const all = [
      ...mileageLogs.filter(m => !vehicle || m.vehicleId === vehicle.id),
      ...records.filter(r => r.mileage && (!vehicle || r.vehicleId === vehicle.id))
        .map(r => ({ date: r.date, mileage: r.mileage })),
    ].filter(m => m.mileage !== '' && m.mileage != null);
    if (all.length === 0) return '—';
    all.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return Number(all[0].mileage).toLocaleString('en-US');
  })();

  const initial = (user?.displayName || settings.definedUsers?.[0] || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="pb-2">
      {/* 頁首 */}
      <div className="flex items-start justify-between px-0.5">
        <div>
          <p className="text-[13px] font-medium text-ww-sub">{greetingText()}</p>
          <div className="flex items-center gap-2.5 mt-0.5">
            <button onClick={() => setMonthOffset(o => o - 1)}
              className="text-ww-faint hover:text-ww-ink text-lg font-bold leading-none px-1">‹</button>
            <span className="text-[21px] font-extrabold text-ww-ink min-w-[104px] text-center tabular-nums">
              {monthLabel}
            </span>
            <button onClick={() => monthOffset < 0 && setMonthOffset(o => o + 1)}
              disabled={monthOffset >= 0}
              className={`text-lg font-bold leading-none px-1 ${
                monthOffset < 0 ? 'text-ww-faint hover:text-ww-ink' : 'text-ww-faint/40 cursor-default'
              }`}>›</button>
          </div>
        </div>
        <button onClick={onOpenSettings} aria-label="設定"
          className="w-10 h-10 rounded-full bg-[#211D17] text-white text-[15px] font-extrabold
                     flex items-center justify-center shrink-0">
          {initial}
        </button>
      </div>

      {/* 本月支出大綠卡 */}
      <div className="relative overflow-hidden bg-ww-greenbg border border-ww-greenline
                      rounded-ww-lg px-6 py-[22px] mt-[18px]">
        <div className="absolute -top-8 -right-2 w-36 h-36 rounded-full bg-ww-brand/10 pointer-events-none" />
        <div className="relative">
          <p className="text-[12.5px] font-semibold text-ww-greentitle">本月支出</p>
          <div className="flex items-baseline gap-1 mt-[7px]">
            <span className="text-[21px] font-bold text-ww-brand">NT$</span>
            <span className="text-[42px] leading-none font-extrabold text-ww-ink tabular-nums">
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
                     bg-ww-brand/10 border border-ww-brand/20 hover:bg-ww-brand/15 transition-colors">
          <span className="w-[34px] h-[34px] rounded-[10px] bg-ww-brand text-white
                           flex items-center justify-center shrink-0">
            <ArrowLeftRight size={15} strokeWidth={2.6} />
          </span>
          <span className="text-[13.5px] font-semibold text-ww-ink truncate">
            {balance.debtor} 還需付給 {balance.creditor} NT${fmtInt(balance.amount)}
          </span>
          <span className="ml-auto text-xs font-bold text-ww-brand shrink-0">結帳 ›</span>
        </button>
      )}

      {/* 週期到期 */}
      {dueItems.length > 0 && (
        <button onClick={onOpenRecurring}
          className="w-full mt-2.5 flex items-center gap-2.5 px-3.5 py-[11px] rounded-ww-sm
                     bg-ww-card border border-ww-line hover:bg-ww-seg transition-colors">
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
                     flex items-center gap-3.5 text-left bg-[#637558]">
          <span className="absolute -bottom-8 -right-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <span className="relative w-[46px] h-[46px] rounded-[13px] bg-ww-brand
                           flex items-center justify-center shrink-0">
            <BrandMark size={28} mono className="text-white" />
          </span>
          <span className="relative min-w-0">
            <span className="block text-[15px] font-bold text-white truncate">
              {vehicle.name || vehicle.licensePlate || '車輛'}
            </span>
            <span className="block text-xs font-medium text-[#B6AE9E] truncate">
              {vehicle.licensePlate || ''}
            </span>
          </span>
          <span className="relative ml-auto text-right shrink-0">
            <span className="flex items-center justify-end gap-1.5">
              <span className="text-[17px] font-extrabold text-white tabular-nums">{latestMileage}</span>
              <SquarePen size={12} className="text-[#B6AE9E]" strokeWidth={2.6} />
            </span>
            <span className="block text-[10.5px] font-medium text-[#B6AE9E]">目前里程 km</span>
          </span>
        </button>
      )}

      {/* 快速記一筆 */}
      <h2 className="text-base font-extrabold text-ww-ink mt-[22px] mb-3 px-0.5">快速記一筆</h2>
      <div className="flex gap-2.5 overflow-x-auto pb-0.5 px-0.5 -mx-0.5">
        {types.filter(t => t.id !== 'other').map(t => (
          <button key={t.id} onClick={() => onQuickAdd(t.id)}
            className="shrink-0 w-[66px] flex flex-col items-center gap-[7px]">
            <span className="w-[54px] h-[54px] rounded-[17px] flex items-center justify-center
                             text-xl font-bold transition-transform active:scale-95"
              style={{ backgroundColor: (t.color ?? '#8C8579') + '1F', color: t.color ?? '#8C8579' }}>
              {t.label.charAt(0)}
            </span>
            <span className="text-[11px] font-medium text-ww-ink2 truncate w-full text-center">
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* 最近記錄 */}
      <div className="flex items-center justify-between mt-6 mb-0.5 px-0.5">
        <h2 className="text-base font-extrabold text-ww-ink">最近記錄</h2>
        <button onClick={onSeeAllRecords} className="text-xs font-semibold text-ww-brand">
          查看全部 ›
        </button>
      </div>

      {recent.length === 0 ? (
        <p className="text-center text-[13px] text-ww-sub py-7">還沒有記錄</p>
      ) : (
        <div>
          {recent.map(r => {
            const t = typeMap[r.type];
            const color = t?.color ?? '#8C8579';
            return (
              <button key={r.id} onClick={() => onOpenRecord(r)}
                className="w-full flex items-center gap-3.5 py-3.5 border-b border-ww-line text-left">
                <span className="w-11 h-11 rounded-[14px] flex items-center justify-center
                                 text-[17px] font-bold shrink-0"
                  style={{ backgroundColor: color + '1F', color }}>
                  {(t?.label ?? '他').charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-ww-ink truncate">
                    {r.vendor || t?.label || r.type}
                  </span>
                  <span className="block text-xs font-medium text-ww-sub truncate">
                    {recentSub(r, t)}
                  </span>
                </span>
                <span className="text-base font-extrabold text-ww-ink tabular-nums shrink-0">
                  NT$ {fmtInt(r.cost)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCell({ value, unit, label }) {
  return (
    <div className="flex-1 bg-ww-card rounded-ww-inner px-[13px] py-[11px]">
      <div className="flex items-baseline">
        <span className="text-lg font-extrabold text-ww-ink tabular-nums">{value}</span>
        <span className="text-[11px] font-semibold text-ww-sub">{unit}</span>
      </div>
      <p className="text-[11px] text-ww-sub mt-0.5">{label}</p>
    </div>
  );
}

function recentSub(r, t) {
  const d = String(r.date || '').slice(0, 10);
  const short = d ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}` : '';
  return r.note ? `${short}・${r.note}` : `${short}・${t?.label ?? r.type}`;
}

function dueText(item, typeMap) {
  if (!item) return '';
  const label = typeMap[item.type]?.label ?? item.type;
  const name  = item.vendor || label;
  const due   = normalizeDue(item.nextDue);

  let when = '到期';
  if (due) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [y, m, d] = due.split('-').map(Number);
    const days = Math.round((new Date(y, m - 1, d) - today) / 86400000);
    when = days < 0 ? `已逾期 ${-days} 天` : days === 0 ? '今天到期' : `${days} 天後到期`;
  }
  return `${name}・${when}・NT$${fmtInt(item.cost)}`;
}
