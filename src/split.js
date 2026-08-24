/**
 * 分攤 / 結清運算 —— 與 iOS AppViewModel 的邏輯一對一對應。
 * 兩邊算出來的餘額必須相同，否則同一份資料會出現兩種說法。
 */

export const hasSplit = (r) =>
  r?.splitMethod && r.splitMethod !== 'none' && (r.splitEntries?.length ?? 0) > 0;

export const isSettled = (s) => !!s?.settledAt;

/** 對應 AppViewModel.lastSettledCutoffDate（僅舊版無 recordIds 的結算才用日期截止） */
export function lastSettledCutoffDate(settlements) {
  return settlements
    .filter(s => isSettled(s) && (s.recordIds?.length ?? 0) === 0)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0]?.createdAt || '';
}

/** 同時只允許一筆待確認結算 */
export function pendingSettlement(settlements) {
  return settlements.find(s => !isSettled(s)) || null;
}

/** 已被任何結算（含待確認）涵蓋的記錄 ID */
export function settledRecordIds(settlements) {
  return new Set(settlements.flatMap(s => s.recordIds || []));
}

/** 尚未被結算涵蓋的分攤記錄（用於計算當前餘額） */
export function unsettledSplitRecords(records, settlements) {
  const cutoff  = lastSettledCutoffDate(settlements);
  const covered = settledRecordIds(settlements);
  return records.filter(r =>
    hasSplit(r) &&
    !covered.has(r.id) &&
    (!cutoff || (r.date || '').slice(0, 10) > cutoff)
  );
}

/**
 * 計算一組記錄的結清餘額（誰欠誰多少）。
 * 正值 = 被欠錢（債權人），負值 = 欠人錢（債務人）。
 */
export function calcBalance(records, definedUsers) {
  if ((definedUsers?.length ?? 0) < 2) return null;

  const bal = {};
  for (const r of records) {
    if (!hasSplit(r)) continue;
    const payer = r.paidBy || r.user;
    bal[payer] = (bal[payer] || 0) + (r.cost || 0);
    for (const e of r.splitEntries || []) {
      bal[e.user] = (bal[e.user] || 0) - (e.amount || 0);
    }
  }

  const entries  = Object.entries(bal);
  const debtor   = entries.filter(([, v]) => v < -0.49).sort((a, b) => a[1] - b[1])[0];
  const creditor = entries.filter(([, v]) => v >  0.49).sort((a, b) => b[1] - a[1])[0];
  if (!debtor || !creditor) return null;

  return {
    debtor:   debtor[0],
    creditor: creditor[0],
    amount:   Math.min(Math.abs(debtor[1]), creditor[1]),
  };
}

/** 每個人的淨額（給結清頁列出明細用） */
export function balanceByUser(records) {
  const bal = {};
  for (const r of records) {
    if (!hasSplit(r)) continue;
    const payer = r.paidBy || r.user;
    bal[payer] = (bal[payer] || 0) + (r.cost || 0);
    for (const e of r.splitEntries || []) {
      bal[e.user] = (bal[e.user] || 0) - (e.amount || 0);
    }
  }
  return bal;
}

/**
 * 依分攤方式算出 splitEntries。
 * ratio 儲存規則與 iOS 一致：amount 模式時 ratio = amount / cost。
 */
export function buildSplitEntries({ method, members, cost, amounts = {}, ratios = {} }) {
  if (method === 'none' || !members?.length) return [];
  const total = cost || 0;

  if (method === 'equal') {
    const each = members.length ? total / members.length : 0;
    return members.map(u => ({
      id: crypto.randomUUID(), user: u,
      amount: Math.round(each * 100) / 100,
      ratio: members.length ? 1 / members.length : 0,
      paid: false,
    }));
  }

  if (method === 'ratio') {
    const sum = members.reduce((s, u) => s + (parseFloat(ratios[u]) || 0), 0);
    return members.map(u => {
      const pct = (parseFloat(ratios[u]) || 0) / (sum || 1);
      return {
        id: crypto.randomUUID(), user: u,
        amount: Math.round(total * pct * 100) / 100,
        ratio: pct,
        paid: false,
      };
    });
  }

  // amount
  return members.map(u => {
    const amt = parseFloat(amounts[u]) || 0;
    return {
      id: crypto.randomUUID(), user: u,
      amount: amt,
      ratio: total > 0 ? amt / total : 0,
      paid: false,
    };
  });
}

export const ntd = (n) =>
  '$' + Math.round(n || 0).toLocaleString('en-US');
