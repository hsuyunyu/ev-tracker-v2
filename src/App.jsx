import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, getDoc, setDoc, writeBatch, updateDoc,
} from 'firebase/firestore';
import Login from './components/Login';
import NavBar from './components/NavBar';
import FilterBar from './components/FilterBar';
import StatsBar from './components/StatsBar';
import RecordList from './components/RecordList';
import AddRecordModal from './components/AddRecordModal';
import DueBanner from './components/DueBanner';
import RecurringList from './components/RecurringList';
import AddRecurringModal from './components/AddRecurringModal';
import AnalyticsPage from './components/AnalyticsPage';

function calculateNextDue(currentDue, item) {
  const d = new Date(currentDue);
  const months = item.intervalMonths ||
    { monthly: 1, quarterly: 3, yearly: 12 }[item.interval] || 1;
  d.setMonth(d.getMonth() + months);
  if (item.dayOfMonth) {
    const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(item.dayOfMonth, maxDay));
  }
  return d.toISOString().slice(0, 10);
}

export default function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [records,   setRecords]   = useState([]);
  const [vehicles,  setVehicles]  = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [settings,  setSettings]  = useState({
    definedUsers: ['所有人', 'Rose', '1+'],
    defaultVehicleId: '',
  });

  const [tab,       setTab]      = useState('records');
  const [filters,   setFilters]  = useState({ type: 'all', user: 'all', month: '' });
  const [showAdd,   setShowAdd]  = useState(false);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Auth
  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // Records
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'records'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(data);
    });
  }, [user]);

  // Vehicles
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'vehicles'), snap => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  // Recurring
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'recurring'), snap => {
      setRecurring(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  // Settings
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'settings', 'config')).then(snap => {
      if (snap.exists()) setSettings(snap.data());
    });
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const dueItems = recurring.filter(r => r.active && r.nextDue <= today);

  const filteredRecords = records.filter(r => {
    if (filters.type !== 'all' && r.type !== filters.type) return false;
    if (filters.user !== 'all' && r.user !== filters.user) return false;
    if (filters.month && !r.date?.startsWith(filters.month)) return false;
    return true;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('確定要刪除這筆記錄？')) return;
    await deleteDoc(doc(db, 'records', id));
  };

  const handleAdd = async (formData) => {
    await addDoc(collection(db, 'records'), formData);
    setShowAdd(false);
  };

  const handleConfirmRecurring = async (item) => {
    await addDoc(collection(db, 'records'), {
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
    });
    await updateDoc(doc(db, 'recurring', item.id), {
      nextDue: calculateNextDue(item.nextDue, item),
    });
  };

  const handleSkipRecurring = async (item) => {
    await updateDoc(doc(db, 'recurring', item.id), {
      nextDue: calculateNextDue(item.nextDue, item),
    });
  };

  const handleDeleteRecurring = async (id) => {
    if (!window.confirm('確定要刪除此週期項目？')) return;
    await deleteDoc(doc(db, 'recurring', id));
  };

  const handleToggleRecurring = async (item) => {
    await updateDoc(doc(db, 'recurring', item.id), { active: !item.active });
  };

  const handleAddRecurring = async (formData) => {
    await addDoc(collection(db, 'recurring'), formData);
    setShowAddRecurring(false);
  };

  const handleEditRecurring = async (formData) => {
    const { id, ...data } = editingRecurring;
    await updateDoc(doc(db, 'recurring', id), { ...data, ...formData });
    setEditingRecurring(null);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const items = [];
      data.records?.forEach(({ id, ...rest }) => {
        items.push({ ref: doc(db, 'records', id), data: rest });
      });
      data.vehicles?.forEach(({ id, ...rest }) => {
        items.push({ ref: doc(db, 'vehicles', id), data: rest });
      });
      for (let i = 0; i < items.length; i += 400) {
        const batch = writeBatch(db);
        items.slice(i, i + 400).forEach(({ ref, data: d }) => batch.set(ref, d));
        await batch.commit();
      }
      if (data.definedUsers || data.defaultVehicleId) {
        const cfg = {
          definedUsers: data.definedUsers ?? [],
          defaultVehicleId: data.defaultVehicleId ?? '',
        };
        await setDoc(doc(db, 'settings', 'config'), cfg);
        setSettings(cfg);
      }
      alert(`匯入成功！共 ${data.records?.length ?? 0} 筆記錄`);
    } catch (err) {
      alert('匯入失敗：' + err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
      <div className="text-gray-400">載入中...</div>
    </div>
  );

  if (!user) return <Login darkMode={darkMode} />;

  const defaultVehicleId = settings.defaultVehicleId || vehicles[0]?.id || '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 transition-colors">
      <NavBar
        user={user}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        onSignOut={() => signOut(auth)}
        onImportClick={() => importInputRef.current?.click()}
        importing={importing}
      />

      <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      {/* Tabs */}
      <div className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          {[
            { key: 'records',   label: '費用記錄' },
            { key: 'recurring', label: `週期項目${dueItems.length > 0 ? ` (${dueItems.length})` : ''}` },
            { key: 'analytics', label: '數據分析' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-tesla text-tesla'
                  : 'border-transparent text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {tab === 'records' && (
          <>
            {dueItems.length > 0 && (
              <DueBanner
                items={dueItems}
                onConfirm={handleConfirmRecurring}
                onSkip={handleSkipRecurring}
              />
            )}
            <FilterBar filters={filters} onFilter={setFilters} definedUsers={settings.definedUsers} />
            <StatsBar records={filteredRecords} />
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-400 dark:text-neutral-500">{filteredRecords.length} 筆記錄</span>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-tesla hover:bg-tesla-hover text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                + 新增記錄
              </button>
            </div>
            <RecordList records={filteredRecords} onDelete={handleDelete} />
          </>
        )}

        {tab === 'recurring' && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowAddRecurring(true)}
                className="bg-tesla hover:bg-tesla-hover text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                + 新增週期
              </button>
            </div>
            <RecurringList
              items={recurring}
              onDelete={handleDeleteRecurring}
              onToggle={handleToggleRecurring}
              onEdit={item => setEditingRecurring(item)}
            />
          </>
        )}
      </main>

        {tab === 'analytics' && (
          <AnalyticsPage
            records={records}
            darkMode={darkMode}
            definedUsers={settings.definedUsers}
          />
        )}

      {showAdd && (
        <AddRecordModal
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
          definedUsers={settings.definedUsers}
          defaultVehicleId={defaultVehicleId}
        />
      )}

      {showAddRecurring && (
        <AddRecurringModal
          onClose={() => setShowAddRecurring(false)}
          onSave={handleAddRecurring}
          definedUsers={settings.definedUsers}
          defaultVehicleId={defaultVehicleId}
        />
      )}

      {editingRecurring && (
        <AddRecurringModal
          onClose={() => setEditingRecurring(null)}
          onSave={handleEditRecurring}
          definedUsers={settings.definedUsers}
          defaultVehicleId={defaultVehicleId}
          editItem={editingRecurring}
        />
      )}
    </div>
  );
}
