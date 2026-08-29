import { todayLocal } from './split';

/**
 * 週期項目的到期與自動記帳運算。
 * 與 iOS RecurringItem / AppViewModel 的行為必須一致，兩邊算出來的補記結果要相同。
 */

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * 容錯解析 nextDue。
 * 舊資料可能存成 "2026/09/05"、帶時間、或前後有空白；
 * 嚴格比對會讓這些項目永遠不到期而安靜地不提醒。
 */
export function normalizeDue(raw) {
  if (!raw) return '';
  const s = String(raw).trim();

  const m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;

  const d = new Date(s);
  return isNaN(d) ? '' : ymd(d);
}

/** 週期月數 */
export function intervalMonths(item) {
  return item.intervalMonths ||
    { monthly: 1, quarterly: 3, yearly: 12 }[item.interval] || 1;
}

/**
 * 由目前到期日推算下一次到期日。
 * 先設 1 號再加月份、最後 clamp 到該月最大天數，
 * 避免 1/31 加一個月被正規化成 3/2（與 iOS RecurringItem.calculateNextDue 相同）。
 */
export function calcNextDue(currentDue, item) {
  const cur = normalizeDue(currentDue);
  if (!cur) return currentDue;

  const [y, mo, day] = cur.split('-').map(Number);
  const targetDay = item.dayOfMonth || day;

  const d = new Date(y, mo - 1, 1);
  d.setMonth(d.getMonth() + intervalMonths(item));

  const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(targetDay, maxDay));
  return ymd(d);
}

/** 是否已到期（含今天） */
export function isDue(item, today = todayLocal()) {
  const due = normalizeDue(item.nextDue);
  return !!due && due <= today;
}

/** 需要使用者手動確認的項目：啟用中、已到期、且沒開自動記帳 */
export function needsConfirm(item, today = todayLocal()) {
  return !!item.active && !item.autoRecord && isDue(item, today);
}

/** 最多補記的期數，防止資料異常造成無限迴圈 */
const MAX_CATCHUP = 24;

/**
 * 列出這筆項目所有「已到期但還沒記」的到期日。
 * 例如三個月沒開 App，就會回傳三個日期，各自補一筆。
 */
export function pendingDueDates(item, today = todayLocal()) {
  if (!item.active || !item.autoRecord) return [];

  const dates = [];
  let due = normalizeDue(item.nextDue);
  if (!due) return [];

  while (due <= today && dates.length < MAX_CATCHUP) {
    dates.push(due);
    const next = calcNextDue(due, item);
    if (next === due) break;   // 防呆：推不動就停
    due = next;
  }
  return dates;
}

/**
 * 自動記帳的文件 ID —— 用「項目 ID + 到期日」組成固定值。
 * App 與網頁同時補記時會寫到同一份文件（覆蓋而非新增），天然防止重複記帳，
 * 不需要伺服器協調。
 */
export const autoRecordId = (recurringId, dueDate) => `auto-${recurringId}-${dueDate}`;

/** 由週期項目與到期日產生費用記錄（欄位需與 iOS ExpenseRecord 一致） */
export function buildRecordFrom(item, dueDate) {
  return {
    type: item.type,
    vendor: item.vendor || '',
    cost: item.cost || 0,
    kwh: item.kwh || 0,
    user: item.user || '',
    vehicleId: item.vehicleId || '',
    note: item.note || '',
    mileage: '',
    expiryDate: '',
    date: `${dueDate}T09:00`,   // 記在到期日，而不是打開 App 的那天
    paidBy: item.user || '',
    splitMethod: 'none',
    splitEntries: [],
    autoFrom: item.id || '',    // 來源標記，方便日後追查
  };
}
