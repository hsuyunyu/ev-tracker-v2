import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, getDoc, setDoc, writeBatch,
} from 'firebase/firestore';
import Login from './components/Login';
import NavBar from './components/NavBar';
import FilterBar from './components/FilterBar';
import StatsBar from './components/StatsBar';
import RecordList from './components/RecordList';
import AddRecordModal from './components/AddRecordModal';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [settings, setSettings] = useState({
    definedUsers: ['所有人', 'Rose', '1+'],
    defaultVehicleId: '',
  });
  const [filters, setFilters] = useState({ type: 'all', user: 'all', month: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  // Auth
  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // Records (realtime)
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'records'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(data);
    });
  }, [user]);

  // Vehicles (realtime)
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'vehicles'), snap => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  // Settings (one-time)
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'settings', 'config')).then(snap => {
      if (snap.exists()) setSettings(snap.data());
    });
  }, [user]);

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

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Firestore batch limit is 500 — split if needed
      const batchSize = 400;
      const items = [];

      data.records?.forEach(({ id, ...rest }) => {
        items.push({ ref: doc(db, 'records', id), data: rest });
      });
      data.vehicles?.forEach(({ id, ...rest }) => {
        items.push({ ref: doc(db, 'vehicles', id), data: rest });
      });

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = writeBatch(db);
        items.slice(i, i + batchSize).forEach(({ ref, data: d }) => batch.set(ref, d));
        await batch.commit();
      }

      if (data.definedUsers || data.defaultVehicleId) {
        await setDoc(doc(db, 'settings', 'config'), {
          definedUsers: data.definedUsers ?? [],
          defaultVehicleId: data.defaultVehicleId ?? '',
        });
        setSettings({
          definedUsers: data.definedUsers ?? [],
          defaultVehicleId: data.defaultVehicleId ?? '',
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">載入中...</div>
      </div>
    );
  }

  if (!user) return <Login />;

  const defaultVehicleId = settings.defaultVehicleId || vehicles[0]?.id || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        user={user}
        onSignOut={() => signOut(auth)}
        onImportClick={() => importInputRef.current?.click()}
        importing={importing}
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <FilterBar
          filters={filters}
          onFilter={setFilters}
          definedUsers={settings.definedUsers}
        />

        <StatsBar records={filteredRecords} />

        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-400">{filteredRecords.length} 筆記錄</span>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + 新增記錄
          </button>
        </div>

        <RecordList records={filteredRecords} onDelete={handleDelete} />
      </main>

      {showAdd && (
        <AddRecordModal
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
          definedUsers={settings.definedUsers}
          defaultVehicleId={defaultVehicleId}
        />
      )}
    </div>
  );
}
