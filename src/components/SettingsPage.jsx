import React, { useState } from 'react';
import { Pencil, Trash2, ChevronRight, Gauge, Car } from 'lucide-react';
import { resolveTypes, TypeIcon, SYMBOL_OPTIONS } from '../typeConfig';

/** 與 iOS ColorPickerGrid 一致的色盤（WattWise 分類色為前五個） */
const COLORS = [
  '#6E9266', '#C8A24C', '#8C6BA6', '#4E7BB5', '#8C8579',
  '#C0463F', '#5F8A57', '#D08C5A', '#5B8FA8', '#A6707E', '#7A7FB0', '#6B7B6E',
];

const genId = () => 'type_' + Math.random().toString(36).slice(2, 8);

const inputCls =
  'w-full border border-ww-line2 rounded-ww-inner px-3 py-2 text-sm bg-ww-field text-ww-ink ' +
  'placeholder:text-ww-faint focus:outline-none focus:border-ww-brand transition-colors';

function Section({ title, action, children }) {
  return (
    <div className="bg-ww-card border border-ww-line rounded-ww-list p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ww-ink">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function TypeRow({ type, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-ww-line3 last:border-0">
      <span
        className="w-8 h-8 flex items-center justify-center rounded-full shrink-0"
        style={{ backgroundColor: type.color + '22', color: type.color }}
      >
        <TypeIcon icon={type.icon} size={15} />
      </span>
      <span className="flex-1 text-sm text-ww-ink">{type.label}</span>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(type)}
          className="p-1.5 text-ww-faint hover:text-ww-brand transition-colors rounded-lg hover:bg-ww-seg"
        >
          <Pencil size={13} />
        </button>
        {!type.protected && (
          <button
            onClick={() => onDelete(type.id)}
            className="p-1.5 text-ww-faint hover:text-ww-danger transition-colors rounded-lg hover:bg-ww-seg"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function TypeEditor({ initial, onSave, onCancel }) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [icon,  setIcon]  = useState(initial?.icon  ?? 'tag.fill');
  const [color, setColor] = useState(initial?.color ?? '#8C8579');

  const valid = label.trim().length > 0;

  return (
    <div className="bg-ww-seg rounded-ww-inner p-3 space-y-3 mt-1">
      <div>
        <label className="text-xs text-ww-sub mb-1 block font-medium">名稱</label>
        <input
          type="text" value={label} onChange={e => setLabel(e.target.value)}
          placeholder="類別名稱" className={inputCls}
        />
      </div>

      <div>
        <label className="text-xs text-ww-sub mb-1.5 block font-medium">圖示</label>
        <div className="flex flex-wrap gap-1.5 max-h-[132px] overflow-y-auto">
          {SYMBOL_OPTIONS.map(s => (
            <button
              key={s} type="button" onClick={() => setIcon(s)}
              className={`w-9 h-9 rounded-ww-inner flex items-center justify-center transition-colors ${
                icon === s ? 'text-white' : 'bg-ww-card text-ww-ink2 hover:bg-ww-seg2'
              }`}
              style={icon === s ? { backgroundColor: color } : undefined}
            >
              <TypeIcon icon={s} size={16} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-ww-sub mb-1.5 block font-medium">顏色</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button
              key={c} type="button" onClick={() => setColor(c)}
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
          className="flex-1 py-2 border border-ww-line2 rounded-ww-inner text-sm text-ww-ink2 hover:bg-ww-card transition-colors"
        >
          取消
        </button>
        <button
          onClick={() => valid && onSave({ label: label.trim(), icon, color })}
          disabled={!valid}
          className="flex-1 py-2 bg-ww-brand hover:bg-ww-brandhover text-white rounded-ww-inner
                     text-sm font-medium disabled:opacity-50 transition-colors"
        >
          儲存
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage({
  settings = {}, definedTypes, definedUsers, records, vehicles = [], householdId,
  onUpdateTypes, onDeleteType, onUpdateUsers, onSaveSettings, onOpenMileage,
}) {
  const types = resolveTypes(definedTypes);
  const [editingId, setEditingId]     = useState(null);
  const [addingType, setAddingType]   = useState(false);
  const [newUserInput, setNewUserInput] = useState('');

  const handleEditSave = (typeId, data) => {
    onUpdateTypes(types.map(t => t.id === typeId ? { ...t, ...data } : t));
    setEditingId(null);
  };

  const handleAddSave = (data) => {
    onUpdateTypes([...types, { id: genId(), protected: false, ...data }]);
    setAddingType(false);
  };

  const handleDeleteType = (typeId) => {
    const count = records.filter(r => r.type === typeId).length;
    const typeLabel = types.find(t => t.id === typeId)?.label ?? typeId;
    const msg = count > 0
      ? `「${typeLabel}」類別有 ${count} 筆記錄，確定刪除並將這些記錄歸類為「其他」？`
      : `確定刪除「${typeLabel}」類別？`;
    if (!window.confirm(msg)) return;
    onDeleteType(typeId, count > 0);
  };

  const handleAddUser = () => {
    const name = newUserInput.trim();
    if (!name || definedUsers.includes(name)) return;
    onUpdateUsers([...definedUsers, name]);
    setNewUserInput('');
  };

  const handleDeleteUser = (user) => {
    if (!window.confirm(`確定刪除成員「${user}」？`)) return;
    onUpdateUsers(definedUsers.filter(u => u !== user));
  };

  return (
    <div className="space-y-4">
      {/* 里程 */}
      <button
        onClick={onOpenMileage}
        className="w-full bg-ww-card border border-ww-line rounded-ww-list px-5 py-4
                   flex items-center gap-3 hover:border-ww-line2 transition-colors"
      >
        <Gauge size={18} className="text-ww-brand shrink-0" />
        <span className="flex-1 text-left text-sm font-medium text-ww-ink">里程記錄</span>
        <ChevronRight size={17} className="text-ww-faint" />
      </button>

      {/* 費用類別 */}
      <Section
        title="費用類別"
        action={!addingType && (
          <button
            onClick={() => { setAddingType(true); setEditingId(null); }}
            className="text-xs bg-ww-brand hover:bg-ww-brandhover text-white px-3 py-1.5
                       rounded-ww-inner transition-colors"
          >
            + 新增類別
          </button>
        )}
      >
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
        {addingType && <TypeEditor onSave={handleAddSave} onCancel={() => setAddingType(false)} />}
      </Section>

      {/* 成員 */}
      <Section title="成員">
        <div>
          {definedUsers.map(user => (
            <div key={user} className="flex items-center justify-between py-2.5 border-b border-ww-line3 last:border-0">
              <span className="text-sm text-ww-ink">{user}</span>
              <button
                onClick={() => handleDeleteUser(user)}
                className="p-1.5 text-ww-faint hover:text-ww-danger transition-colors rounded-lg hover:bg-ww-seg"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <input
            type="text" value={newUserInput}
            onChange={e => setNewUserInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddUser()}
            placeholder="新增成員名稱" className={inputCls}
          />
          <button
            onClick={handleAddUser} disabled={!newUserInput.trim()}
            className="px-4 py-2 bg-ww-brand hover:bg-ww-brandhover text-white rounded-ww-inner
                       text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
          >
            新增
          </button>
        </div>
      </Section>

      {/* 預設分攤 */}
      {definedUsers.length >= 2 && onSaveSettings && (
        <Section title="預設分攤">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-ww-ink2">新增記錄時自動啟用分攤</span>
            <button
              type="button"
              onClick={() => onSaveSettings({ defaultSplitEnabled: !settings.defaultSplitEnabled })}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                settings.defaultSplitEnabled ? 'bg-ww-brand' : 'bg-ww-seg2 border border-ww-line2'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.defaultSplitEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {settings.defaultSplitEnabled && (
            <div className="flex gap-1 bg-ww-seg p-1 rounded-ww-inner">
              {[['equal', '均分'], ['ratio', '比例']].map(([v, l]) => (
                <button
                  key={v} type="button"
                  onClick={() => onSaveSettings({ defaultSplitMethod: v })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-[10px] transition-colors ${
                    (settings.defaultSplitMethod || 'equal') === v
                      ? 'bg-ww-brand text-white' : 'text-ww-ink2 hover:text-ww-ink'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 車輛（唯讀，於 App 管理） */}
      <Section title="車輛">
        {vehicles.length === 0 ? (
          <p className="text-sm text-ww-sub">尚無車輛，請在 WattWise App 中新增。</p>
        ) : (
          <div>
            {vehicles.map(v => (
              <div key={v.id} className="flex items-center gap-3 py-2.5 border-b border-ww-line3 last:border-0">
                <Car size={16} className="text-ww-sub shrink-0" />
                <span className="flex-1 text-sm text-ww-ink">{v.name || v.licensePlate}</span>
                {v.name && v.licensePlate && (
                  <span className="text-xs text-ww-sub">{v.licensePlate}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 帳本 */}
      <Section title="帳本">
        <p className="text-sm text-ww-ink2 leading-relaxed">
          與 WattWise App 同步中，所有記錄即時共用。
        </p>
        <p className="text-[11px] text-ww-faint mt-2 break-all font-mono">
          householdId：{householdId}
        </p>
      </Section>
    </div>
  );
}
