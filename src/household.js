import { doc, getDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

/**
 * 帳本（household）解析：與 iOS AppViewModel 完全相同的策略。
 *
 * 資料一律存在 households/{householdId}/... 子集合底下，
 * 網頁版與 App 指向同一個 householdId 才會同步。
 *
 * 解析順序：
 *   1. 快速路徑：localStorage 快取（對應 iOS 的 UserDefaults `householdId_{uid}`）
 *   2. 慢速路徑：讀 users/{uid}.activeHouseholdId
 */

const cacheKey = (uid) => `householdId_${uid}`;

export function cachedHouseholdId(uid) {
  if (!uid) return null;
  return localStorage.getItem(cacheKey(uid));
}

export function cacheHouseholdId(uid, householdId) {
  if (!uid || !householdId) return;
  localStorage.setItem(cacheKey(uid), householdId);
}

export function clearCachedHouseholdId(uid) {
  if (!uid) return;
  localStorage.removeItem(cacheKey(uid));
}

/**
 * 取得使用者目前的 householdId。
 * 找不到時回傳 null —— 網頁版不建立新帳本，請先在 App 建立或加入。
 */
export async function resolveHouseholdId(uid) {
  if (!uid) return null;

  const cached = cachedHouseholdId(uid);
  if (cached) return cached;

  const snap = await getDoc(doc(db, 'users', uid));
  const id = snap.exists() ? snap.data()?.activeHouseholdId : null;
  if (id) cacheHouseholdId(uid, id);
  return id || null;
}

// MARK: - 路徑 helper（對應 iOS AppViewModel.collection(_:)）

export const householdDoc = (hid) => doc(db, 'households', hid);
export const hCollection  = (hid, name) => collection(db, 'households', hid, name);
export const hDoc         = (hid, name, id) => doc(db, 'households', hid, name, id);
export const settingsDoc  = (hid) => doc(db, 'households', hid, 'settings', 'config');
