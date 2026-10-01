import React, { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { buildTypeMap } from '../typeConfig';
import { mileageEntries } from '../mileage';
import { fmtInt, nowLocal, parseLocal, isToday, pad2 } from '../format';
import { Card, Divider, NavButton, SectionLabel, Sheet, SheetNav } from './ui';

/**
 * 記錄里程 —— 對應 iOS MileageLogView（入口：首頁車輛卡）。
 * 大數字輸入卡 + 儲存按鈕 + 歷史清單；費用記錄帶的里程也列出但唯讀。
 */
export default function MileageSheet({
  logs, records, vehicles, settings, defaultVehicleId, initialVehicleId,
  onClose, onAdd, onUpdate, onDelete,
}) {
  const typeMap = buildTypeMap(settings.definedTypes);

  const [vehicleId, setVehicleId] = useState(initialVehicleId || defaultVehicleId || '');
  const [mileage, setMileage]     = useState('');
  const [date, setDate]           = useState(nowLocal());
  const [note, setNote]           = useState('');
  const [editing, setEditing]     = useState(null);   // 編輯中的里程記錄

  // 由舊到新；清單顯示時反過來
  const ascending = useMemo(
    () => mileageEntries(records, logs, vehicleId || null, defaultVehicleId),
    [records, logs, vehicleId, defaultVehicleId]
  );
  const entries = [...ascending].reverse();

  const inputKm = (() => {
    const v = Number(mileage.replace(/\D/g, ''));
    return v > 0 ? v : null;
  })();
  // 編輯中不比對自己，避免顯示 +0
  const previousKm = ascending.filter(e => !editing || e.log?.id !== editing.id).at(-1)?.km ?? null;
  const delta = inputKm !== null && previousKm !== null && inputKm !== previousKm
    ? (inputKm > previousKm
        ? `比上次多 ${fmtInt(inputKm - previousKm)} km`
        : `比上次少 ${fmtInt(previousKm - inputKm)} km`)
    : null;

  const reset = () => { setEditing(null); setMileage(''); setNote(''); setDate(nowLocal()); };

  const save = async () => {
    if (inputKm === null) return;
    const data = { vehicleId, mileage: inputKm, date, note: note.trim() };
    reset();
    await (editing ? onUpdate(editing.id, data) : onAdd(data));
  };

  const startEditing = (log) => {
    setEditing(log);
    setMileage(String(log.mileage));
    setDate(log.date || nowLocal());
    setNote(log.note || '');
    if (log.vehicleId) setVehicleId(log.vehicleId);
  };

  const remove = (log) => {
    if (!window.confirm('刪除這筆里程？')) return;
    if (editing?.id === log.id) reset();
    onDelete(log.id);
  };

  const d = parseLocal(date);
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const dateLabel = isToday(date) ? `今天 ${hm}` : `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;

  return (
    <Sheet onClose={onClose} tall>
      <SheetNav
        title={editing ? '編輯里程' : '記錄里程'}
        left={<NavButton onClick={onClose}>關閉</NavButton>}
      />

      <div className="px-[22px] pt-2 pb-[calc(28px+env(safe-area-inset-bottom))] flex flex-col gap-[18px]">
        {/* 輸入卡 */}
        <Card>
          <div className="flex flex-col items-center gap-1.5 py-5">
            <span className="text-[12px] font-semibold text-ww-sub">目前里程</span>
            <label className="flex items-baseline justify-center gap-1.5">
              <input
                autoFocus inputMode="numeric" placeholder="0" value={mileage}
                onChange={e => setMileage(e.target.value.replace(/\D/g, '').slice(0, 7))}
                onKeyDown={e => e.key === 'Enter' && save()}
                className="bg-transparent text-right text-[40px] leading-tight font-extrabold text-ww-ink
                           outline-none tabular-nums"
                style={{ width: `${Math.max(mileage.length, 1) + 0.4}ch` }}
              />
              <span className="text-[16px] font-bold text-ww-sub">km</span>
            </label>
            <span className={`text-[12px] font-medium ${delta ? 'text-ww-brand' : 'text-ww-faint'}`}>
              {previousKm === null ? '這會是第一筆里程記錄' : (delta ?? `上次 ${fmtInt(previousKm)} km`)}
            </span>
          </div>

          <Divider />
          <div className="flex items-center justify-between py-3.5">
            <span className="w-[60px] text-[13px] text-ww-sub">日期</span>
            <span className="relative text-[14px] font-semibold text-ww-ink">
              {dateLabel}
              <input
                type="datetime-local" value={date} max={nowLocal()} aria-label="選擇日期"
                onChange={e => e.target.value && setDate(e.target.value)}
                onClick={e => e.currentTarget.showPicker?.()}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </span>
          </div>

          {vehicles.length > 1 && (
            <>
              <Divider />
              <div className="flex items-center justify-between py-3.5">
                <span className="w-[60px] text-[13px] text-ww-sub">車輛</span>
                <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} dir="rtl"
                  className="bg-transparent text-[14px] font-semibold text-ww-ink outline-none max-w-[60%]">
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name || v.licensePlate}</option>)}
                </select>
              </div>
            </>
          )}

          <Divider />
          <div className="flex items-center py-3.5">
            <span className="w-[60px] shrink-0 text-[13px] text-ww-sub">備註</span>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="選填"
              className="ww-plain-input" />
          </div>
        </Card>

        {/* 儲存 */}
        <div className="flex flex-col items-center gap-2.5">
          <button onClick={save} disabled={inputKm === null}
            className={`w-full py-[15px] rounded-ww-inner text-white text-[15px] font-bold ${
              inputKm !== null ? 'bg-ww-brand active:opacity-80' : 'bg-ww-faint/45'
            }`}>
            {editing ? '更新里程' : '儲存里程'}
          </button>
          {editing && (
            <button onClick={reset} className="text-[13px] font-semibold text-ww-sub">取消編輯</button>
          )}
        </div>

        {/* 歷史 */}
        <div className="flex flex-col gap-[7px]">
          <SectionLabel>里程記錄</SectionLabel>
          {entries.length === 0 ? (
            <Card className="py-7 text-center text-[13px] text-ww-faint">還沒有里程記錄</Card>
          ) : (
            <>
              <Card>
                {entries.map((e, i) => {
                  const prev = entries[i + 1]?.km;
                  return (
                    <React.Fragment key={e.id}>
                      {i > 0 && <Divider />}
                      <div className="flex items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[15px] font-bold text-ww-ink tabular-nums">{fmtInt(e.km)} km</span>
                            {prev !== undefined && e.km > prev && (
                              <span className="px-1.5 py-0.5 rounded-full bg-ww-brand/[0.12] text-ww-brand
                                               text-[11px] font-bold tabular-nums">
                                +{fmtInt(e.km - prev)}
                              </span>
                            )}
                          </div>
                          <div className="mt-[3px] flex items-center gap-1.5 min-w-0">
                            <span className="text-[12px] text-ww-sub shrink-0">{rowDate(e.date)}</span>
                            {e.record ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-ww-seg text-ww-faint
                                               text-[10.5px] font-semibold truncate">
                                {sourceLabel(e.record, typeMap)}
                              </span>
                            ) : e.log?.note && (
                              <span className="text-[12px] text-ww-faint truncate">{e.log.note}</span>
                            )}
                          </div>
                        </div>
                        {e.log && (
                          <>
                            <button onClick={() => startEditing(e.log)} aria-label="編輯里程"
                              className="w-[30px] h-[30px] rounded-full bg-ww-seg text-ww-sub
                                         flex items-center justify-center shrink-0">
                              <Pencil size={13} strokeWidth={2.6} />
                            </button>
                            <button onClick={() => remove(e.log)} aria-label="刪除里程"
                              className="w-[30px] h-[30px] rounded-full bg-ww-danger/10 text-ww-danger
                                         flex items-center justify-center shrink-0">
                              <Trash2 size={13} strokeWidth={2.6} />
                            </button>
                          </>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </Card>
              <p className="px-1 pt-0.5 text-[11.5px] text-ww-faint">
                來自費用記錄的里程也會列在這裡，需要修改請到該筆費用中編輯。
              </p>
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function rowDate(str) {
  const d = parseLocal(str);
  const md = `${d.getMonth() + 1}月${d.getDate()}日`;
  return d.getFullYear() === new Date().getFullYear() ? md : `${d.getFullYear()}年${md}`;
}

function sourceLabel(r, typeMap) {
  const type = typeMap[r.type]?.label ?? '費用';
  return r.vendor ? `${type}・${r.vendor}` : type;
}
