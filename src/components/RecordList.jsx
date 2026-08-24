import React, { useState } from 'react';
import { format } from 'date-fns';
import { Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { buildTypeMap } from '../typeConfig';

// ── 結清計算 ──────────────────────────────────────
function calcSettlement(records) {
  const bal = {};
  for (const r of records) {
    if (!r.splitEntries?.length || !r.paidBy) continue;
    bal[r.paidBy] = (bal[r.paidBy] || 0) + (r.cost || 0);
    for (const e of r.splitEntries) {
      if (e.user) bal[e.user] = (bal[e.user] || 0) - (e.amount || 0);
    }
  }
  const entries = Object.entries(bal);
  if (entries.length === 0) return null;
  const debtor   = entries.sort((a, b) => a[1] - b[1])[0];
  const creditor = entries.sort((a, b) => b[1] - a[1])[0];
  if (debtor[1] > -0.5) return { settled: true };
  return { settled: false, debtor: debtor[0], creditor: creditor[0], amount: Math.abs(debtor[1]) };
}

// ── 結清餘額列 ───────────────────────────────────
function SettlementBar({ records }) {
  const s = calcSettlement(records);
  if (!s) return null;

  if (s.settled) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5 mb-3">
        <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">✓ 已結清</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl px-4 py-2.5 mb-3">
      <span className="text-orange-600 dark:text-orange-400 text-sm font-medium">
        💸 {s.debtor} 欠 {s.creditor}
        <span className="ml-1 font-bold">NT$ {Math.round(s.amount).toLocaleString()}</span>
      </span>
    </div>
  );
}

// ── 分攤 badge ────────────────────────────────────
const BADGE = {
  equal:  { label: '均分', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
  ratio:  { label: '比例', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  amount: { label: '金額', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
};

function SplitBadge({ method }) {
  const b = BADGE[method];
  if (!b) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">支出</span>;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.cls}`}>{b.label}</span>;
}

// ── 分攤明細表 ────────────────────────────────────
function SplitDetail({ record }) {
  if (!record.splitEntries?.length) return null;
  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-gray-100 dark:border-neutral-800">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 dark:bg-neutral-800 text-gray-400 dark:text-neutral-500">
            <th className="text-left px-3 py-1.5 font-medium">成員</th>
            <th className="text-right px-3 py-1.5 font-medium">應付金額</th>
            <th className="text-right px-3 py-1.5 font-medium">代墊金額</th>
          </tr>
        </thead>
        <tbody>
          {record.splitEntries.map(e => {
            const paid = e.user === record.paidBy ? (record.cost || 0) : 0;
            return (
              <tr key={e.user} className="border-t border-gray-100 dark:border-neutral-800">
                <td className="px-3 py-1.5 text-gray-700 dark:text-neutral-300">{e.user}</td>
                <td className="px-3 py-1.5 text-right font-medium text-gray-900 dark:text-white">
                  ${Math.round(e.amount || 0).toLocaleString()}
                </td>
                <td className={`px-3 py-1.5 text-right font-medium ${paid > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-neutral-600'}`}>
                  ${Math.round(paid).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(dateStr) {
  try { return format(new Date(dateStr), 'yyyy-MM-dd'); }
  catch { return dateStr?.slice(0, 10) ?? ''; }
}

const USER_COLORS = {
  '所有人': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  'Rose':   'bg-pink-50 text-pink-600 dark:bg-pink-950 dark:text-pink-400',
  '1+':     'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
};

// ── Main export ───────────────────────────────────
export default function RecordList({ records, onDelete, onEdit, definedTypes }) {
  const [expandedId, setExpandedId] = useState(null);

  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-neutral-600">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-sm">沒有符合條件的記錄</p>
      </div>
    );
  }

  const typeMap = buildTypeMap(definedTypes);
  const fallback = { label: '其他', icon: '📋', color: '#6b7280' };

  return (
    <div>
      <SettlementBar records={records} />

      <div className="space-y-2">
        {records.map(record => {
          const tc = typeMap[record.type] ?? fallback;
          const userColor = USER_COLORS[record.user] ?? 'bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-neutral-400';
          const hasSplit = record.splitEntries?.length > 0;
          const isExpanded = expandedId === record.id;

          return (
            <div
              key={record.id}
              className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3 hover:border-gray-300 dark:hover:border-neutral-700 transition-colors"
            >
              {/* 主列 */}
              <div className="flex items-center gap-3">
                <span
                  className="text-base w-9 h-9 flex items-center justify-center rounded-full shrink-0"
                  style={{ backgroundColor: tc.color + '22', color: tc.color }}
                >
                  {tc.icon}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {record.vendor || tc.label || record.type}
                    </span>
                    {record.note && (
                      <span className="text-xs text-gray-400 dark:text-neutral-500 truncate max-w-[120px]">
                        {record.note}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400 dark:text-neutral-500">{formatDate(record.date)}</span>
                    <SplitBadge method={hasSplit ? record.splitMethod : null} />
                    {record.kwh > 0 && (
                      <span className="text-xs text-blue-500 dark:text-blue-400">{record.kwh} kWh</span>
                    )}
                    {record.mileage && (
                      <span className="text-xs text-gray-400 dark:text-neutral-500">{record.mileage} km</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!hasSplit && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${userColor}`}>
                      {record.user}
                    </span>
                  )}
                  <span className="text-sm font-bold text-gray-900 dark:text-white min-w-[52px] text-right">
                    ${(record.cost ?? 0).toLocaleString()}
                  </span>

                  {/* 展開分攤明細 */}
                  {hasSplit && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 p-1 transition-colors"
                      title={isExpanded ? '收合明細' : '展開明細'}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}

                  <button
                    onClick={() => onEdit(record)}
                    className="text-gray-300 dark:text-neutral-700 hover:text-tesla transition-colors p-1"
                    title="編輯"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => onDelete(record.id)}
                    className="text-gray-300 dark:text-neutral-700 hover:text-tesla transition-colors text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* 展開的分攤明細 */}
              {isExpanded && hasSplit && <SplitDetail record={record} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
