import React, { useState } from 'react';
import { resolveTypes } from '../typeConfig';
import { normalizeDue } from '../recurring';
import { todayLocal } from '../split';
import { fullDate, parseLocal, ymd, trimZero } from '../format';
import {
  Card, Divider, NavButton, SectionLabel, Segmented, Sheet, SheetNav, StepButton, Toggle,
} from './ui';

/**
 * 週期項目新增 / 編輯 —— 對應 iOS AddRecurringView。
 * 類型 chips → 基本資訊 → 週期設定 → 備註 →（編輯時）刪除。
 */

const INTERVALS = [['monthly', '每月'], ['quarterly', '每季'], ['yearly', '每年'], ['custom', '自訂']];
const MONTHS_OF = { monthly: 1, quarterly: 3, yearly: 12 };

export default function AddRecurringSheet({
  item, settings, defaultVehicleId, onClose, onSave, onDelete,
}) {
  const isEditing = !!item;
  const types   = resolveTypes(settings.definedTypes);
  const members = settings.definedUsers ?? [];

  const [form, setForm] = useState(() => ({
    type: item?.type ?? 'other',
    vendor: item?.vendor ?? '',
    cost: item?.cost ? trimZero(item.cost) : '',
    user: item?.user ?? members[0] ?? '',
    interval: item?.interval ?? 'monthly',
    customMonths: item?.intervalMonths || MONTHS_OF[item?.interval] || 1,
    nextDue: normalizeDue(item?.nextDue) || todayLocal(),
    active: item?.active ?? true,
    autoRecord: item?.autoRecord ?? false,
    note: item?.note ?? '',
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [saving, setSaving] = useState(false);

  const cost = Number(form.cost) || 0;

  const shiftDue = ({ days = 0, months = 0 }) => {
    const d = parseLocal(form.nextDue);
    if (months) {
      // 先移到目標月 1 號再 clamp 日數，避免 1/31 + 1 個月溢位成 3/3
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + months);
      d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    }
    d.setDate(d.getDate() + days);
    set('nextDue', ymd(d));
  };

  const save = async () => {
    if (cost <= 0 || saving) return;
    setSaving(true);
    try {
      // interval 與 intervalMonths 一律成對寫入：兩邊推算下次到期日時都以
      // intervalMonths 為準，若只改 interval 會沿用舊的月數而算錯。
      const months = form.interval === 'custom'
        ? Math.max(1, form.customMonths)
        : MONTHS_OF[form.interval];
      await onSave({
        type: form.type,
        vendor: form.vendor.trim(),
        cost,
        kwh: item?.kwh ?? 0,
        user: form.user,
        vehicleId: item?.vehicleId ?? defaultVehicleId ?? '',
        note: form.note,
        active: form.active,
        autoRecord: form.autoRecord,
        nextDue: form.nextDue,
        interval: form.interval,
        intervalMonths: months,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} tall>
      <SheetNav
        title={isEditing ? '編輯週期項目' : '新增週期項目'}
        left={<NavButton onClick={onClose}>取消</NavButton>}
        right={<NavButton strong disabled={cost <= 0 || saving} onClick={save}>儲存</NavButton>}
      />

      <div className="px-[22px] pt-2 pb-[calc(28px+env(safe-area-inset-bottom))] flex flex-col gap-[18px]">
        {/* 類型 chips */}
        <div className="ww-noscroll flex gap-2 overflow-x-auto px-0.5 -mx-0.5">
          {types.map(t => {
            const active = form.type === t.id;
            return (
              <button key={t.id} type="button" onClick={() => set('type', t.id)}
                className={`shrink-0 px-3.5 py-2 rounded-full border text-[13px] font-semibold ${
                  active ? 'text-white border-transparent' : 'bg-ww-card border-ww-line2 text-ww-ink2'
                }`}
                style={active ? { backgroundColor: t.color } : undefined}>
                {t.label}
              </button>
            );
          })}
        </div>

        <Group title="基本資訊">
          <Card>
            <div className="flex items-center py-[13px]">
              <span className="w-[74px] shrink-0 text-[13px] text-ww-sub">商家/地點</span>
              <input value={form.vendor} onChange={e => set('vendor', e.target.value)}
                placeholder="例：國泰產險" className="ww-plain-input" />
            </div>
            <Divider />
            <div className="flex items-center py-[13px]">
              <span className="w-[74px] shrink-0 text-[13px] text-ww-sub">金額</span>
              <span className="ml-auto text-[14px] font-bold text-ww-brand">NT$</span>
              <input
                inputMode="decimal" placeholder="0" value={form.cost}
                onChange={e => set('cost', e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-[120px] bg-transparent text-right text-[18px] font-extrabold text-ww-ink
                           outline-none tabular-nums"
              />
            </div>
            <Divider />
            <div className="flex items-center justify-between gap-3 py-[13px]">
              <span className="w-[74px] shrink-0 text-[13px] text-ww-sub">成員</span>
              <div className="ww-noscroll overflow-x-auto">
                <Segmented options={members.map(u => [u, u])} value={form.user}
                  onChange={v => set('user', v)} padX={10} />
              </div>
            </div>
          </Card>
        </Group>

        <Group title="週期設定">
          <Card>
            <Row label="頻率">
              <Segmented options={INTERVALS} value={form.interval}
                onChange={v => set('interval', v)} padX={10} />
            </Row>

            {form.interval === 'custom' && (
              <>
                <Divider />
                <Row label="每隔">
                  <div className="flex items-center gap-3">
                    <StepButton onClick={() => set('customMonths', Math.max(1, form.customMonths - 1))}>−</StepButton>
                    <span className="w-[70px] text-center text-[15px] font-extrabold text-ww-ink tabular-nums">
                      {form.customMonths} 個月
                    </span>
                    <StepButton onClick={() => set('customMonths', Math.min(36, form.customMonths + 1))}>+</StepButton>
                  </div>
                </Row>
              </>
            )}

            <Divider />
            <div className="py-[13px] flex flex-col gap-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ww-ink">下次到期</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => shiftDue({ days: -1 })} aria-label="前一天"
                    className="text-[16px] font-bold text-ww-faint px-1">‹</button>
                  <span className="relative min-w-[116px] text-center text-[13.5px] font-bold text-ww-ink tabular-nums">
                    {fullDate(form.nextDue)}
                    <input
                      type="date" value={form.nextDue} aria-label="選擇到期日"
                      onChange={e => e.target.value && set('nextDue', e.target.value)}
                      onClick={e => e.currentTarget.showPicker?.()}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </span>
                  <button type="button" onClick={() => shiftDue({ days: 1 })} aria-label="後一天"
                    className="text-[16px] font-bold text-ww-faint px-1">›</button>
                </div>
              </div>
              <div className="ww-noscroll flex gap-1.5 overflow-x-auto">
                <QuickChip onClick={() => shiftDue({ months: 1 })}>+1 個月</QuickChip>
                <QuickChip onClick={() => shiftDue({ months: 3 })}>+3 個月</QuickChip>
                <QuickChip onClick={() => shiftDue({ months: 12 })}>+1 年</QuickChip>
                <QuickChip onClick={() => set('nextDue', todayLocal())}>今天</QuickChip>
              </div>
            </div>

            <Divider />
            <Row label="啟用" hint="停用後不會在到期前提醒">
              <Toggle on={form.active} onChange={v => set('active', v)} label="啟用" />
            </Row>

            <Divider />
            <Row label="自動記帳"
              hint="到期時自動記一筆，不用手動確認。適合金額固定的訂閱；金額每次不同的建議關閉。">
              <Toggle on={form.autoRecord} onChange={v => set('autoRecord', v)} label="自動記帳" />
            </Row>
          </Card>
        </Group>

        <Group title="備註（選填）">
          <Card>
            <input value={form.note} onChange={e => set('note', e.target.value)} placeholder="輸入備註"
              className="w-full py-3.5 bg-transparent text-[14px] font-semibold text-ww-ink outline-none" />
          </Card>
        </Group>

        {isEditing && (
          <button onClick={onDelete}
            className="py-[15px] rounded-ww-inner bg-ww-card border border-ww-line
                       text-ww-danger text-[14px] font-bold active:opacity-70">
            刪除此週期項目
          </button>
        )}
      </div>
    </Sheet>
  );
}

function Group({ title, children }) {
  return (
    <div className="flex flex-col gap-[7px]">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-[13px]">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ww-ink">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-ww-sub leading-snug">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function QuickChip({ children, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="shrink-0 px-[11px] py-[6px] rounded-full bg-ww-seg text-ww-ink2 text-[12px] font-medium">
      {children}
    </button>
  );
}
