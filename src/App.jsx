import React, { useState, useEffect, useMemo, useRef } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { resolveHouseholdId, clearCachedHouseholdId } from './household';
import { useLedger } from './ledger';
import { unsettledSplitRecords, calcBalance, pendingSettlement, todayLocal } from './split';
import {
  calcNextDue, needsConfirm, pendingDueDates, autoRecordId, buildRecordFrom,
} from './recurring';
import { buildTypeMap } from './typeConfig';
import { nowLocal } from './format';

import Login, { LoadingView } from './components/Login';
import TabBar from './components/TabBar';
import HomePage from './components/HomePage';
import RecordsPage from './components/RecordsPage';
import AnalyticsPage from './components/AnalyticsPage';
import SettingsPage from './components/SettingsPage';
import AddRecordSheet from './components/AddRecordSheet';
import RecordDetailSheet from './components/RecordDetailSheet';
import SettlementSheet from './components/SettlementSheet';
import MileageSheet from './components/MileageSheet';
import RecurringSheet from './components/RecurringSheet';
import AddRecurringSheet from './components/AddRecurringSheet';

const THEME_BG = { light: '#F3F0E9', dark: '#1A1813' };

/** 外觀模式存在本機（與 iOS 相同，不隨帳本同步）；相容舊版的 theme 設定 */
function initialAppearance() {
  const saved = localStorage.getItem('appearanceMode');
  if (['light', 'dark', 'system'].includes(saved)) return saved;
  const legacy = localStorage.getItem('theme');
  return legacy === 'light' || legacy === 'dark' ? legacy : 'system';
}

export default function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo]       = useState(false);

  // 帳本（household）：網頁與 App 指向同一個 id 才會同步
  const [householdId, setHouseholdId] = useState(null);
  const [householdState, setHouseholdState] = useState('resolving'); // resolving | ready | none | error
  const [retryKey, setRetryKey] = useState(0);

  const {
    records, vehicles, recurring, mileageLogs, settlements, settings, inviteCode, api,
  } = useLedger(householdId, demo);

  const [tab, setTab]     = useState('home');
  const [sheet, setSheet] = useState(null);   // null | 'settlement' | 'mileage' | 'recurring'

  // 記錄頁月曆：顯示中的年月 + 選定日（放在這層，FAB 新增時才能帶入選定日）
  const [calYear,  setCalYear]  = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState('');

  const [addRecord,     setAddRecord]     = useState(null);   // 待新增的記錄
  const [editRecord,    setEditRecord]    = useState(null);
  const [detailId,      setDetailId]      = useState(null);
  const [recurringEdit, setRecurringEdit] = useState(null);   // null | 'new' | item
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  // MARK: - 外觀

  const [appearance, setAppearance] = useState(initialAppearance);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const darkMode = appearance === 'dark' || (appearance === 'system' && systemDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('appearanceMode', appearance);
    // 瀏覽器網址列 / 狀態列底色跟著實際主題走，而不是只看系統設定
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
      m.setAttribute('content', THEME_BG[darkMode ? 'dark' : 'light']);
    });
  }, [darkMode, appearance]);

  // MARK: - 登入 / 帳本

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
      if (!u) {
        setHouseholdId(null);
        setHouseholdState('resolving');
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setHouseholdState('resolving');
    resolveHouseholdId(user.uid)
      .then(id => {
        if (cancelled) return;
        if (id) { setHouseholdId(id); setHouseholdState('ready'); }
        else    { setHouseholdId(null); setHouseholdState('none'); }
      })
      .catch(() => { if (!cancelled) setHouseholdState('error'); });
    return () => { cancelled = true; };
  }, [user, retryKey]);

  // MARK: - 衍生資料

  const today = todayLocal();
  const typeMap = buildTypeMap(settings.definedTypes);
  const defaultVehicleId = settings.defaultVehicleId || vehicles[0]?.id || '';

  // 只有「沒開自動記帳」的到期項目才需要使用者確認
  const dueItems = recurring.filter(r => needsConfirm(r, today));

  // 分攤餘額使用全域未結清記錄，不受月份篩選影響（與 iOS 一致）
  const balance = calcBalance(unsettledSplitRecords(records, settlements), settings.definedUsers);

  /** 歷史商家，依出現頻率排序（商家自動完成用，對應 iOS pastVendors） */
  const pastVendors = useMemo(() => {
    const freq = {};
    for (const r of records) if (r.vendor) freq[r.vendor] = (freq[r.vendor] || 0) + 1;
    return Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
  }, [records]);

  // MARK: - 自動記帳

  // 開啟 autoRecord 的項目到期後自動補記（含補記過去漏掉的期數）。
  // 文件 ID 由「項目 ID + 到期日」決定，App 與網頁同時補記也只會寫到同一份文件，
  // 因此不會重複記帳。
  const catchUpRan = useRef(new Set());
  useEffect(() => {
    if (recurring.length === 0) return;

    (async () => {
      for (const item of recurring) {
        const dates = pendingDueDates(item, today);
        if (dates.length === 0) continue;

        // 同一次載入內避免對同一項目重複觸發（onSnapshot 會多次回呼）
        const guard = `${item.id}@${dates[dates.length - 1]}`;
        if (catchUpRan.current.has(guard)) continue;
        catchUpRan.current.add(guard);

        try {
          await api.batch([
            ...dates.map(due => ({
              op: 'set', coll: 'records', id: autoRecordId(item.id, due), data: buildRecordFrom(item, due),
            })),
            // 推進到最後一期之後的下一次到期日
            {
              op: 'update', coll: 'recurring', id: item.id,
              data: { nextDue: calcNextDue(dates[dates.length - 1], item) },
            },
          ]);
        } catch (err) {
          catchUpRan.current.delete(guard);   // 失敗就允許下次重試
          console.error('自動記帳失敗', item.vendor, err);
        }
      }
    })();
  }, [api, recurring, today]);

  // MARK: - 記錄

  /** 新記錄的初值。從月曆選定某天後新增時帶入那天，時間沿用現在的時分。 */
  const emptyRecord = (type, day) => ({
    type: type ?? 'charging', vendor: '', cost: 0, kwh: 0,
    user: settings.definedUsers[0] ?? '', vehicleId: defaultVehicleId,
    note: '', mileage: '', expiryDate: '',
    date: day ? `${day}T${nowLocal().slice(11)}` : nowLocal(),
    paidBy: '', splitMethod: 'none', splitEntries: [],
  });

  const handleAdd = async (data) => {
    await api.add('records', data);
    setAddRecord(null);
  };

  const handleEditRecord = async (data) => {
    await api.update('records', editRecord.id, data);
    setEditRecord(null);
  };

  const handleDeleteRecord = async (r) => {
    if (!window.confirm('確定要刪除這筆記錄？')) return;
    setDetailId(null);
    await api.remove('records', r.id);
  };

  // MARK: - 週期項目

  const advanceDue = (item) =>
    api.update('recurring', item.id, { nextDue: calcNextDue(item.nextDue, item) });

  const handleConfirmRecurring = async (item) => {
    await api.add('records', {
      type: item.type,
      vendor: item.vendor,
      cost: item.cost,
      kwh: item.kwh || 0,
      user: item.user,
      vehicleId: item.vehicleId || '',
      note: item.note || '',
      mileage: '',
      expiryDate: '',
      date: nowLocal(),
      paidBy: item.user,
      splitMethod: 'none',
      splitEntries: [],
    });
    await advanceDue(item);
  };

  const handleSaveRecurring = async (data) => {
    if (recurringEdit === 'new') await api.add('recurring', data);
    else await api.update('recurring', recurringEdit.id, data);
    setRecurringEdit(null);
  };

  const handleDeleteRecurring = async () => {
    if (!window.confirm('確定要刪除此週期項目？')) return;
    const id = recurringEdit.id;
    setRecurringEdit(null);
    await api.remove('recurring', id);
  };

  // MARK: - 結清

  const handleCreateSettlement = async (selected) => {
    if (pendingSettlement(settlements)) return;
    const b = calcBalance(selected, settings.definedUsers);
    if (!b) return;
    await api.add('settlements', {
      sequenceNumber: Math.max(0, ...settlements.map(s => s.sequenceNumber || 0)) + 1,
      createdAt: todayLocal(),
      settledAt: '',
      debtorUser: b.debtor,
      creditorUser: b.creditor,
      amount: b.amount,
      note: '',
      recordIds: selected.map(r => r.id),
    });
  };

  const handleDeleteSettlement = async (s) => {
    if (!window.confirm('確定要刪除這筆結算？')) return;
    await api.remove('settlements', s.id);
  };

  // MARK: - 設定

  const handleDeleteType = async (typeId, hasRecords) => {
    if (hasRecords) {
      await api.batch(records.filter(r => r.type === typeId).map(r => ({
        op: 'update', coll: 'records', id: r.id, data: { type: 'other' },
      })));
    }
    await api.saveSettings({ definedTypes: settings.definedTypes.filter(t => t.id !== typeId) });
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = JSON.parse(await file.text());
      const ops = [];
      data.records?.forEach(({ id, ...rest }) => ops.push({ op: 'set', coll: 'records', id, data: rest }));
      data.vehicles?.forEach(({ id, ...rest }) => ops.push({ op: 'set', coll: 'vehicles', id, data: rest }));
      await api.batch(ops);
      if (data.definedUsers || data.defaultVehicleId) {
        await api.saveSettings({
          definedUsers: data.definedUsers ?? settings.definedUsers,
          defaultVehicleId: data.defaultVehicleId ?? settings.defaultVehicleId,
        });
      }
      alert(`匯入成功！共 ${data.records?.length ?? 0} 筆記錄`);
    } catch (err) {
      alert('匯入失敗：' + err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleSignOut = () => {
    if (demo) { setDemo(false); setTab('home'); return; }
    signOut(auth);
  };

  // MARK: - Render

  if (!demo) {
    if (loading) return <LoadingView />;
    // Demo 入口僅開發環境提供（對應 iOS 的 DEBUG build 限定）
    if (!user) return <Login onDemo={import.meta.env.DEV ? () => setDemo(true) : undefined} />;
    if (householdState === 'resolving') return <LoadingView />;
    if (householdState !== 'ready') {
      return (
        <NoHousehold
          state={householdState}
          onRetry={() => { clearCachedHouseholdId(user.uid); setRetryKey(k => k + 1); }}
          onSignOut={() => signOut(auth)}
        />
      );
    }
  }

  const displayName = demo ? (settings.definedUsers[0] ?? '') : (user?.displayName ?? '');
  const detailRecord = detailId ? records.find(r => r.id === detailId) : null;
  const changeTab = (t) => { setTab(t); window.scrollTo(0, 0); };

  return (
    <div className="min-h-[100dvh] bg-ww-bg text-ww-ink">
      <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      <main className="max-w-app mx-auto px-[22px] pt-[env(safe-area-inset-top)]
                       pb-[calc(111px+env(safe-area-inset-bottom))]">
        {tab === 'home' && (
          <HomePage
            records={records} vehicles={vehicles} mileageLogs={mileageLogs}
            dueItems={dueItems} balance={balance} settings={settings}
            displayName={displayName} defaultVehicleId={defaultVehicleId}
            onOpenSettlement={() => setSheet('settlement')}
            onOpenRecurring={() => setSheet('recurring')}
            onOpenMileage={() => setSheet('mileage')}
            onOpenSettings={() => changeTab('settings')}
            onQuickAdd={typeId => setAddRecord(emptyRecord(typeId))}
            onOpenRecord={r => setDetailId(r.id)}
            onSeeAllRecords={() => changeTab('records')}
          />
        )}

        {tab === 'records' && (
          <RecordsPage
            records={records} vehicles={vehicles} settings={settings}
            calYear={calYear} calMonth={calMonth}
            selectedDay={selectedDay} onSelectDay={setSelectedDay}
            onChangeMonth={(y, m) => { setCalYear(y); setCalMonth(m); setSelectedDay(''); }}
            onOpenRecord={r => setDetailId(r.id)}
          />
        )}

        {tab === 'analytics' && (
          <AnalyticsPage
            records={records} mileageLogs={mileageLogs} vehicles={vehicles}
            settings={settings} defaultVehicleId={defaultVehicleId} darkMode={darkMode}
          />
        )}

        {tab === 'settings' && (
          <SettingsPage
            settings={settings} records={records} vehicles={vehicles}
            settlements={settlements} recurring={recurring} balance={balance}
            displayName={displayName} demo={demo} inviteCode={inviteCode}
            defaultVehicleId={defaultVehicleId}
            appearance={appearance} onAppearance={setAppearance}
            onSaveSettings={api.saveSettings}
            onUpdateTypes={types => api.saveSettings({ definedTypes: types })}
            onUpdateUsers={users => api.saveSettings({ definedUsers: users })}
            onDeleteType={handleDeleteType}
            onOpenSettlement={() => setSheet('settlement')}
            onOpenRecurring={() => setSheet('recurring')}
            onImportClick={() => importInputRef.current?.click()}
            importing={importing}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      <TabBar
        tab={tab} onChange={changeTab} dueCount={dueItems.length}
        // 只有在記錄頁才沿用月曆選定的日期
        onAdd={() => setAddRecord(emptyRecord(undefined, tab === 'records' ? selectedDay : ''))}
      />

      {/* Sheets（對應 iOS 的 .sheet） */}

      {sheet === 'settlement' && (
        <SettlementSheet
          records={records} settlements={settlements} settings={settings}
          onClose={() => setSheet(null)}
          onCreate={handleCreateSettlement}
          onMarkSettled={s => api.update('settlements', s.id, { settledAt: todayLocal() })}
          onDelete={handleDeleteSettlement}
        />
      )}

      {sheet === 'mileage' && (
        <MileageSheet
          logs={mileageLogs} records={records} vehicles={vehicles} settings={settings}
          defaultVehicleId={defaultVehicleId}
          onClose={() => setSheet(null)}
          onAdd={log => api.add('mileageLogs', log)}
          onUpdate={(id, log) => api.update('mileageLogs', id, log)}
          onDelete={id => api.remove('mileageLogs', id)}
        />
      )}

      {sheet === 'recurring' && (
        <RecurringSheet
          items={recurring} settings={settings}
          onClose={() => setSheet(null)}
          onAdd={() => setRecurringEdit('new')}
          onEdit={setRecurringEdit}
          onToggle={item => api.update('recurring', item.id, { active: !item.active })}
          onConfirm={handleConfirmRecurring}
          onSkip={advanceDue}
        />
      )}

      {recurringEdit && (
        <AddRecurringSheet
          item={recurringEdit === 'new' ? null : recurringEdit}
          settings={settings} defaultVehicleId={defaultVehicleId}
          onClose={() => setRecurringEdit(null)}
          onSave={handleSaveRecurring}
          onDelete={handleDeleteRecurring}
        />
      )}

      {detailRecord && (
        <RecordDetailSheet
          record={detailRecord} type={typeMap[detailRecord.type]}
          onClose={() => setDetailId(null)}
          onEdit={r => { setDetailId(null); setEditRecord(r); }}
          onDelete={handleDeleteRecord}
        />
      )}

      {addRecord && (
        <AddRecordSheet
          record={addRecord} settings={settings} vehicles={vehicles} pastVendors={pastVendors}
          onClose={() => setAddRecord(null)} onSave={handleAdd}
        />
      )}

      {editRecord && (
        <AddRecordSheet
          record={editRecord} isEditing settings={settings} vehicles={vehicles} pastVendors={pastVendors}
          onClose={() => setEditRecord(null)} onSave={handleEditRecord}
        />
      )}
    </div>
  );
}

function NoHousehold({ state, onRetry, onSignOut }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-ww-bg px-[22px]">
      <div className="max-w-sm w-full bg-ww-card border border-ww-line rounded-ww-lg p-7 text-center">
        <div className="text-[18px] font-bold text-ww-ink mb-2">
          {state === 'error' ? '帳本讀取失敗' : '尚未加入帳本'}
        </div>
        <p className="text-[14px] text-ww-ink2 leading-relaxed mb-5">
          {state === 'error'
            ? '無法讀取帳本資料，請檢查網路後重試。'
            : '這個 Google 帳號還沒有家庭帳本。請先在 WattWise App 建立帳本或用邀請碼加入，網頁版才能同步同一份資料。'}
        </p>
        <button onClick={onRetry}
          className="w-full bg-ww-brand text-white py-3.5 rounded-ww-inner text-[14px] font-bold mb-2">
          重新載入
        </button>
        <button onClick={onSignOut} className="w-full text-ww-sub py-2 text-[14px]">
          切換帳號
        </button>
      </div>
    </div>
  );
}
