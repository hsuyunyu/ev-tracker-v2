import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Calendar, User, Tag, Car, XCircle, FileSearch, Gauge, Route, ArrowUpDown } from 'lucide-react';
import { buildTypeMap, resolveTypes, TypeIcon } from '../typeConfig';
import { hasSplit } from '../split';
import { mileageEntries } from '../mileage';
import { fmtInt, pad2, parseLocal, splitMethodLabel } from '../format';
import { FilterMenu, PageTitle, SORT_OPTIONS, sortRecords, UserAvatar } from './ui';

/**
 * 分析頁 —— 對應 iOS AnalyticsView。
 * 篩選 chips → 統計卡 → 費用分類圓餅 → 近 6 個月趨勢 → 里程趨勢 → 充電商家統計 → 消費明細。
 */

const RATE_COLOR = '#4E7BB5';

/** 由本月往回推 n 個月的 "yyyy-MM"（新到舊） */
function recentMonths(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });
}

export default function AnalyticsPage({
  records, mileageLogs = [], vehicles = [], settings, defaultVehicleId, darkMode,
}) {
  const types   = resolveTypes(settings.definedTypes);
  const typeMap = buildTypeMap(settings.definedTypes);
  const members = settings.definedUsers;

  const [month, setMonth]     = useState('');
  const [user, setUser]       = useState('');
  const [type, setType]       = useState('');
  const [vehicle, setVehicle] = useState('');
  const [sortMode, setSortMode] = useState('date_desc');
  const [showSplit, setShowSplit] = useState(false);

  const filtering = !!(month || user || type || vehicle);

  const filtered = useMemo(() => records.filter(r => {
    // 成員篩選：主要支出人 OR 分攤參與者（含金額 > 0）
    const userMatch = !user || r.user === user
      || (r.splitEntries || []).some(e => e.user === user && e.amount > 0);
    return userMatch
      && (!month   || r.date?.startsWith(month))
      && (!vehicle || r.vehicleId === vehicle)
      && (!type    || r.type === type);
  }), [records, month, user, type, vehicle]);

  const totalCost = filtered.reduce((s, r) => s + (r.cost || 0), 0);
  const totalKwh  = filtered.reduce((s, r) => s + (r.kwh  || 0), 0);
  // 平均電價只計入有充電度數的記錄，避免保險/保養等費用灌水
  const chargingCost = filtered.filter(r => (r.kwh || 0) > 0).reduce((s, r) => s + (r.cost || 0), 0);
  const avgPerKwh = totalKwh > 0 ? chargingCost / totalKwh : 0;

  const byType = useMemo(() => types
    .map(t => ({ type: t, total: filtered.filter(r => r.type === t.id).reduce((s, r) => s + (r.cost || 0), 0) }))
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, settings.definedTypes]);

  // 趨勢圖：可套用成員/分類/車輛篩選，但不受「月份」篩選影響
  const trend = useMemo(() => recentMonths(6).reverse().map(m => ({
    label: m.slice(2),
    total: records.filter(r =>
      r.date?.startsWith(m)
      && (!user    || r.user === user)
      && (!type    || r.type === type)
      && (!vehicle || r.vehicleId === vehicle)
    ).reduce((s, r) => s + (r.cost || 0), 0),
  })), [records, user, type, vehicle]);

  // 里程趨勢：不受月份篩選影響
  const mileagePoints = useMemo(
    () => mileageEntries(records, mileageLogs, vehicle || null, defaultVehicleId)
      .map(e => ({ date: e.key.slice(0, 10), km: e.km })),
    [records, mileageLogs, vehicle, defaultVehicleId]
  );

  // 充電商家統計（依電價由低至高）
  const chargeStats = useMemo(() => {
    const map = {};
    for (const r of filtered) {
      if (r.type !== 'charging' || !((r.kwh || 0) > 0)) continue;
      const key = r.vendor || '充電';
      map[key] ??= { vendor: key, sessions: 0, kwh: 0, cost: 0 };
      map[key].sessions += 1;
      map[key].kwh  += r.kwh;
      map[key].cost += r.cost || 0;
    }
    return Object.values(map)
      .map(c => ({ ...c, rate: c.kwh > 0 ? c.cost / c.kwh : 0 }))
      .sort((a, b) => a.rate - b.rate);
  }, [filtered]);
  const chargeKwh  = chargeStats.reduce((s, c) => s + c.kwh, 0);
  const chargeAvg  = chargeKwh > 0 ? chargeStats.reduce((s, c) => s + c.cost, 0) / chargeKwh : 0;
  const maxRate    = Math.max(0.0001, ...chargeStats.map(c => c.rate));

  const sorted = useMemo(
    () => sortRecords(filtered, sortMode, typeMap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, sortMode]
  );
  const sortShort = SORT_OPTIONS.find(o => o.value === sortMode)?.short;

  const g = darkMode
    ? { grid: '#34302A', text: '#968F80', bg: '#24211A', border: '#383229', ink: '#F3EFE6' }
    : { grid: '#ECE6DA', text: '#8C8579', bg: '#FCFBF6', border: '#E3DCCD', ink: '#211D17' };
  const ttStyle = {
    backgroundColor: g.bg, border: `1px solid ${g.border}`, borderRadius: 12,
    color: g.ink, fontSize: 12, padding: '6px 10px',
  };
  const kLabel = (v) => (v >= 1000 ? `${Math.trunc(v / 1000)}k` : v > 0 ? String(Math.round(v)) : '');

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>數據分析</PageTitle>

      {/* 篩選 chips */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterMenu label="月份" allLabel="全部月份" icon={<Calendar size={12} />}
          options={recentMonths(12).map(m => ({ value: m, label: m }))}
          value={month} onChange={setMonth} />
        <FilterMenu label="成員" allLabel="全部成員" icon={<User size={12} />}
          options={members.map(u => ({ value: u, label: u }))}
          value={user} onChange={setUser} />
        <FilterMenu label="分類" allLabel="全部分類"
          icon={type ? <TypeIcon icon={typeMap[type]?.icon} size={12} /> : <Tag size={12} />}
          options={types.map(t => ({ value: t.id, label: t.label }))}
          value={type} onChange={setType} />
        {vehicles.length > 1 && (
          <FilterMenu label="車輛" allLabel="全部車輛" icon={<Car size={12} />}
            options={vehicles.map(v => ({ value: v.id, label: v.name || v.licensePlate }))}
            value={vehicle} onChange={setVehicle} />
        )}
        {filtering && (
          <button aria-label="清除篩選"
            onClick={() => { setMonth(''); setUser(''); setType(''); setVehicle(''); }}>
            <XCircle size={24} className="text-ww-sub" fill="currentColor" stroke="rgb(var(--ww-bg))" />
          </button>
        )}
      </div>

      {/* 統計卡 */}
      <div className="grid grid-cols-2 gap-[11px]">
        <StatCard title="總費用" value={`NT$ ${fmtInt(totalCost)}`} hero />
        <StatCard title="記錄筆數" value={filtered.length} unit=" 筆" />
        {totalKwh > 0 && (
          <>
            <StatCard title="充電電量" value={fmtInt(totalKwh)} unit=" kWh" />
            <StatCard title="平均電價" value={`$${avgPerKwh.toFixed(1)}`} unit="/kWh" />
          </>
        )}
      </div>

      {/* 費用分類 */}
      {byType.length > 0 && !type && (
        <ChartCard title="費用分類">
          <div className="relative h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byType} dataKey="total" nameKey="type.label" innerRadius="62%" outerRadius="100%"
                  paddingAngle={2} cornerRadius={4} startAngle={90} endAngle={-270}
                  stroke="none" isAnimationActive={false}>
                  {byType.map(x => <Cell key={x.type.id} fill={x.type.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-ww-sub">總計</span>
              <span className="text-[17px] font-extrabold text-ww-ink tabular-nums">NT$ {fmtInt(totalCost)}</span>
            </div>
          </div>
          <div className="mt-3.5">
            {byType.map(x => (
              <div key={x.type.id} className="flex items-center gap-[9px] py-[7px]">
                <span className="w-[11px] h-[11px] rounded-[4px] shrink-0" style={{ backgroundColor: x.type.color }} />
                <span className="text-[13px] font-semibold text-ww-ink truncate">{x.type.label}</span>
                <span className="ml-auto text-[11px] text-ww-sub tabular-nums">
                  {totalCost > 0 ? Math.trunc(x.total / totalCost * 100) : 0}%
                </span>
                <span className="w-[84px] text-right text-[13px] font-bold text-ww-ink tabular-nums">
                  NT$ {fmtInt(x.total)}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* 近 6 個月趨勢 */}
      <ChartCard title="近 6 個月趨勢"
        badge={(user || type || vehicle) && '已套用篩選'}>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 16, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="wwBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6E9266" />
                  <stop offset="100%" stopColor="#6E9266" stopOpacity={0.72} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={g.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: g.text }} axisLine={false} tickLine={false} />
              <YAxis orientation="right" width={34} tickFormatter={kLabel}
                tick={{ fontSize: 10, fill: g.text }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: g.grid, opacity: 0.5 }} contentStyle={ttStyle}
                formatter={v => [`NT$ ${fmtInt(v)}`, '金額']} />
              <Bar dataKey="total" fill="url(#wwBar)" radius={[4, 4, 4, 4]} maxBarSize={38} isAnimationActive={false}>
                <LabelList dataKey="total" position="top" formatter={kLabel}
                  style={{ fontSize: 9, fill: g.text }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 里程趨勢 */}
      {mileagePoints.length > 0 && (
        <ChartCard title="里程趨勢">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mileagePoints} margin={{ top: 6, right: 0, left: 6, bottom: 0 }}>
                <CartesianGrid stroke={g.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={d => d.slice(5)} minTickGap={40}
                  tick={{ fontSize: 9, fill: g.text }} axisLine={false} tickLine={false} />
                <YAxis orientation="right" width={34} domain={['auto', 'auto']}
                  tickFormatter={v => `${Math.trunc(v / 1000)}k`}
                  tick={{ fontSize: 10, fill: g.text }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={ttStyle} formatter={v => [`${fmtInt(v)} km`, '里程']} />
                <Line type="linear" dataKey="km" stroke="#6E9266" strokeWidth={2.5}
                  dot={{ fill: '#6E9266', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }}
                  isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {mileagePoints.length > 1 && (
            <div className="mt-3 flex justify-between text-[12px] text-ww-sub">
              <span className="flex items-center gap-1.5">
                <Gauge size={13} /> 最新 {fmtInt(mileagePoints.at(-1).km)} km
              </span>
              <span className="flex items-center gap-1.5">
                <Route size={13} /> 累積 +{fmtInt(mileagePoints.at(-1).km - mileagePoints[0].km)} km
              </span>
            </div>
          )}
        </ChartCard>
      )}

      {/* 充電商家統計 */}
      {chargeStats.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between px-0.5 pb-3">
            <h2 className="text-[16px] font-extrabold text-ww-ink">充電商家統計</h2>
            <span className="flex items-baseline gap-[3px] text-[11.5px] text-ww-sub">
              平均
              <span className="text-[13px] font-extrabold tabular-nums" style={{ color: RATE_COLOR }}>
                {chargeAvg > 0 ? `NT$${chargeAvg.toFixed(1)}` : '—'}
              </span>
              /kWh
            </span>
          </div>
          {chargeStats.map(c => (
            <div key={c.vendor} className="mb-2 bg-ww-card border border-ww-line rounded-[14px] px-[15px] py-[13px]">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[14px] font-semibold text-ww-ink truncate">{c.vendor}</span>
                <span className="ml-auto flex items-baseline gap-0.5 shrink-0">
                  <span className="text-[16px] font-extrabold tabular-nums" style={{ color: RATE_COLOR }}>
                    NT${c.rate.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-ww-sub">/kWh</span>
                </span>
              </div>
              <div className="mt-[7px] flex justify-between text-[11.5px]">
                <span className="text-ww-sub">{c.sessions} 次 · {fmtInt(Math.trunc(c.kwh))} kWh</span>
                <span className="text-ww-ink2 tabular-nums">NT${fmtInt(c.cost)}</span>
              </div>
              <div className="mt-[7px] h-1.5 rounded-full bg-ww-line overflow-hidden">
                <div className="h-full rounded-full min-w-[8px]"
                  style={{ width: `${c.rate / maxRate * 100}%`, backgroundColor: RATE_COLOR }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 消費明細 */}
      <div>
        <div className="flex items-center justify-between pb-2.5">
          <h2 className="text-[17px] font-semibold text-ww-ink">消費明細</h2>
          <span className="px-2 py-[3px] rounded-full bg-ww-seg text-[12px] text-ww-sub">{sorted.length} 筆</span>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 py-8 bg-ww-card rounded-ww-sm text-ww-sub">
            <FileSearch size={36} />
            <span className="text-[15px]">無符合條件的記錄</span>
          </div>
        ) : (
          <div className="bg-ww-card rounded-ww-sm">
            <div className="flex items-center gap-2 px-3.5 py-2 border-b border-ww-line">
              <span className="text-[9px] text-ww-brand">{sortMode.includes('asc') ? '▲' : '▼'}</span>
              <span className="text-[13px] text-ww-sub">{sortShort}</span>
              <button onClick={() => setShowSplit(v => !v)}
                className={`ml-auto px-2.5 py-[5px] rounded-full text-[12px] font-medium ${
                  showSplit ? 'bg-ww-brand/[0.12] text-ww-brand' : 'bg-ww-seg text-ww-sub'
                }`}>
                分攤細節
              </button>
              <FilterMenu align="right" options={SORT_OPTIONS} value={sortMode} onChange={setSortMode}
                trigger={
                  <span className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-ww-seg text-ww-sub">
                    <ArrowUpDown size={14} />
                  </span>
                } />
            </div>
            {sorted.map((r, i) => (
              <DetailRow key={r.id} record={r} type={typeMap[r.type]} showSplit={showSplit} last={i === sorted.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, hero }) {
  return (
    <div className={`rounded-ww-list px-4 py-[15px] border ${
      hero ? 'bg-ww-brand border-transparent' : 'bg-ww-card border-ww-line'
    }`}>
      <div className={`text-[11px] font-medium ${hero ? 'text-white/85' : 'text-ww-sub'}`}>{title}</div>
      <div className="mt-[5px] flex items-baseline min-w-0">
        <span className={`text-[21px] font-extrabold tabular-nums truncate ${hero ? 'text-white' : 'text-ww-ink'}`}>
          {value}
        </span>
        {unit && (
          <span className={`text-[12px] font-semibold whitespace-pre ${hero ? 'text-white/85' : 'text-ww-sub'}`}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, badge, children }) {
  return (
    <div className="bg-ww-card border border-ww-line rounded-[20px] p-[18px]">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-[14px] font-bold text-ww-ink">{title}</h3>
        {badge && (
          <span className="px-2 py-[3px] rounded-full bg-ww-seg text-[12px] text-ww-sub">{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];
const BADGE_COLOR = { equal: '#30B0C7', ratio: '#AF52DE', amount: '#FF9500' };

/** 消費明細的一列，對應 iOS RecordRow */
function DetailRow({ record: r, type: t, showSplit, last }) {
  const color = t?.color ?? '#6b7280';
  const split = hasSplit(r);
  const d = parseLocal(r.date);

  return (
    <div className="px-3.5 pt-3.5">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: color + '1F', color }}>
          <TypeIcon icon={t?.icon ?? 'doc.text.fill'} size={16} />
        </span>
        <span className="text-[15px] font-semibold text-ww-ink truncate">{t?.label ?? r.type}</span>
        <span className="ml-auto text-[15px] font-bold tabular-nums shrink-0" style={{ color }}>
          NT$ {fmtInt(r.cost)}
        </span>
      </div>

      <div className="mt-1 pl-[46px] flex items-center gap-1.5 min-w-0 text-[12px] text-ww-sub">
        <span className="px-[7px] py-0.5 rounded-full text-white text-[10px] font-semibold shrink-0"
          style={{ backgroundColor: split ? (BADGE_COLOR[r.splitMethod] ?? '#007AFF') : '#8E8E93' }}>
          {split ? splitMethodLabel(r.splitMethod) : '支出'}
        </span>
        <span className="shrink-0">{d.getMonth() + 1}/{d.getDate()} ({WEEKDAY[d.getDay()]})</span>
        {r.vendor && <span className="truncate">{r.vendor}</span>}
        {r.note && <span className="truncate text-ww-faint">· {r.note}</span>}
      </div>

      {showSplit && split && (
        <div className="mt-2 px-2.5 py-2 rounded-[10px] bg-ww-seg/70">
          <div className="flex justify-end pb-[3px] text-[11px] text-ww-sub">
            <span className="w-16 text-right">分攤</span>
            <span className="w-16 text-right">代墊</span>
          </div>
          {r.splitEntries.map(e => {
            const paid = e.user === r.paidBy ? (r.cost || 0) : 0;
            return (
              <div key={e.id || e.user} className="flex items-center gap-2 py-[3px] text-[12px]">
                <UserAvatar name={e.user} size={26} />
                <span className="text-ww-sub truncate">{e.user}</span>
                <span className="ml-auto w-16 text-right font-medium text-ww-ink tabular-nums">${fmtInt(e.amount)}</span>
                <span className={`w-16 text-right font-medium tabular-nums ${paid > 0 ? 'text-ww-ink' : 'text-ww-faint'}`}>
                  ${fmtInt(paid)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className={`mt-3.5 ml-[46px] h-px ${last ? '' : 'bg-ww-line'}`} />
    </div>
  );
}
