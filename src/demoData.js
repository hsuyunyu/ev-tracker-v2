import { pad2 } from './format';

/**
 * Demo 模式的假資料（對應 iOS AppViewModel 的 Demo mode）。
 * 日期以「今天」為基準往回推，任何時候打開都有本月資料可看。
 */

const dayAgo = (n, time = '12:30') => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${time}`;
};

const dueIn = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const split = (cost, users = ['Rose', '1+']) => users.map((u, i) => ({
  id: `s${i}-${cost}`, user: u, amount: cost / users.length, ratio: 1 / users.length, paid: false,
}));

const rec = (id, type, vendor, cost, n, extra = {}) => ({
  id, type, vendor, cost, kwh: 0, user: 'Rose', vehicleId: 'v1', note: '',
  mileage: '', expiryDate: '', date: dayAgo(n),
  paidBy: 'Rose', splitMethod: 'none', splitEntries: [], ...extra,
});

export function demoLedger() {
  return {
    inviteCode: '7QK2-9F',
    settings: {
      definedUsers: ['Rose', '1+'],
      defaultVehicleId: 'v1',
      definedTypes: [],
      notificationsEnabled: false,
      notificationDaysBefore: 7,
      appearanceMode: 'system',
      defaultSplitEnabled: false,
      defaultSplitMethod: 'equal',
      defaultSplitRules: [],
    },
    vehicles: [
      { id: 'v1', name: 'Model Y', licensePlate: 'EAA-0001' },
    ],
    records: [
      rec('d1', 'charging', '特斯拉超充', 320, 0, { kwh: 38, mileage: '23480' }),
      rec('d2', 'tolls', 'ETag 儲值', 1000, 2, { splitMethod: 'equal', splitEntries: split(1000) }),
      rec('d3', 'charging', 'DARA', 230, 4, { kwh: 31.5, user: '1+', paidBy: '1+' }),
      rec('d4', 'maintenance', '馳加', 3200, 9, {
        note: '輪胎對調', splitMethod: 'equal', splitEntries: split(3200), mileage: '23120',
      }),
      rec('d5', 'charging', 'EVOASIS', 410, 12, { kwh: 44 }),
      rec('d6', 'charging', '特斯拉超充', 180, 16, { kwh: 21 }),
      rec('d7', 'insurance', '富邦產險', 18600, 38, { note: '年度車險' }),
      rec('d8', 'charging', 'DARA', 260, 41, { kwh: 34 }),
      rec('d9', 'tolls', 'ETag 儲值', 1000, 45),
      rec('d10', 'charging', 'U-POWER', 390, 70, { kwh: 36, mileage: '21900' }),
      rec('d11', 'other', '洗車', 350, 74),
      rec('d12', 'charging', '特斯拉超充', 300, 101, { kwh: 35 }),
    ].sort((a, b) => b.date.localeCompare(a.date)),
    recurring: [
      {
        id: 'r1', type: 'tolls', vendor: 'ETag 儲值', cost: 1000, kwh: 0, user: 'Rose',
        vehicleId: 'v1', note: '', active: true, nextDue: dueIn(4),
        interval: 'monthly', intervalMonths: 1, autoRecord: false,
      },
      {
        id: 'r2', type: 'insurance', vendor: '富邦產險', cost: 18600, kwh: 0, user: 'Rose',
        vehicleId: 'v1', note: '年度車險', active: true, nextDue: dueIn(210),
        interval: 'yearly', intervalMonths: 12, autoRecord: false,
      },
      {
        id: 'r3', type: 'other', vendor: '頂級連線', cost: 330, kwh: 0, user: 'Rose',
        vehicleId: 'v1', note: '', active: true, nextDue: dueIn(-1),
        interval: 'monthly', intervalMonths: 1, autoRecord: false,
      },
      {
        id: 'r4', type: 'maintenance', vendor: '定期保養', cost: 4500, kwh: 0, user: 'Rose',
        vehicleId: 'v1', note: '', active: false, nextDue: dueIn(90),
        interval: 'custom', intervalMonths: 6, autoRecord: false,
      },
    ],
    mileageLogs: [
      { id: 'm1', vehicleId: 'v1', mileage: 23400, date: dayAgo(3, '09:10'), note: '週末出遊' },
      { id: 'm2', vehicleId: 'v1', mileage: 22650, date: dayAgo(30, '18:00'), note: '' },
    ],
    settlements: [
      {
        id: 'st1', sequenceNumber: 1, createdAt: dueIn(-60), settledAt: dueIn(-58),
        debtorUser: '1+', creditorUser: 'Rose', amount: 2450, note: '', recordIds: [],
      },
    ],
  };
}
