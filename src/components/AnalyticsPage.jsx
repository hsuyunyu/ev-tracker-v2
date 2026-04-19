import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import MultiSelect from './MultiSelect';

const TYPE_COLORS = {
  charging:    '#3b82f6',
  tolls:       '#f97316',
  maintenance: '#eab308',
  insurance:   '#a855f7',
  other:       '#6b7280',
};

const TYPE_LABELS = {
  charging: '充電', tolls: '過路費', maintenance: '保養',
  insurance: '保險', other: '其他',
};

const TYPES = Object.keys(TYPE_LABELS);

const TYPE_OPTIONS  = TYPES.map(t => ({ value: t, label: TYPE_LABELS[t] }));

function Card({ title, children }) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="text-center py-10 text-gray-400 dark:text-neutral-600 text-sm">無資料</div>;
}

export default function AnalyticsPage({ records, darkMode, definedUsers }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  };

  const [startDate,   setStartDate]   = useState(sixMonthsAgo);
  const [endDate,     setEndDate]     = useState(todayStr);
  const [filterTypes, setFilterTypes] = useState([]);   // [] = all
  const [filterUsers, setFilterUsers] = useState([]);   // [] = all

  const userOptions = useMemo(() =>
    definedUsers.map(u => ({ value: u, label: u }))
  , [definedUsers]);

  const filtered = useMemo(() => records.filter(r => {
    const d = r.date?.slice(0, 10) ?? '';
    if (startDate && d < startDate) return false;
    if (endDate   && d > endDate)   return false;
    if (filterTypes.length > 0 && !filterTypes.includes(r.type)) return false;
    if (filterUsers.length > 0 && !filterUsers.includes(r.user)) return false;
    return true;
  }), [records, startDate, endDate, filterTypes, filterUsers]);

  const monthlyData = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const m = r.date?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, charging: 0, tolls: 0, maintenance: 0, insurance: 0, other: 0 };
      map[m][r.type] = (map[m][r.type] || 0) + (r.cost || 0);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  const mileageData = useMemo(() => records
    .filter(r => r.mileage && !isNaN(Number(r.mileage)))
    .map(r => ({ date: r.date?.slice(0, 10) ?? '', km: Number(r.mileage) }))
    .sort((a, b) => a.date.localeCompare(b.date))
  , [records]);

  const breakdownData = useMemo(() => {
    const map = {};
    filtered.forEach(r => { map[r.type] = (map[r.type] || 0) + (r.cost || 0); });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([type, value]) => ({ name: TYPE_LABELS[type] ?? type, value, type }));
  }, [filtered]);

  const totalCost = filtered.reduce((s, r) => s + (r.cost || 0), 0);

  const g = darkMode
    ? { grid: '#262626', text: '#737373', bg: '#171717', border: '#404040' }
    : { grid: '#f3f4f6', text: '#9ca3af', bg: '#ffffff', border: '#e5e7eb' };

  const ttStyle = {
    backgroundColor: g.bg,
    border: `1px solid ${g.border}`,
    borderRadius: 8,
    color: darkMode ? '#e5e5e5' : '#374151',
    fontSize: 12,
  };

  const inputCls = 'text-sm border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-gray-600 dark:text-neutral-300 bg-white dark:bg-neutral-800';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-neutral-400">從</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
            <span className="text-xs text-gray-500 dark:text-neutral-400">到</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
          </div>

          <MultiSelect
            options={TYPE_OPTIONS}
            value={filterTypes}
            onChange={setFilterTypes}
            placeholder="類別"
          />

          <MultiSelect
            options={userOptions}
            value={filterUsers}
            onChange={setFilterUsers}
            placeholder="使用者"
          />

          <span className="ml-auto text-sm font-bold text-tesla">
            總計 ${totalCost.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Monthly spending */}
      <Card title="每月費用趨勢">
        {monthlyData.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={g.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: g.text }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11, fill: g.text }} axisLine={false} tickLine={false} width={58} />
              <Tooltip contentStyle={ttStyle} formatter={(v, name) => [`$${Number(v).toLocaleString()}`, TYPE_LABELS[name] ?? name]} />
              <Legend formatter={name => TYPE_LABELS[name] ?? name} wrapperStyle={{ fontSize: 12 }} />
              {TYPES.map((t, i) => (
                <Bar key={t} dataKey={t} stackId="a" fill={TYPE_COLORS[t]}
                  radius={i === TYPES.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Pie + Mileage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="費用分佈">
          {breakdownData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={breakdownData} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={82}
                  dataKey="value" paddingAngle={3}>
                  {breakdownData.map(e => (
                    <Cell key={e.type} fill={TYPE_COLORS[e.type] ?? '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={ttStyle} formatter={v => [`$${Number(v).toLocaleString()}`]} />
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
                <Line type="monotone" dataKey="km" stroke="#E82127" strokeWidth={2}
                  dot={{ fill: '#E82127', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
