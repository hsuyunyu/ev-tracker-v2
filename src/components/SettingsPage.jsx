import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { resolveTypes } from '../typeConfig';

const COLORS = [
  '#3b82f6', '#f97316', '#eab308', '#a855f7', '#6b7280',
  '#E82127', '#22c55e', '#ec4899', '#14b8a6', '#f43f5e', '#8b5cf6', '#64748b',
];

function genId() {
  return 'type_' + Math.random().toString(36).slice(2, 8);
}

function TypeRow({ type, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-neutral-800 last:border-0">
      <span
        className="w-8 h-8 flex items-center justify-center rounded-full text-sm shrink-0"
        style={{ backgroundColor: type.color + '22', color: type.color }}
      >
        {type.icon}
      </span>
      <span className="flex-1 text-sm text-gray-800 dark:text-neutral-200">{type.label}</span>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(type)}
          className="p-1.5 text-gray-400 hover:text-tesla transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
        >
          <Pencil size={13} />
        </button>
        {!type.protected && (
          <button
            onClick={() => onDelete(type.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function TypeEditor({ initial, onSave, onCancel }) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [icon,  setIcon]  = useState(initial?.icon  ?? '📋');
  const [color, setColor] = useState(initial?.color ?? '#6b7280');

  const valid = label.trim().length > 0;

  return (
    <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-3 space-y-3 mt-1">
      <div className="flex gap-2">
        <div>
          <label className="text-xs text-gray-500 dark:text-neutral-400 mb-1 block">圖示</label>
          <input
            type="text"
            value={icon}
            onChange={e => setIcon(e.target.value)}
            className="w-14 border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-tesla"
            maxLength={2}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 dark:text-neutral-400 mb-1 block">名稱</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="類別名稱"
            className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-tesla"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-neutral-400 mb-1.5 block">顏色</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full transition-transform"
              style={{
                backgroundColor: c,
                outline: color === c ? `2px solid ${c}` : 'none',
                outlineOffset: 2,
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-neutral-700"
        >
          取消
        </button>
        <button
          onClick={() => valid && onSave({ label: label.trim(), icon, color })}
          disabled={!valid}
          className="flex-1 py-2 bg-tesla hover:bg-tesla-hover text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          儲存
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage({
  definedTypes, definedUsers, records,
  onUpdateTypes, onDeleteType, onUpdateUsers,
}) {
  const types = resolveTypes(definedTypes);
  const [editingId, setEditingId] = useState(null);
  const [addingType, setAddingType] = useState(false);
  const [newUserInput, setNewUserInput] = useState('');

  const handleEditSave = (typeId, data) => {
    const updated = types.map(t => t.id === typeId ? { ...t, ...data } : t);
    onUpdateTypes(updated);
    setEditingId(null);
  };

  const handleAddSave = (data) => {
    const newType = { id: genId(), protected: false, ...data };
    onUpdateTypes([...types, newType]);
    setAddingType(false);
  };

  const handleDeleteType = (typeId) => {
    const count = records.filter(r => r.type === typeId).length;
    const typeLabel = types.find(t => t.id === typeId)?.label ?? typeId;
    if (count > 0) {
      if (!window.confirm(`「${typeLabel}」類別有 ${count} 筆記錄，確定刪除並將這些記錄歸類為「其他」？`)) return;
    } else {
      if (!window.confirm(`確定刪除「${typeLabel}」類別？`)) return;
    }
    onDeleteType(typeId, count > 0);
  };

  const handleAddUser = () => {
    const name = newUserInput.trim();
    if (!name || definedUsers.includes(name)) return;
    onUpdateUsers([...definedUsers, name]);
    setNewUserInput('');
  };

  const handleDeleteUser = (user) => {
    if (!window.confirm(`確定刪除使用者「${user}」？`)) return;
    onUpdateUsers(definedUsers.filter(u => u !== user));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 費用類別 */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">費用類別</h2>
          {!addingType && (
            <button
              onClick={() => { setAddingType(true); setEditingId(null); }}
              className="text-xs bg-tesla hover:bg-tesla-hover text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              + 新增類別
            </button>
          )}
        </div>

        <div>
          {types.map(type => (
            <div key={type.id}>
              {editingId === type.id ? (
                <TypeEditor
                  initial={type}
                  onSave={data => handleEditSave(type.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <TypeRow
                  type={type}
                  onEdit={t => { setEditingId(t.id); setAddingType(false); }}
                  onDelete={handleDeleteType}
                />
              )}
            </div>
          ))}
          {addingType && (
            <TypeEditor
              onSave={handleAddSave}
              onCancel={() => setAddingType(false)}
            />
          )}
        </div>
      </div>

      {/* 使用者 */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">使用者</h2>
        <div className="space-y-0">
          {definedUsers.map(user => (
            <div key={user} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-neutral-800 last:border-0">
              <span className="text-sm text-gray-800 dark:text-neutral-200">{user}</span>
              <button
                onClick={() => handleDeleteUser(user)}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <input
            type="text"
            value={newUserInput}
            onChange={e => setNewUserInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddUser()}
            placeholder="新增使用者名稱"
            className="flex-1 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-tesla"
          />
          <button
            onClick={handleAddUser}
            disabled={!newUserInput.trim()}
            className="px-4 py-2 bg-tesla hover:bg-tesla-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            新增
          </button>
        </div>
      </div>
    </div>
  );
}
