import React from 'react';

export default function StatsBar({ records }) {
  const totalCost    = records.reduce((s, r) => s + (r.cost || 0), 0);
  const chargingCost = records.filter(r => r.type === 'charging').reduce((s, r) => s + (r.cost || 0), 0);
  const totalKwh     = records.filter(r => r.type === 'charging').reduce((s, r) => s + (r.kwh  || 0), 0);
  const tollsCost    = records.filter(r => r.type === 'tolls').reduce((s, r) => s + (r.cost || 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <StatCard label="總費用"   value={`$${totalCost.toLocaleString()}`}      accent />
      <StatCard label="充電費用" value={`$${chargingCost.toLocaleString()}`} />
      <StatCard label="充電度數" value={`${totalKwh.toFixed(1)} kWh`} />
      <StatCard label="過路費"   value={`$${tollsCost.toLocaleString()}`} />
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`rounded-xl p-3 border transition-colors ${
      accent
        ? 'bg-tesla/10 border-tesla/30 dark:bg-tesla/20 dark:border-tesla/40'
        : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800'
    }`}>
      <div className={`text-xs mb-1 ${accent ? 'text-tesla' : 'text-gray-400 dark:text-neutral-500'}`}>
        {label}
      </div>
      <div className={`text-lg font-bold ${accent ? 'text-tesla' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </div>
    </div>
  );
}
