/**
 * 顯示格式 —— 對應 iOS 各 View 內的 formattedInt / money / 日期標籤 helper，
 * 集中在這裡讓每個畫面的寫法一致。
 */

export const pad2 = (n) => String(n).padStart(2, '0');

/** 整數金額（含千分位），對應 iOS formattedInt */
export const fmtInt = (v) => Math.round(v || 0).toLocaleString('en-US');

/** 整數就不帶小數，否則一位小數，對應 iOS formattedDouble */
export const fmtNum = (v) => {
  const n = v || 0;
  return n === Math.round(n) ? String(Math.round(n)) : n.toFixed(1);
};

/** "NT$1,234" */
export const money = (v) => `NT$${fmtInt(v)}`;

/** 去掉多餘的 .0，對應 iOS trimZero */
export const trimZero = (v) => (v % 1 === 0 ? String(Math.trunc(v)) : String(v));

const WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

/** 由 "yyyy-MM-dd…" 取本地 Date（不經 UTC，避免早上 8 點前少一天） */
export function parseLocal(str) {
  const s = String(str || '');
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return new Date();
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
}

export const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const ymdhm = (d) => `${ymd(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
export const nowLocal = () => ymdhm(new Date());

/** "6/18" */
export function shortDate(str) {
  const s = String(str || '').slice(0, 10);
  if (s.length < 10) return s;
  return `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
}

/** "6/18 (週三)" —— 記錄卡副標 */
export function shortDateWeekday(str) {
  const s = String(str || '').slice(0, 10);
  if (s.length < 10) return s;
  return `${shortDate(s)} (${WEEKDAYS[parseLocal(s).getDay()]})`;
}

/** "6月18日 (週三)" —— 記錄頁選定日 chip */
export function longDateWeekday(str) {
  const d = parseLocal(str);
  return `${d.getMonth() + 1}月${d.getDate()}日 (${WEEKDAYS[d.getDay()]})`;
}

/** "2026年6月18日" */
export function fullDate(str) {
  const d = parseLocal(str);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** 距離今天幾天（未來為正） */
export function daysFromToday(str) {
  return Math.round((startOfDay(parseLocal(str)) - startOfDay(new Date())) / 86400000);
}

export const isToday = (str) => daysFromToday(str) === 0;

/** 類型的單字圖示（標籤首字），對應 iOS mono() */
export const monoOf = (type) => {
  const s = String(type?.label ?? '').trim();
  return s ? s.charAt(0) : '他';
};

export const SPLIT_METHOD_LABEL = { equal: '均分', ratio: '比例', amount: '金額' };
export const splitMethodLabel = (m) => SPLIT_METHOD_LABEL[m] ?? '分攤';
