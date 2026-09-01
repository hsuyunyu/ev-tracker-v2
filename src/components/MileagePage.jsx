import React, { useState, useMemo } from 'react';
import { Trash2, Gauge } from 'lucide-react';
import { PageHeader } from './SettlementPage';
import { mileageValue } from '../mileage';

const nowLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * 里程記錄頁：對應 iOS MileageLogView。
 * 清單同時顯示純里程記錄（可刪）與費用記錄帶的里程（唯讀）。
 */
export default function MileagePage({
  logs, records, vehicles, defaultVehicleId, onBack, onAdd, onDelete,
}) {
  const [vehicleId, setVehicleId] = useState(defaultVehicleId || '');
  const [mileage,   setMileage]   = useState('');
  const [date,      setDate]      = useState(nowLocal());
  const [note,      setNote]      = useState('');
  const [saving,    setSaving]    = useState(false);

  // 與 mileage.js 相同的排序鍵：沒有時間的當作當天 00:00
  const sortKey = (d) => {
    const str = String(d ?? '');
    return `${str.slice(0, 10)}T${str.length > 10 ? str.slice(11, 16) : '00:00'}`;
  };

  const vehicleName = (id) =>
    vehicles.find(v => v.id === id)?.name ||
    vehicles.find(v => v.id === id)?.licensePlate || '未指定車輛';

  // 合併兩種來源，依日期新到舊
  const merged = useMemo(() => {
    const fromLogs = logs.map(l => ({
      key: `log-${l.id}`, id: l.id, source: 'log',
      vehicleId: l.vehicleId, mileage: l.mileage,
      date: l.date, note: l.note || '',
    }));
    const fromRecords = records
      .map(r => ({ r, m: mileageValue(r.mileage) }))
      .filter(({ m }) => m !== null)
      .map(({ r, m }) => ({
        key: `rec-${r.id}`, id: r.id, source: 'record',
        vehicleId: r.vehicleId, mileage: m,
        date: r.date, note: r.vendor || '費用記錄',
      }));
    return [...fromLogs, ...fromRecords]
      .sort((a, b) => sortKey(b.date).localeCompare(sortKey(a.date)));
  }, [logs, records]);

  const latest = merged[0]?.mileage;

  const submit = async (e) => {
    e.preventDefault();
    const m = mileageValue(mileage);
    if (m === null) return;
    setSaving(true);
    try {
      await onAdd({ vehicleId, mileage: m, date, note });
      setMileage('');
      setNote('');
      setDate(nowLocal());
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-ww-field border border-ww-line2 rounded-ww-inner px-3 py-2.5 text-sm text-ww-ink ' +
    'placeholder:text-ww-faint focus:outline-none focus:border-ww-brand transition-colors';

  return (
    <div>
      <PageHeader title="里程記錄" onBack={onBack} />

      {/* 目前里程 */}
      <div className="bg-ww-greenbg border border-ww-greenline rounded-ww-lg p-5 mb-4 flex items-center gap-4">
        <Gauge size={28} className="text-ww-greentitle shrink-0" />
        <div>
          <div className="text-xs text-ww-greentitle font-medium mb-0.5">最新里程</div>
          <div className="text-2xl font-bold text-ww-ink tabular-nums">
            {latest != null ? `${latest.toLocaleString('en-US')} km` : '—'}
          </div>
        </div>
      </div>

      {/* 輸入卡 */}
      <form onSubmit={submit} className="bg-ww-card border border-ww-line rounded-ww-list p-4 mb-5 space-y-3">
        <div>
          <label className="block text-xs font-medium text-ww-sub mb-1.5">里程數（km）</label>
          <input
            type="number" inputMode="numeric" value={mileage}
            onChange={e => setMileage(e.target.value)}
            placeholder="例如 23400" className={inputCls} required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ww-sub mb-1.5">車輛</label>
            <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={inputCls}>
              <option value="">未指定</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name || v.licensePlate}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ww-sub mb-1.5">日期</label>
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ww-sub mb-1.5">備註</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="選填" className={inputCls} />
        </div>

        <button
          type="submit" disabled={saving || mileageValue(mileage) === null}
          className="w-full bg-ww-brand hover:bg-ww-brandhover disabled:opacity-40 disabled:cursor-not-allowed
                     text-white py-2.5 rounded-ww-inner text-sm font-semibold transition-colors"
        >
          {saving ? '儲存中…' : '記錄里程'}
        </button>
      </form>

      {/* 歷史 */}
      <h3 className="text-sm font-semibold text-ww-ink mb-2">
        歷史記錄 <span className="text-ww-sub font-normal">({merged.length})</span>
      </h3>
      <div className="bg-ww-card border border-ww-line rounded-ww-list overflow-hidden">
        {merged.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ww-sub">還沒有里程記錄</div>
        ) : merged.map((m, i) => (
          <div key={m.key} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-ww-line3' : ''}`}>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-ww-ink tabular-nums font-medium">
                {m.mileage.toLocaleString('en-US')} km
              </div>
              <div className="text-[11px] text-ww-sub truncate">
                {(m.date || '').slice(0, 10)} · {vehicleName(m.vehicleId)}
                {m.note ? ` · ${m.note}` : ''}
              </div>
            </div>
            {m.source === 'record' ? (
              <span className="text-[10px] text-ww-sub bg-ww-seg px-2 py-0.5 rounded-full shrink-0">
                費用記錄
              </span>
            ) : (
              <button
                onClick={() => onDelete(m.id)}
                aria-label="刪除里程記錄"
                className="text-ww-faint hover:text-ww-danger transition-colors shrink-0"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
