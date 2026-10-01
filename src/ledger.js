import { useEffect, useMemo, useState } from 'react';
import {
  onSnapshot, addDoc, deleteDoc, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { hCollection, hDoc, householdDoc, settingsDoc } from './household';
import { demoLedger } from './demoData';

/**
 * 帳本資料層 —— 對應 iOS AppViewModel 的 listeners + CRUD。
 *
 * 正常模式訂閱 Firestore `households/{householdId}/…`；Demo 模式改用記憶體內的
 * 假資料（對應 iOS 的 isDemoMode），兩者對外提供相同的 `api`，畫面不需分辨。
 */

export const DEFAULT_SETTINGS = {
  definedUsers: ['Rose', '1+'],
  defaultVehicleId: '',
  definedTypes: [],
  notificationsEnabled: false,
  notificationDaysBefore: 7,
  appearanceMode: 'system',
  defaultSplitEnabled: false,
  defaultSplitMethod: 'equal',
  defaultSplitRules: [],
};

const EMPTY = {
  records: [], vehicles: [], recurring: [], mileageLogs: [], settlements: [],
  settings: DEFAULT_SETTINGS, inviteCode: '',
};

const byDateDesc = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));
const bySeqDesc  = (a, b) => (b.sequenceNumber || 0) - (a.sequenceNumber || 0);

/**
 * ⚠️ 車輛清單必須與 iOS 看到的一致。
 * iOS 的 Vehicle 用合成 Codable，name / licensePlate 皆為必填，缺欄位的舊文件會
 * 解碼失敗而被丟棄；網頁若照單全收，兩邊的「第一台車」就會不同，
 * 首頁車輛卡的車牌與里程因此對不上。
 */
const usableVehicle = (v) => typeof v.name === 'string' && typeof v.licensePlate === 'string';

const SORTERS = {
  records:     (list) => [...list].sort(byDateDesc),
  mileageLogs: (list) => [...list].sort(byDateDesc),
  settlements: (list) => [...list].sort(bySeqDesc),
  vehicles:    (list) => list.filter(usableVehicle),
  recurring:   (list) => list,
};

const BATCH_LIMIT = 400;

function firestoreApi(hid) {
  return {
    add:    (coll, data)      => addDoc(hCollection(hid, coll), data),
    set:    (coll, id, data)  => setDoc(hDoc(hid, coll, id), data),
    update: (coll, id, patch) => updateDoc(hDoc(hid, coll, id), patch),
    remove: (coll, id)        => deleteDoc(hDoc(hid, coll, id)),
    saveSettings: (patch)     => setDoc(settingsDoc(hid), patch, { merge: true }),
    /** ops: [{ op: 'set' | 'update', coll, id, data }] */
    async batch(ops) {
      for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
        const b = writeBatch(db);
        for (const { op, coll, id, data } of ops.slice(i, i + BATCH_LIMIT)) {
          if (op === 'update') b.update(hDoc(hid, coll, id), data);
          else b.set(hDoc(hid, coll, id), data);
        }
        await b.commit();
      }
    },
  };
}

function demoApi(setState) {
  const mutate = (coll, fn) =>
    setState(s => ({ ...s, [coll]: SORTERS[coll](fn(s[coll])) }));
  const newId = () => 'demo-' + Math.random().toString(36).slice(2, 10);

  const api = {
    async add(coll, data)      { mutate(coll, l => [...l, { id: newId(), ...data }]); },
    async set(coll, id, data)  { mutate(coll, l => [...l.filter(x => x.id !== id), { id, ...data }]); },
    async update(coll, id, p)  { mutate(coll, l => l.map(x => x.id === id ? { ...x, ...p } : x)); },
    async remove(coll, id)     { mutate(coll, l => l.filter(x => x.id !== id)); },
    async saveSettings(patch)  { setState(s => ({ ...s, settings: { ...s.settings, ...patch } })); },
    async batch(ops) {
      for (const { op, coll, id, data } of ops) {
        await (op === 'update' ? api.update(coll, id, data) : api.set(coll, id, data));
      }
    },
  };
  return api;
}

export function useLedger(householdId, demo) {
  const [state, setState] = useState(EMPTY);

  useEffect(() => {
    if (demo) { setState(demoLedger()); return; }
    if (!householdId) { setState(EMPTY); return; }

    const listen = (coll) =>
      onSnapshot(hCollection(householdId, coll), snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setState(s => ({ ...s, [coll]: SORTERS[coll](list) }));
      });

    const subs = [
      ...Object.keys(SORTERS).map(listen),
      onSnapshot(settingsDoc(householdId), snap => {
        if (snap.exists()) {
          setState(s => ({ ...s, settings: { ...DEFAULT_SETTINGS, ...snap.data() } }));
        }
      }),
      // 邀請碼存在 household 文件本身（對應 iOS householdInviteCode）
      onSnapshot(householdDoc(householdId),
        snap => setState(s => ({ ...s, inviteCode: snap.data()?.inviteCode || '' })),
        () => {}),
    ];
    return () => subs.forEach(un => un());
  }, [householdId, demo]);

  const api = useMemo(
    () => (demo ? demoApi(setState) : firestoreApi(householdId)),
    [householdId, demo]
  );

  return { ...state, api };
}
