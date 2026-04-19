import React from 'react';

export default function StatsBar({ records }) {
  const totalCost = records.reduce((s, r) => s + (r.cost || 0), 0);
  const chargingCost = records
    .filter(r => r.type === 'charging')
    .reduce((s, r) => s + (r.cost || 0), 0);
  const totalKwh = records
    .filter(r => r.type === 'charging')
    .reduce((s, r) => s + (r.kwh || 0), 0);
  const tollsCost = records
    .filter(r => r.type === 'tolls')
    .reduce((s, r) => s + (r.cost || 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <StatCard label="總費用" value={`$${totalCost.toLocaleString()}`} color="blue" />
      <StatCard label="充電費用" value={`$${chargingCost.toLocaleString()}`} color="green" />
      <StatCard label="充電度數" value={`${totalKwh.toFixed(1)} kWh`} color="yellow" />
      <StatCard label="過路費" value={`$${tollsCost.toLocaleString()}`} color="orange" />
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    orange: 'bg-orange-50 text-orange-700',
  };
  return (
    <div className={`rounded-xl p-3 ${colors[color]}`}>
      <div className="text-xs opacity-60 mb-1">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
