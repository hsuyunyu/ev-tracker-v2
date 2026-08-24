import React from 'react';
import { ntd } from '../split';

/** 統計列：大卡（總支出）+ 三個小卡，對應 iOS HomeView 的綠卡樣式 */
export default function StatsBar({ records }) {
  const totalCost = records.reduce((s, r) => s + (r.cost || 0), 0);
  const totalKwh  = records.reduce((s, r) => s + (r.kwh || 0), 0);
  // 平均電價只計有度數的充電費用（與 iOS AnalyticsView 相同，避免保險等費用灌進來）
  const chargingCost = records.filter(r => (r.kwh || 0) > 0).reduce((s, r) => s + (r.cost || 0), 0);
  const avgPerKwh = totalKwh > 0 ? chargingCost / totalKwh : 0;

  return (
    <div className="mb-4">
      <div className="bg-ww-greenbg border border-ww-greenline rounded-ww-lg p-5 mb-3">
        <div className="text-xs text-ww-greentitle font-medium mb-1">篩選範圍總支出</div>
        <div className="text-3xl font-bold text-ww-ink tabular-nums">{ntd(totalCost)}</div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <StatCard label="充電費用" value={ntd(chargingCost)} />
        <StatCard label="充電度數" value={`${totalKwh.toFixed(1)}`} unit="kWh" />
        <StatCard label="平均電價 /kWh" value={avgPerKwh > 0 ? `$${avgPerKwh.toFixed(2)}` : '—'} />
      </div>
    </div>
  );
}

function StatCard({ label, value, unit }) {
  return (
    <div className="bg-ww-card border border-ww-line rounded-ww-sm px-3 py-2.5">
      <div className="text-[11px] text-ww-sub mb-0.5">{label}</div>
      <div className="text-base font-bold text-ww-ink tabular-nums truncate">
        {value}
        {unit && <span className="text-[10px] font-medium text-ww-sub ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}
