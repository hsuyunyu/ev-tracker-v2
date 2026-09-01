import React, { useState, useEffect, useRef } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  onSnapshot, addDoc, deleteDoc, setDoc, writeBatch, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  resolveHouseholdId, clearCachedHouseholdId,
  hCollection, hDoc, settingsDoc,
} from './household';
import {
  unsettledSplitRecords, calcBalance, pendingSettlement, isSettled, todayLocal,
} from './split';
import {
  calcNextDue, needsConfirm, pendingDueDates, autoRecordId, buildRecordFrom,
} from './recurring';

import Login from './components/Login';
import NavBar from './components/NavBar';
import TabBar from './components/TabBar';
import FilterBar from './components/FilterBar';
import StatsBar from './components/StatsBar';
import RecordList from './components/RecordList';
import AddRecordModal from './components/AddRecordModal';
import DueBanner from './components/DueBanner';
import RecurringList from './components/RecurringList';
import AddRecurringModal from './components/AddRecurringModal';
import AnalyticsPage from './components/AnalyticsPage';
import SettingsPage from './components/SettingsPage';
import SettlementPage from './components/SettlementPage';
import MileagePage from './components/MileagePage';
import BalanceBar from './components/BalanceBar';
import HomePage from './components/HomePage';
import MonthCalendar from './components/MonthCalendar';

const DEFAULT_SETTINGS = {
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

export default function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // 帳本（household）：網頁與 App 指向同一個 id 才會同步
  const [householdId, setHouseholdId] = useState(null);
  const [householdState, setHouseholdState] = useState('resolving'); // resolving | ready | none | error
  const [retryKey, setRetryKey] = useState(0);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [records,     setRecords]     = useState([]);
  const [vehicles,    setVehicles]    = useState([]);
  const [recurring,   setRecurring]   = useState([]);
  const [mileageLogs, setMileageLogs] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [settings,    setSettings]    = useState(DEFAULT_SETTINGS);

  const [tab,     setTab]     = useState('home');
  const [subPage, setSubPage] = useState(null); // null | 'settlement' | 'mileage' | 'recurring'

  // 記錄頁月曆：顯示中的年月 + 選定日
  const nowRef = new Date();
  const [calYear,  setCalYear]  = useState(nowRef.getFullYear());
  const [calMonth, setCalMonth] = useState(nowRef.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState('');
  const [filters, setFilters] = useState({ type: 'all', user: 'all', month: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [editingRecord,    setEditingRecord]    = useState(null);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Auth
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

  // 解析 householdId
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

  // 訂閱帳本底下的所有集合
  useEffect(() => {
    if (!householdId) return;

    const subs = [
      onSnapshot(hCollection(householdId, 'records'), snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecords(data);
      }),
      onSnapshot(hCollection(householdId, 'vehicles'), snap => {
        // ⚠️ 必須與 iOS 看到的車輛清單一致。
        // iOS 的 Vehicle 用合成 Codable，name / licensePlate 皆為必填，
        // 缺欄位的舊文件會解碼失敗而被 compactMap 丟棄；網頁若照單全收，
        // 兩邊的「第一台車」就會不同，首頁車輛卡的車牌與里程因此對不上。
        const usable = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(v => typeof v.name === 'string' && typeof v.licensePlate === 'string');
        setVehicles(usable);
      }),
      onSnapshot(hCollection(householdId, 'recurring'), snap => {
        setRecurring(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(hCollection(householdId, 'mileageLogs'), snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setMileageLogs(data);
      }),
      onSnapshot(hCollection(householdId, 'settlements'), snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.sequenceNumber || 0) - (a.sequenceNumber || 0));
        setSettlements(data);
      }),
      onSnapshot(settingsDoc(householdId), snap => {
        if (snap.exists()) setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
      }),
    ];
    return () => subs.forEach(un => un());
  }, [householdId]);

  const today = todayLocal();
  // 只有「沒開自動記帳」的到期項目才需要使用者確認
  const dueItems = recurring.filter(r => needsConfirm(r, today));

  // 自動記帳：開啟 autoRecord 的項目到期後自動補記（含補記過去漏掉的期數）。
  // 文件 ID 由「項目 ID + 到期日」決定，App 與網頁同時補記也只會寫到同一份文件，
  // 因此不會重複記帳。
  const catchUpRan = useRef(new Set());
  useEffect(() => {
    if (!householdId || recurring.length === 0) return;

    (async () => {
      for (const item of recurring) {
        const dates = pendingDueDates(item, today);
        if (dates.length === 0) continue;

        // 同一次載入內避免對同一項目重複觸發（onSnapshot 會多次回呼）
        const guard = `${item.id}@${dates[dates.length - 1]}`;
        if (catchUpRan.current.has(guard)) continue;
        catchUpRan.current.add(guard);

        try {
          const batch = writeBatch(db);
          for (const due of dates) {
            batch.set(
              hDoc(householdId, 'records', autoRecordId(item.id, due)),
              buildRecordFrom(item, due)
            );
          }
          // 推進到最後一期之後的下一次到期日
          const finalDue = calcNextDue(dates[dates.length - 1], item);
          batch.update(hDoc(householdId, 'recurring', item.id), { nextDue: finalDue });
          await batch.commit();
        } catch (err) {
          catchUpRan.current.delete(guard);   // 失敗就允許下次重試
          console.error('自動記帳失敗', item.vendor, err);
        }
      }
    })();
  }, [householdId, recurring, today]);

  const calMonthStr = `${calYear}-${String(calMonth).padStart(2, '0')}`;
  // 月曆上的記錄不受類型/成員篩選影響，只看顯示中的月份
  const calendarRecords = records.filter(r => r.date?.startsWith(calMonthStr));

  const filteredRecords = records.filter(r => {
    if (filters.type !== 'all' && r.type !== filters.type) return false;
    // 選了某一天就只看那天，否則看月曆顯示中的整個月
    if (selectedDay) {
      if (!r.date?.startsWith(selectedDay)) return false;
    } else if (!r.date?.startsWith(calMonthStr)) return false;
    if (filters.month && !r.date?.startsWith(filters.month)) return false;
    // 成員篩選：主要支出人 OR 分攤參與者（含金額 > 0）
    if (filters.user !== 'all') {
      const isMainUser  = r.user === filters.user;
      const isSplitUser = (r.splitEntries || []).some(e => e.user === filters.user && e.amount > 0);
      if (!isMainUser && !isSplitUser) return false;
    }
    return true;
  });

  // 分攤餘額不受月份篩選影響（全域未結清），與 iOS RecordsView 一致
  const openRecords = unsettledSplitRecords(records, settlements);
  const balance     = calcBalance(openRecords, settings.definedUsers);
  const pending     = pendingSettlement(settlements);

  // MARK: - 記錄

  const handleDelete = async (id) => {
    if (!window.confirm('確定要刪除這筆記錄？')) return;
    await deleteDoc(hDoc(householdId, 'records', id));
  };

  const handleAdd = async (formData) => {
    await addDoc(hCollection(householdId, 'records'), formData);
    setShowAdd(false);
  };

  const handleEditRecord = async (formData) => {
    await updateDoc(hDoc(householdId, 'records', editingRecord.id), formData);
    setEditingRecord(null);
  };

  // MARK: - 週期項目

  const handleConfirmRecurring = async (item) => {
    await addDoc(hCollection(householdId, 'records'), {
      type: item.type,
      vendor: item.vendor,
      cost: item.cost,
      kwh: item.kwh || 0,
      user: item.user,
      vehicleId: item.vehicleId || '',
      note: item.note || '',
      mileage: '',
      expiryDate: '',
      date: new Date().toISOString().slice(0, 16),
      paidBy: item.user,
      splitMethod: 'none',
      splitEntries: [],
    });
    await updateDoc(hDoc(householdId, 'recurring', item.id), {
      nextDue: calcNextDue(item.nextDue, item),
    });
  };

  const handleSkipRecurring = async (item) => {
    await updateDoc(hDoc(householdId, 'recurring', item.id), {
      nextDue: calcNextDue(item.nextDue, item),
    });
  };

  const handleDeleteRecurring = async (id) => {
    if (!window.confirm('確定要刪除此週期項目？')) return;
    await deleteDoc(hDoc(householdId, 'recurring', id));
  };

  const handleToggleRecurring = async (item) => {
    await updateDoc(hDoc(householdId, 'recurring', item.id), { active: !item.active });
  };

  const handleAddRecurring = async (formData) => {
    await addDoc(hCollection(householdId, 'recurring'), formData);
    setShowAddRecurring(false);
  };

  const handleEditRecurring = async (formData) => {
    const { id, ...data } = editingRecurring;
    await updateDoc(hDoc(householdId, 'recurring', id), { ...data, ...formData });
    setEditingRecurring(null);
  };

  // MARK: - 里程

  const handleAddMileage = async (log) => {
    await addDoc(hCollection(householdId, 'mileageLogs'), log);
  };

  const handleDeleteMileage = async (id) => {
    if (!window.confirm('確定要刪除這筆里程記錄？')) return;
    await deleteDoc(hDoc(householdId, 'mileageLogs', id));
  };

  // MARK: - 結清

  const handleCreateSettlement = async (selected) => {
    if (pending) return;
    const b = calcBalance(selected, settings.definedUsers);
    if (!b) return;
    const nextSeq = Math.max(0, ...settlements.map(s => s.sequenceNumber || 0)) + 1;
    await addDoc(hCollection(householdId, 'settlements'), {
      sequenceNumber: nextSeq,
      createdAt: todayLocal(),
      settledAt: '',
      debtorUser: b.debtor,
      creditorUser: b.creditor,
      amount: b.amount,
      note: '',
      recordIds: selected.map(r => r.id),
    });
  };

  const handleMarkSettled = async (s) => {
    await updateDoc(hDoc(householdId, 'settlements', s.id), {
      settledAt: todayLocal(),
    });
  };

  const handleDeleteSettlement = async (s) => {
    if (!window.confirm('確定要刪除這筆結算？')) return;
    await deleteDoc(hDoc(householdId, 'settlements', s.id));
  };

  // MARK: - 設定

  const saveSettings = async (patch) => {
    const updated = { ...settings, ...patch };
    await setDoc(settingsDoc(householdId), updated, { merge: true });
    setSettings(updated);
  };

  const handleUpdateTypes = (newTypes) => saveSettings({ definedTypes: newTypes });
  const handleUpdateUsers = (newUsers) => saveSettings({ definedUsers: newUsers });

  const handleDeleteType = async (typeId, hasRecords) => {
    if (hasRecords) {
      const affected = records.filter(r => r.type === typeId);
      for (let i = 0; i < affected.length; i += 400) {
        const batch = writeBatch(db);
        affected.slice(i, i + 400).forEach(r => {
          batch.update(hDoc(householdId, 'records', r.id), { type: 'other' });
        });
        await batch.commit();
      }
    }
    await saveSettings({ definedTypes: settings.definedTypes.filter(t => t.id !== typeId) });
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = JSON.parse(await file.text());
      const items = [];
      data.records?.forEach(({ id, ...rest }) => {
        items.push({ ref: hDoc(householdId, 'records', id), data: rest });
      });
      data.vehicles?.forEach(({ id, ...rest }) => {
        items.push({ ref: hDoc(householdId, 'vehicles', id), data: rest });
      });
      for (let i = 0; i < items.length; i += 400) {
        const batch = writeBatch(db);
        items.slice(i, i + 400).forEach(({ ref, data: d }) => batch.set(ref, d));
        await batch.commit();
      }
      if (data.definedUsers || data.defaultVehicleId) {
        await saveSettings({
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

  // MARK: - Render

  if (loading) return <Splash text="載入中…" />;
  if (!user)   return <Login darkMode={darkMode} />;

  if (householdState === 'resolving') return <Splash text="連線帳本中…" />;

  if (householdState !== 'ready') {
    return (
      <NoHousehold
        state={householdState}
        onRetry={() => { clearCachedHouseholdId(user.uid); setRetryKey(k => k + 1); }}
        onSignOut={() => signOut(auth)}
      />
    );
  }

  const defaultVehicleId = settings.defaultVehicleId || vehicles[0]?.id || '';

  return (
    <div className="min-h-screen bg-ww-bg text-ww-ink transition-colors">
      <NavBar
        user={user}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        onSignOut={() => signOut(auth)}
        onImportClick={() => importInputRef.current?.click()}
        importing={importing}
      />

      <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      <main className="max-w-4xl mx-auto px-4 py-5 pb-28">
        {/* 子頁面：從記錄頁進入 */}
        {subPage === 'settlement' && (
          <SettlementPage
            records={records}
            settlements={settlements}
            settings={settings}
            onBack={() => setSubPage(null)}
            onCreate={handleCreateSettlement}
            onMarkSettled={handleMarkSettled}
            onDelete={handleDeleteSettlement}
          />
        )}

        {subPage === 'mileage' && (
          <MileagePage
            logs={mileageLogs}
            records={records}
            vehicles={vehicles}
            defaultVehicleId={defaultVehicleId}
            onBack={() => setSubPage(null)}
            onAdd={handleAddMileage}
            onDelete={handleDeleteMileage}
          />
        )}

        {!subPage && tab === 'home' && (
          <HomePage
            records={records}
            vehicles={vehicles}
            mileageLogs={mileageLogs}
            recurring={recurring}
            dueItems={dueItems}
            balance={balance}
            settings={settings}
            user={user}
            defaultVehicleId={defaultVehicleId}
            onOpenSettlement={() => setSubPage('settlement')}
            onOpenRecurring={() => setSubPage('recurring')}
            onOpenMileage={() => setSubPage('mileage')}
            onOpenSettings={() => setTab('settings')}
            onQuickAdd={typeId => setShowAdd(typeId)}
            onOpenRecord={r => setEditingRecord(r)}
            onSeeAllRecords={() => setTab('records')}
          />
        )}

        {!subPage && tab === 'records' && (
          <>
            {dueItems.length > 0 && (
              <DueBanner
                items={dueItems}
                onConfirm={handleConfirmRecurring}
                onSkip={handleSkipRecurring}
                definedTypes={settings.definedTypes}
              />
            )}

            <BalanceBar
              balance={balance}
              pending={pending}
              onOpen={() => setSubPage('settlement')}
              onOpenMileage={() => setSubPage('mileage')}
            />

            <div className="mt-3">
              <MonthCalendar
                records={calendarRecords}
                year={calYear}
                month={calMonth}
                selectedDate={selectedDay}
                onSelectDate={setSelectedDay}
                onChangeMonth={(y, m) => { setCalYear(y); setCalMonth(m); setSelectedDay(''); }}
              />
            </div>

            {selectedDay && (
              <button
                onClick={() => setSelectedDay('')}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                           bg-ww-brand text-white text-xs font-semibold"
              >
                {Number(selectedDay.slice(5, 7))}/{Number(selectedDay.slice(8, 10))} 的記錄
                <span className="text-white/80">✕</span>
              </button>
            )}

            <FilterBar
              filters={filters}
              onFilter={setFilters}
              definedUsers={settings.definedUsers}
              definedTypes={settings.definedTypes}
            />
            <StatsBar records={filteredRecords} />

            <div className="flex justify-between items-center mb-3 mt-4">
              <span className="text-sm text-ww-sub">{filteredRecords.length} 筆記錄</span>
            </div>

            <RecordList
              records={filteredRecords}
              onDelete={handleDelete}
              onEdit={r => setEditingRecord(r)}
              definedTypes={settings.definedTypes}
              settledIds={new Set(settlements.flatMap(s => s.recordIds || []))}
            />
          </>
        )}

        {subPage === 'recurring' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSubPage(null)}
                className="text-sm text-ww-brand font-semibold"
              >
                ‹ 返回
              </button>
              <h2 className="text-lg font-bold text-ww-ink">週期項目</h2>
              <button
                onClick={() => setShowAddRecurring(true)}
                className="px-3 py-1.5 rounded-full bg-ww-brand hover:bg-ww-brandhover
                           text-white text-xs font-semibold transition-colors"
              >
                + 新增
              </button>
            </div>
            <RecurringList
              items={recurring}
              onDelete={handleDeleteRecurring}
              onToggle={handleToggleRecurring}
              onEdit={item => setEditingRecurring(item)}
              definedTypes={settings.definedTypes}
            />
          </div>
        )}

        {!subPage && tab === 'analytics' && (
          <AnalyticsPage
            records={records}
            mileageLogs={mileageLogs}
            darkMode={darkMode}
            definedUsers={settings.definedUsers}
            definedTypes={settings.definedTypes}
          />
        )}

        {!subPage && tab === 'settings' && (
          <SettingsPage
            settings={settings}
            definedTypes={settings.definedTypes}
            definedUsers={settings.definedUsers}
            records={records}
            vehicles={vehicles}
            householdId={householdId}
            onUpdateTypes={handleUpdateTypes}
            onDeleteType={handleDeleteType}
            onUpdateUsers={handleUpdateUsers}
            onSaveSettings={saveSettings}
            onOpenMileage={() => setSubPage('mileage')}
          />
        )}
      </main>

      {!subPage && (
        <TabBar
          tab={tab}
          onChange={t => { setTab(t); setSubPage(null); }}
          dueCount={dueItems.length}
          onAdd={() => setShowAdd(true)}
        />
      )}

      {showAdd && (
        <AddRecordModal
          initialType={typeof showAdd === 'string' ? showAdd : undefined}
          initialDate={tab === 'records' ? selectedDay : ''}
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
          definedUsers={settings.definedUsers}
          defaultVehicleId={defaultVehicleId}
          definedTypes={settings.definedTypes}
          settings={settings}
          vehicles={vehicles}
        />
      )}

      {editingRecord && (
        <AddRecordModal
          onClose={() => setEditingRecord(null)}
          onSave={handleEditRecord}
          definedUsers={settings.definedUsers}
          defaultVehicleId={defaultVehicleId}
          editItem={editingRecord}
          definedTypes={settings.definedTypes}
          settings={settings}
          vehicles={vehicles}
        />
      )}

      {showAddRecurring && (
        <AddRecurringModal
          onClose={() => setShowAddRecurring(false)}
          onSave={handleAddRecurring}
          definedUsers={settings.definedUsers}
          defaultVehicleId={defaultVehicleId}
          definedTypes={settings.definedTypes}
        />
      )}

      {editingRecurring && (
        <AddRecurringModal
          onClose={() => setEditingRecurring(null)}
          onSave={handleEditRecurring}
          definedUsers={settings.definedUsers}
          defaultVehicleId={defaultVehicleId}
          editItem={editingRecurring}
          definedTypes={settings.definedTypes}
        />
      )}
    </div>
  );
}

function Splash({ text }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ww-bg">
      <div className="text-ww-sub text-sm">{text}</div>
    </div>
  );
}

function NoHousehold({ state, onRetry, onSignOut }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ww-bg px-6">
      <div className="max-w-sm w-full bg-ww-card border border-ww-line rounded-ww-lg p-7 text-center">
        <div className="text-lg font-semibold text-ww-ink mb-2">
          {state === 'error' ? '帳本讀取失敗' : '尚未加入帳本'}
        </div>
        <p className="text-sm text-ww-ink2 leading-relaxed mb-5">
          {state === 'error'
            ? '無法讀取帳本資料，請檢查網路後重試。'
            : '這個 Google 帳號還沒有家庭帳本。請先在 WattWise App 建立帳本或用邀請碼加入，網頁版才能同步同一份資料。'}
        </p>
        <button
          onClick={onRetry}
          className="w-full bg-ww-brand hover:bg-ww-brandhover text-white py-2.5 rounded-ww-inner text-sm font-medium transition-colors mb-2"
        >
          重新載入
        </button>
        <button onClick={onSignOut} className="w-full text-ww-sub py-2 text-sm hover:text-ww-ink transition-colors">
          切換帳號
        </button>
      </div>
    </div>
  );
}
