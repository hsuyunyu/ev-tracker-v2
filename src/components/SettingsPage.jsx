import React, { useState } from 'react';
import { ChevronLeft, PlusCircle, MinusCircle, Zap } from 'lucide-react';
import { resolveTypes, TypeIcon, SYMBOL_OPTIONS } from '../typeConfig';
import { fmtInt } from '../format';
import {
  Card, DarkAvatar, Divider, NavButton, PageTitle, Section, Segmented,
  Sheet, SheetNav, StepButton, TapRow, Toggle, UserAvatar,
} from './ui';

/**
 * 設定頁 —— 對應 iOS SettingsView 與其子頁（費用類型 / 成員與分攤 / 車輛）。
 */

/** 與 iOS ColorPickerGrid 一致的色盤（WattWise 分類色為前五個） */
const COLORS = [
  '#6E9266', '#C8A24C', '#8C6BA6', '#4E7BB5', '#8C8579',
  '#C0463F', '#5F8A57', '#D08C5A', '#5B8FA8', '#A6707E', '#7A7FB0', '#6B7B6E',
];

const genId = () => 'type_' + Math.random().toString(36).slice(2, 8);

export default function SettingsPage(props) {
  const [route, setRoute] = useState(null);   // null | 'types' | 'members' | 'vehicles'
  const back = () => setRoute(null);

  if (route === 'types')    return <TypesPage {...props} onBack={back} />;
  if (route === 'members')  return <MembersPage {...props} onBack={back} />;
  if (route === 'vehicles') return <VehiclesPage {...props} onBack={back} />;
  return <SettingsHome {...props} onNavigate={setRoute} />;
}

// MARK: - 設定主頁

function SettingsHome({
  settings, vehicles, settlements, recurring, balance, displayName, demo, inviteCode,
  defaultVehicleId, appearance, onAppearance,
  onOpenSettlement, onOpenRecurring, onImportClick, importing, onSignOut, onNavigate,
}) {
  const [copied, setCopied] = useState(false);

  const realUsers = (settings.definedUsers ?? []).filter(u => u !== '所有人');
  const vehicle = vehicles.find(v => v.id === defaultVehicleId) ?? vehicles[0];
  const vehicleValue = !vehicle ? '尚未設定'
    : vehicle.licensePlate && vehicle.name ? `${vehicle.name} · ${vehicle.licensePlate}`
    : (vehicle.name || vehicle.licensePlate);

  const copyInvite = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* 瀏覽器不允許存取剪貼簿時不處理 */ }
  };

  const name = demo ? 'Demo 模式' : (displayName || '使用者');

  return (
    <div className="flex flex-col gap-[18px]">
      <PageTitle>設定</PageTitle>

      {/* 帳號卡 */}
      <Card radius={20} padX={false} className="p-4 flex items-center gap-3.5">
        <DarkAvatar initial={demo ? 'D' : name.trim().charAt(0).toUpperCase()} size={52} fontSize={19} />
        <div className="min-w-0">
          <div className="text-[16px] font-bold text-ww-ink truncate">{name}</div>
          <div className="mt-[3px] text-[12px] text-ww-sub">
            {demo ? '示範帳號，資料不會儲存' : '已透過 Google 登入'}
          </div>
        </div>
      </Card>

      {!demo && (
        <Section title="家庭帳本" radius={20} gap={8}>
          <TapRow label="邀請碼" chevron={false} onClick={copyInvite}
            value={copied ? '已複製' : (inviteCode ? `${inviteCode} · 複製` : '—')}
            valueClass="text-ww-brand font-bold tracking-[0.08em]" />
          <Divider />
          <TapRow label="成員" value={realUsers.join('、') || '—'} onClick={() => onNavigate('members')} />
        </Section>
      )}

      <Section title="結算" radius={20} gap={8}>
        <TapRow label="結算清單" onClick={onOpenSettlement}
          value={balance ? `待結清 NT$${fmtInt(balance.amount)}` : '已結清'}
          valueClass={balance ? 'text-ww-danger' : 'text-ww-sub'} />
        <Divider />
        <TapRow label="結帳記錄" value={`${settlements.length} 筆`} onClick={onOpenSettlement} />
      </Section>

      <Section title="車輛與週期" radius={20} gap={8}>
        <TapRow label="車輛" value={vehicleValue} onClick={() => onNavigate('vehicles')} />
        <Divider />
        <TapRow label="週期項目" value={`${recurring.length} 項`} onClick={onOpenRecurring} />
        <Divider />
        <TapRow label="費用類型" value={`${resolveTypes(settings.definedTypes).length} 種`}
          onClick={() => onNavigate('types')} />
        <Divider />
        <TapRow label="成員與分攤" onClick={() => onNavigate('members')}
          value={`${realUsers.length} 位成員${settings.defaultSplitEnabled ? '・已設分攤' : ''}`} />
      </Section>

      <Section title="偏好" radius={20} gap={8}>
        <div className="flex items-center justify-between py-[9px]">
          <span className="text-[14px] text-ww-ink">外觀</span>
          <Segmented options={[['light', '淺'], ['dark', '深'], ['system', '系統']]}
            value={appearance} onChange={onAppearance} />
        </div>
      </Section>

      {!demo && (
        <Section title="網頁版" radius={20} gap={8}
          footnote="與 WattWise App 共用同一本帳本，所有記錄即時同步。">
          <TapRow label="匯入備份（JSON）" value={importing ? '匯入中…' : ''} onClick={onImportClick} />
        </Section>
      )}

      <button onClick={onSignOut}
        className="py-[15px] rounded-ww-sm bg-ww-card border border-ww-line text-ww-danger
                   text-[14px] font-bold active:opacity-70">
        {demo ? '離開 Demo' : '登出'}
      </button>
    </div>
  );
}

// MARK: - 子頁共用導覽列（對應 NavigationStack push）

function SubNav({ title, onBack, right }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center pt-2 pb-3">
      <button onClick={onBack} className="justify-self-start flex items-center text-ww-brand text-[15px] font-medium">
        <ChevronLeft size={20} strokeWidth={2.6} className="-ml-1.5" /> 設定
      </button>
      <h1 className="text-[16px] font-bold text-ww-ink">{title}</h1>
      <div className="justify-self-end">{right}</div>
    </div>
  );
}

// MARK: - 費用類型

function TypesPage({ settings, records, onUpdateTypes, onDeleteType, onBack }) {
  const types = resolveTypes(settings.definedTypes);
  const [editing, setEditing] = useState(null);   // null | 'new' | type

  const save = (data) => {
    if (editing === 'new') onUpdateTypes([...types, { id: genId(), protected: false, ...data }]);
    else onUpdateTypes(types.map(t => (t.id === editing.id ? { ...t, ...data } : t)));
    setEditing(null);
  };

  const remove = () => {
    const count = records.filter(r => r.type === editing.id).length;
    const msg = count > 0
      ? `「${editing.label}」有 ${count} 筆記錄，確定刪除並將這些記錄歸類為「其他」？`
      : `確定刪除「${editing.label}」？`;
    if (!window.confirm(msg)) return;
    onDeleteType(editing.id, count > 0);
    setEditing(null);
  };

  return (
    <div>
      <SubNav title="費用類型" onBack={onBack} right={
        <button onClick={() => setEditing('new')} aria-label="新增費用類型" className="text-ww-brand">
          <PlusCircle size={24} fill="currentColor" stroke="rgb(var(--ww-bg))" />
        </button>
      } />

      <Card radius={18}>
        {types.map((t, i) => (
          <React.Fragment key={t.id}>
            {i > 0 && <Divider />}
            <button onClick={() => !t.protected && setEditing(t)}
              className="w-full flex items-center gap-[13px] py-[13px] text-left">
              <span className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: t.color + '26', color: t.color }}>
                <TypeIcon icon={t.icon} size={16} />
              </span>
              <span className="text-[14px] font-semibold text-ww-ink truncate">{t.label}</span>
              <span className="ml-auto flex items-center gap-2.5 shrink-0">
                {t.protected && (
                  <span className="px-[7px] py-0.5 rounded-full bg-ww-seg text-ww-sub text-[10px] font-semibold">
                    系統
                  </span>
                )}
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: t.color }} />
              </span>
            </button>
          </React.Fragment>
        ))}
      </Card>

      {editing && (
        <EditTypeSheet type={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)} onSave={save} onDelete={remove} />
      )}
    </div>
  );
}

function EditTypeSheet({ type, onClose, onSave, onDelete }) {
  const [label, setLabel] = useState(type?.label ?? '');
  const [icon, setIcon]   = useState(type?.icon ?? 'tag.fill');
  const [color, setColor] = useState(type?.color ?? '#4E7BB5');
  const valid = label.trim().length > 0;

  return (
    <Sheet onClose={onClose} tall>
      <SheetNav
        title={type ? '編輯費用類型' : '新增費用類型'}
        left={<NavButton onClick={onClose}>取消</NavButton>}
        right={
          <NavButton strong disabled={!valid} onClick={() => onSave({ label: label.trim(), icon, color })}>
            {type ? '儲存' : '新增'}
          </NavButton>
        }
      />

      <div className="px-[22px] pt-2 pb-[calc(28px+env(safe-area-inset-bottom))] flex flex-col gap-[18px]">
        {/* 即時預覽 */}
        <Card className="py-[22px] flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-[11px] py-1 rounded-full text-[16px] font-medium"
            style={{ backgroundColor: color + '26', color }}>
            <TypeIcon icon={icon} size={16} />
            {label || '預覽'}
          </span>
        </Card>

        <Section title="基本資訊">
          <div className="flex items-center py-3.5">
            <span className="w-12 shrink-0 text-[13px] text-ww-sub">名稱</span>
            <input value={label} onChange={e => setLabel(e.target.value)}
              placeholder="顯示名稱（如 停車費）" className="ww-plain-input" />
          </div>
        </Section>

        <Section title="圖示">
          <div className="py-3 grid grid-cols-7 gap-1.5">
            {SYMBOL_OPTIONS.map(s => {
              const active = icon === s;
              return (
                <button key={s} type="button" onClick={() => setIcon(s)} aria-label={s}
                  className={`aspect-square rounded-[10px] flex items-center justify-center ${
                    active ? '' : 'text-ww-ink2'
                  }`}
                  style={active ? { backgroundColor: color + '26', color } : undefined}>
                  <TypeIcon icon={s} size={18} />
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="顏色">
          <div className="py-3.5 grid grid-cols-6 gap-y-3.5 justify-items-center">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={c}
                className="w-8 h-8 rounded-full"
                style={{
                  backgroundColor: c,
                  boxShadow: color === c ? `0 0 0 2.5px rgb(var(--ww-card)), 0 0 0 5px ${c}` : 'none',
                }} />
            ))}
          </div>
        </Section>

        {type && !type.protected && (
          <button onClick={onDelete}
            className="py-[15px] rounded-ww-inner bg-ww-card border border-ww-line
                       text-ww-danger text-[14px] font-bold active:opacity-70">
            刪除此費用類型
          </button>
        )}
      </div>
    </Sheet>
  );
}

// MARK: - 成員與分攤

function MembersPage({ settings, onUpdateUsers, onSaveSettings, onBack }) {
  const members = settings.definedUsers ?? [];
  const [newUser, setNewUser] = useState('');

  const enabled = !!settings.defaultSplitEnabled;
  const method  = settings.defaultSplitMethod || 'equal';
  const count   = Math.max(members.length, 1);
  const ruleOf  = Object.fromEntries((settings.defaultSplitRules ?? []).map(r => [r.user, r.ratio]));
  const ratioOf = (u) => ruleOf[u] ?? 1 / count;
  const ratioTotal = members.reduce((s, u) => s + ratioOf(u), 0);
  const ratioValid = Math.abs(ratioTotal - 1) < 0.01;

  /** 規則一律整組寫回（欄位與 iOS DefaultSplitRule 相同：id / user / ratio） */
  const saveRules = (patch, ratios = {}) => onSaveSettings({
    defaultSplitEnabled: enabled,
    defaultSplitMethod: method,
    defaultSplitRules: members.map(u => ({
      id: settings.defaultSplitRules?.find(r => r.user === u)?.id ?? crypto.randomUUID(),
      user: u,
      ratio: ratios[u] ?? ratioOf(u),
    })),
    ...patch,
  });

  const adjust = (u, delta) =>
    saveRules({}, { [u]: Math.max(0, Math.min(1, Math.round((ratioOf(u) + delta) * 100) / 100)) });

  const addUser = () => {
    const name = newUser.trim();
    if (!name || members.includes(name)) return;
    onUpdateUsers([...members, name]);
    setNewUser('');
  };

  const removeUser = (u) => {
    if (window.confirm(`確定刪除成員「${u}」？`)) onUpdateUsers(members.filter(x => x !== u));
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="-mb-3"><SubNav title="成員與分攤" onBack={onBack} /></div>

      <Section title="成員列表">
        {members.map(u => (
          <React.Fragment key={u}>
            <div className="flex items-center gap-[13px] py-[11px]">
              <UserAvatar name={u} size={32} />
              <span className="text-[14px] font-semibold text-ww-ink truncate">{u}</span>
              <button onClick={() => removeUser(u)} aria-label={`刪除成員 ${u}`} className="ml-auto text-ww-line2">
                <MinusCircle size={20} fill="currentColor" stroke="rgb(var(--ww-card))" />
              </button>
            </div>
            <Divider />
          </React.Fragment>
        ))}
        <div className="flex items-center gap-2.5 py-[13px]">
          <PlusCircle size={20} className="text-ww-brand shrink-0" fill="currentColor" stroke="rgb(var(--ww-card))" />
          <input value={newUser} onChange={e => setNewUser(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUser()} placeholder="新增成員姓名"
            className="flex-1 min-w-0 bg-transparent text-[14px] text-ww-ink outline-none" />
          {newUser && (
            <button onClick={addUser} className="text-[13px] font-bold text-ww-brand">新增</button>
          )}
        </div>
      </Section>

      <Section title="預設均分" footnote="啟用後新增費用記錄會自動套用此分攤規則，也可個別覆蓋。">
        <div className="flex items-center justify-between gap-3 py-[13px]">
          <div>
            <div className="text-[14px] font-semibold text-ww-ink">啟用預設分攤</div>
            <div className="mt-0.5 text-[11px] text-ww-sub">新增費用開啟分攤時自動套用</div>
          </div>
          <Toggle on={enabled} label="啟用預設分攤" onChange={v => saveRules({ defaultSplitEnabled: v })} />
        </div>

        {enabled && (
          <>
            <Divider />
            <div className="flex items-center justify-between py-[13px]">
              <span className="text-[13px] font-semibold text-ww-ink">分攤方式</span>
              <Segmented options={[['equal', '均分'], ['ratio', '自訂比例']]} value={method}
                onChange={v => saveRules({ defaultSplitMethod: v })} />
            </div>
            <Divider />

            {members.length === 0 && (
              <div className="py-[13px] text-[12px] text-ww-sub">請先新增成員</div>
            )}
            {members.map(u => (
              <div key={u} className="flex items-center gap-3 py-2.5">
                <UserAvatar name={u} />
                <span className="text-[14px] font-semibold text-ww-ink truncate">{u}</span>
                {method === 'equal' ? (
                  <span className="ml-auto text-[14px] font-extrabold font-rounded text-ww-sub tabular-nums">
                    {Math.round(100 / count)}%
                  </span>
                ) : (
                  <div className="ml-auto flex items-center gap-2.5 shrink-0">
                    <StepButton onClick={() => adjust(u, -0.05)}>−</StepButton>
                    <span className="w-[54px] text-center text-[16px] font-extrabold font-rounded text-ww-ink tabular-nums">
                      {Math.round(ratioOf(u) * 100)}%
                    </span>
                    <StepButton onClick={() => adjust(u, 0.05)}>+</StepButton>
                  </div>
                )}
              </div>
            ))}
            {method === 'ratio' && members.length > 0 && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[13px] font-semibold text-ww-ink">合計</span>
                <span className={`text-[14px] font-extrabold font-rounded tabular-nums ${
                  ratioValid ? 'text-ww-brand' : 'text-ww-danger'
                }`}>
                  {Math.round(ratioTotal * 100)}%
                </span>
              </div>
            )}
          </>
        )}
      </Section>
    </div>
  );
}

// MARK: - 車輛（唯讀；新增與編輯在 App 進行）

function VehiclesPage({ vehicles, defaultVehicleId, onBack }) {
  return (
    <div>
      <SubNav title="車輛管理" onBack={onBack} />

      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center gap-2 pt-14 text-center">
          <Zap size={40} className="text-ww-faint" />
          <div className="text-[17px] font-bold text-ww-ink">尚無車輛</div>
          <div className="text-[13px] text-ww-sub">請在 WattWise App 新增您的電動車</div>
        </div>
      ) : (
        <>
          <Card radius={18}>
            {vehicles.map((v, i) => (
              <React.Fragment key={v.id}>
                {i > 0 && <Divider />}
                <div className="flex items-center gap-3.5 py-3.5">
                  <span className="w-11 h-11 rounded-[10px] bg-ww-brand/[0.12] text-ww-brand
                                   flex items-center justify-center shrink-0">
                    <Zap size={20} fill="currentColor" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-semibold text-ww-ink truncate">
                        {v.name || v.licensePlate}
                      </span>
                      {v.id === defaultVehicleId && (
                        <span className="px-1.5 py-0.5 rounded-full bg-ww-brand text-white text-[11px] font-semibold shrink-0">
                          預設
                        </span>
                      )}
                    </div>
                    {v.licensePlate && v.name && (
                      <div className="mt-[3px] text-[12px] text-ww-sub">{v.licensePlate}</div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </Card>
          <p className="px-1 pt-2 text-[11.5px] text-ww-faint">
            車輛的新增、編輯與預設車輛設定請在 WattWise App 進行。
          </p>
        </>
      )}
    </div>
  );
}
