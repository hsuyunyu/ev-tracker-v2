/**
 * 里程彙整 —— 必須與 iOS AppViewModel.mileageEntries / latestMileage 行為一致，
 * 否則首頁車輛卡的數字會與 App 對不上。
 */

/** 對應 iOS ExpenseRecord.mileageValue：抽出數字、須 > 0 */
export function mileageValue(raw) {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const v = Number(cleaned);
  return Number.isFinite(v) && v > 0 ? Math.trunc(v) : null;
}

/** 排序鍵：日期在前、時間在後；沒有時間的當作當天 00:00（與 iOS parsedDate 相同） */
const sortKey = (date) => {
  const s = String(date ?? '');
  const day = s.slice(0, 10);
  const time = s.length > 10 ? s.slice(11, 16) : '00:00';
  return `${day}T${time || '00:00'}`;
};

/**
 * 合併「純里程記錄」與「費用記錄裡的里程」，依日期由舊到新排序。
 *
 * ⚠️ vehicleId 為空的記錄視為屬於預設車輛（對應 iOS 的 belongs()）。
 * 少了這條規則，早期沒指定車輛的記錄會被漏掉，里程就會比 App 少。
 */
export function mileageEntries(records, mileageLogs, vehicleId, defaultVehicleId) {
  const belongs = (vid) => {
    if (!vehicleId) return true;
    return vid === vehicleId || ((!vid || vid === '') && vehicleId === defaultVehicleId);
  };

  const entries = [];

  for (const r of records) {
    const km = mileageValue(r.mileage);
    if (km === null || !belongs(r.vehicleId ?? '')) continue;
    entries.push({ id: `r-${r.id}`, key: sortKey(r.date), date: r.date, km,
                   vehicleId: r.vehicleId ?? '', source: 'record', record: r });
  }

  for (const l of mileageLogs) {
    const km = mileageValue(l.mileage);
    if (km === null || !belongs(l.vehicleId ?? '')) continue;
    entries.push({ id: `m-${l.id}`, key: sortKey(l.date), date: l.date, km,
                   vehicleId: l.vehicleId ?? '', source: 'log', log: l });
  }

  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

/** 最新（日期最近）的里程數；沒有資料回傳 null */
export function latestMileage(records, mileageLogs, vehicleId, defaultVehicleId) {
  const entries = mileageEntries(records, mileageLogs, vehicleId, defaultVehicleId);
  return entries.length ? entries[entries.length - 1].km : null;
}

/**
 * 首頁車輛卡用：先看指定車輛，該車沒資料時退回全部車輛（與 iOS HomeView 相同）。
 */
export function displayMileage(records, mileageLogs, vehicleId, defaultVehicleId) {
  const km = latestMileage(records, mileageLogs, vehicleId, defaultVehicleId)
          ?? latestMileage(records, mileageLogs, null, defaultVehicleId);
  return km === null ? '—' : km.toLocaleString('en-US');
}
