import React, { useState, useMemo, useDeferredValue } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import MultiSelect from './MultiSelect';
import { resolveTypes } from '../typeConfig';
import { ntd } from '../split';

function Card({ title, children }) {
  return (
    <div className="bg-ww-card border border-ww-line rounded-ww-list p-4">
      <h3 className="text-sm font-semibold text-ww-ink mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="text-center py-10 text-ww-sub text-sm">無資料</div>;
}

export default function AnalyticsPage({ records, mileageLogs = [], darkMode, definedUsers, definedTypes }) {
  const types = resolveTypes(definedTypes);
  const TYPE_LABELS  = Object.fromEntries(types.map(t => [t.id, t.label]));
  const TYPE_COLORS  = Object.fromEntries(types.map(t => [t.id, t.color]));
  const TYPE_IDS     = types.map(t => t.id);
  const TYPE_OPTIONS = types.map(t => ({ value: t.id, label: t.label }));

  const todayStr = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  };

  const [startDate,   setStartDate]   = useState(sixMonthsAgo);
  const [endDate,     setEndDate]     = useState(todayStr);
  const [filterTypes, setFilterTypes] = useState([]);
  const [filterUsers, setFilterUsers] = useState([]);

  const deferredStart = useDeferredValue(startDate);
  const deferredEnd   = useDeferredValue(endDate);
  const deferredTypes = useDeferredValue(filterTypes);
  const deferredUsers = useDeferredValue(filterUsers);

  const userOptions = useMemo(() => definedUsers.map(u => ({ value: u, label: u })), [definedUsers]);

  const filtered = useMemo(() => records.filter(r => {
    const d = r.date?.slice(0, 10) ?? '';
    if (deferredStart && d < deferredStart) return false;
    if (deferredEnd   && d > deferredEnd)   return false;
    if (deferredTypes.length > 0 && !deferredTypes.includes(r.type)) return false;
    if (deferredUsers.length > 0) {
      const isMainUser  = deferredUsers.includes(r.user);
      const isSplitUser = (r.splitEntries || []).some(e => deferredUsers.includes(e.user) && e.amount > 0);
      if (!isMainUser && !isSplitUser) return false;
    }
    return true;
  }), [records, deferredStart, deferredEnd, deferredTypes, deferredUsers]);

  const monthlyData = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const m = r.date?.slice(0, 7);
      if (!m) return;
      if (!map[m]) {
        map[m] = { month: m };
        TYPE_IDS.forEach(id => { map[m][id] = 0; });
      }
      map[m][r.type] = (map[m][r.type] || 0) + (r.cost || 0);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered, TYPE_IDS]);

  // 里程趨勢：純里程記錄 + 費用記錄帶的里程
  const mileageData = useMemo(() => {
    const fromRecords = records
      .filter(r => r.mileage && !isNaN(Number(r.mileage)))
      .map(r => ({ date: r.date?.slice(0, 10) ?? '', km: Number(r.mileage) }));
    const fromLogs = mileageLogs
      .filter(l => Number(l.mileage) > 0)
      .map(l => ({ date: l.date?.slice(0, 10) ?? '', km: Number(l.mileage) }));
    return [...fromRecords, ...fromLogs].sort((a, b) => a.date.localeCompare(b.date));
  }, [records, mileageLogs]);

  const breakdownData = useMemo(() => {
    const map = {};
    filtered.forEach(r => { map[r.type] = (map[r.type] || 0) + (r.cost || 0); });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([type, value]) => ({ name: TYPE_LABELS[type] ?? type, value, type }));
  }, [filtered, TYPE_LABELS]);

  // 充電商家統計（只計有度數的記錄，與 iOS AnalyticsView 一致）
  const vendorStats = useMemo(() => {
    const map = {};
    filtered.filter(r => (r.kwh || 0) > 0).forEach(r => {
      const key = r.vendor || '（未填商家）';
      if (!map[key]) map[key] = { vendor: key, cost: 0, kwh: 0, count: 0 };
      map[key].cost += r.cost || 0;
      map[key].kwh  += r.kwh  || 0;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }, [filtered]);

  const totalCost = filtered.reduce((s, r) => s + (r.cost || 0), 0);
  const totalKwh  = filtered.reduce((s, r) => s + (r.kwh  || 0), 0);
  const chargingCost = filtered.filter(r => (r.kwh || 0) > 0).reduce((s, r) => s + (r.cost || 0), 0);
  const avgPerKwh = totalKwh > 0 ? chargingCost / totalKwh : 0;

  const g = darkMode
    ? { grid: '#34302A', text: '#968F80', bg: '#24211A', border: '#383229', ink: '#F3EFE6' }
    : { grid: '#ECE6DA', text: '#8C8579', bg: '#FCFBF6', border: '#E3DCCD', ink: '#211D17' };

  const ttStyle = {
    backgroundColor: g.bg,
    border: `1px solid ${g.border}`,
    borderRadius: 14,
    color: g.ink,
    fontSize: 12,
  };

  const inputCls =
    'text-sm border border-ww-line2 rounded-ww-inner px-3 py-1.5 text-ww-ink2 bg-ww-field ' +
    'focus:outline-none focus:border-ww-brand transition-colors';

  return (
    <div className="space-y-4">
      {/* 篩選 */}
      <div className="bg-ww-card border border-ww-line rounded-ww-list p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ww-sub">從</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
            <span className="text-xs text-ww-sub">到</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
          </div>

          <MultiSelect options={TYPE_OPTIONS} value={filterTypes} onChange={setFilterTypes} placeholder="類別" />
          <MultiSelect options={userOptions}  value={filterUsers} onChange={setFilterUsers} placeholder="成員" />
        </div>
      </div>

      {/* 統計摘要 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat label="總費用"   value={ntd(totalCost)} hero />
        <Stat label="充電費用" value={ntd(chargingCost)} />
        <Stat label="充電度數" value={`${totalKwh.toFixed(1)}`} unit="kWh" />
        <Stat label="平均電價 /kWh" value={avgPerKwh > 0 ? `$${avgPerKwh.toFixed(2)}` : '—'} />
      </div>

      <Card title="每月費用趨勢">
        {monthlyData.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={g.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: g.text }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11, fill: g.text }} axisLine={false} tickLine={false} width={58} />
              <Tooltip contentStyle={ttStyle} formatter={(v, name) => [ntd(v), TYPE_LABELS[name] ?? name]} />
              <Legend formatter={name => TYPE_LABELS[name] ?? name} wrapperStyle={{ fontSize: 12 }} />
              {TYPE_IDS.map((id, i) => (
                <Bar key={id} dataKey={id} stackId="a" fill={TYPE_COLORS[id]}
                  radius={i === TYPE_IDS.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="費用分佈">
          {breakdownData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={breakdownData} cx="50%" cy="50%" innerRadius={55} outerRadius={82}
                  dataKey="value" paddingAngle={3}>
                  {breakdownData.map(e => (
                    <Cell key={e.type} fill={TYPE_COLORS[e.type] ?? '#8C8579'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={ttStyle} formatter={v => [ntd(v)]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="里程趨勢">
          {mileageData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mileageData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={g.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: g.text }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: g.text }} axisLine={false} tickLine={false} width={52} />
                <Tooltip contentStyle={ttStyle} formatter={v => [`${Number(v).toLocaleString()} km`]} />
                <Line type="monotone" dataKey="km" stroke="#6E9266" strokeWidth={2}
                  dot={{ fill: '#6E9266', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* 充電商家統計 */}
      <Card title="充電商家統計">
        {vendorStats.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[380px]">
              <thead>
                <tr className="text-ww-sub text-xs">
                  <th className="text-left  px-2 py-1.5 font-medium">商家</th>
                  <th className="text-right px-2 py-1.5 font-medium">次數</th>
                  <th className="text-right px-2 py-1.5 font-medium">度數</th>
                  <th className="text-right px-2 py-1.5 font-medium">金額</th>
                  <th className="text-right px-2 py-1.5 font-medium">均價</th>
                </tr>
              </thead>
              <tbody>
                {vendorStats.map(v => (
                  <tr key={v.vendor} className="border-t border-ww-line3">
                    <td className="px-2 py-2 text-ww-ink">{v.vendor}</td>
                    <td className="px-2 py-2 text-right text-ww-ink2 tabular-nums">{v.count}</td>
                    <td className="px-2 py-2 text-right text-ww-ink2 tabular-nums">{v.kwh.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right text-ww-ink font-medium tabular-nums">{ntd(v.cost)}</td>
                    <td className="px-2 py-2 text-right text-ww-ink2 tabular-nums">
                      ${(v.kwh > 0 ? v.cost / v.kwh : 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, unit, hero }) {
  return (
    <div className={`rounded-ww-sm px-3 py-2.5 border ${
      hero ? 'bg-ww-greenbg border-ww-greenline' : 'bg-ww-card border-ww-line'
    }`}>
      <div className={`text-[11px] mb-0.5 ${hero ? 'text-ww-greentitle font-medium' : 'text-ww-sub'}`}>
        {label}
      </div>
      <div className="text-base font-bold text-ww-ink tabular-nums truncate">
        {value}
        {unit && <span className="text-[10px] font-medium text-ww-sub ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}
