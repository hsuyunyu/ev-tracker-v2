import React, { useState } from 'react';
import { Pencil, ChevronDown, ChevronUp, Trash2, CheckCircle2 } from 'lucide-react';
import { buildTypeMap, TypeIcon } from '../typeConfig';
import { ntd } from '../split';

const BADGE = {
  equal:  '均分',
  ratio:  '比例',
  amount: '金額',
};

function SplitBadge({ method }) {
  const label = BADGE[method];
  if (!label) return null;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-ww-brand/15 text-ww-brand">
      {label}
    </span>
  );
}

function SplitDetail({ record }) {
  if (!record.splitEntries?.length) return null;
  return (
    <div className="mt-2.5 rounded-ww-inner overflow-hidden border border-ww-line">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-ww-seg text-ww-sub">
            <th className="text-left  px-3 py-1.5 font-medium">成員</th>
            <th className="text-right px-3 py-1.5 font-medium">應付金額</th>
            <th className="text-right px-3 py-1.5 font-medium">代墊金額</th>
          </tr>
        </thead>
        <tbody>
          {record.splitEntries.map(e => {
            const paid = e.user === (record.paidBy || record.user) ? (record.cost || 0) : 0;
            return (
              <tr key={e.id || e.user} className="border-t border-ww-line3">
                <td className="px-3 py-1.5 text-ww-ink2">{e.user}</td>
                <td className="px-3 py-1.5 text-right font-medium text-ww-ink tabular-nums">
                  {ntd(e.amount)}
                </td>
                <td className={`px-3 py-1.5 text-right font-medium tabular-nums ${paid > 0 ? 'text-ww-ink' : 'text-ww-faint'}`}>
                  {ntd(paid)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function RecordList({ records, onDelete, onEdit, definedTypes, settledIds }) {
  const [expandedId, setExpandedId] = useState(null);

  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-ww-sub">
        <p className="text-sm">沒有符合條件的記錄</p>
      </div>
    );
  }

  const typeMap  = buildTypeMap(definedTypes);
  const fallback = { label: '其他', icon: 'doc.text.fill', color: '#8C8579' };

  return (
    <div className="space-y-2">
      {records.map(record => {
        const tc = typeMap[record.type] ?? fallback;
        const hasSplit   = record.splitEntries?.length > 0 && record.splitMethod !== 'none';
        const isExpanded = expandedId === record.id;
        const isSettled  = hasSplit && settledIds?.has(record.id);

        return (
          <div
            key={record.id}
            className="bg-ww-card border border-ww-line rounded-ww-list px-4 py-3
                       hover:border-ww-line2 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span
                className="w-9 h-9 flex items-center justify-center rounded-full shrink-0"
                style={{ backgroundColor: tc.color + '22', color: tc.color }}
              >
                <TypeIcon icon={tc.icon} size={17} />
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-ww-ink">
                    {record.vendor || tc.label || record.type}
                  </span>
                  {record.note && (
                    <span className="text-xs text-ww-sub truncate max-w-[120px]">{record.note}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-ww-sub">{(record.date || '').slice(0, 10)}</span>
                  {hasSplit && <SplitBadge method={record.splitMethod} />}
                  {isSettled && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-ww-brand">
                      <CheckCircle2 size={11} /> 已結清
                    </span>
                  )}
                  {record.kwh > 0 && (
                    <span className="text-xs text-ww-insurance">{record.kwh} kWh</span>
                  )}
                  {record.mileage && (
                    <span className="text-xs text-ww-sub">{record.mileage} km</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!hasSplit && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-ww-seg text-ww-ink2">
                    {record.user}
                  </span>
                )}
                <span className="text-sm font-bold text-ww-ink min-w-[56px] text-right tabular-nums">
                  {ntd(record.cost)}
                </span>

                {hasSplit && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    className="text-ww-faint hover:text-ww-ink2 p-1 transition-colors"
                    title={isExpanded ? '收合明細' : '展開明細'}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}

                <button
                  onClick={() => onEdit(record)}
                  className="text-ww-faint hover:text-ww-brand transition-colors p-1"
                  title="編輯"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => onDelete(record.id)}
                  className="text-ww-faint hover:text-ww-danger transition-colors p-1"
                  title="刪除"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {isExpanded && hasSplit && <SplitDetail record={record} />}
          </div>
        );
      })}
    </div>
  );
}
