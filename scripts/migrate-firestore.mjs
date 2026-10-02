#!/usr/bin/env node
/**
 * 一次性搬遷：把 Firestore 資料從舊專案複製到新專案，並比對兩邊是否一致。
 *
 *   node scripts/migrate-firestore.mjs              # 預演：只讀來源，列出會複製什麼（不寫入）
 *   node scripts/migrate-firestore.mjs --write      # 實際複製到新專案
 *   node scripts/migrate-firestore.mjs --verify     # 比對兩邊：文件數與每份文件的內容
 *
 * 選項：
 *   --from <projectId>   來源專案（預設 ev-tracker-119e6）
 *   --to <projectId>     目的專案（預設 wattwise-rose）
 *   --all                連已廢棄的 root 集合也一起複製（預設只複製 App 會用到的三個）
 *   --from-key <path>    來源專案的服務帳戶金鑰（不給就用 gcloud 的應用程式預設憑證）
 *   --to-key <path>      目的專案的服務帳戶金鑰
 *
 * 文件 ID 原樣保留 —— 帳本靠 householdId、uid、`auto-{項目ID}-{到期日}` 這些 ID 互相對應，
 * 換了 ID 就會對不上。來源專案全程只讀，不會被修改。
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, DocumentReference } from 'firebase-admin/firestore';

/** App 與網頁實際使用的 root 集合（見 firestore.rules） */
const ROOTS = ['users', 'householdInvites', 'households'];

// MARK: - 參數

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const FROM = opt('--from', 'ev-tracker-119e6');
const TO   = opt('--to', 'wattwise-rose');
const MODE = flag('--write') ? 'write' : flag('--verify') ? 'verify' : 'dry-run';

if (FROM === TO) {
  console.error('來源與目的專案相同，中止。');
  process.exit(1);
}

function connect(projectId, keyPath, name) {
  const credential = keyPath
    ? cert(JSON.parse(readFileSync(keyPath, 'utf8')))
    : applicationDefault();
  return getFirestore(initializeApp({ credential, projectId }, name));
}

const src = connect(FROM, opt('--from-key'), 'src');
const dst = connect(TO, opt('--to-key'), 'dst');

// MARK: - 走訪

/**
 * 走訪一個集合底下的所有文件（含子集合）。
 * 用 listDocuments() 而不是 get()：只有子集合、本身沒有欄位的「空殼文件」
 * 也會被列出來，否則它底下的資料會整批漏掉。
 */
async function* walk(db, collectionPath) {
  const refs = await db.collection(collectionPath).listDocuments();
  for (const ref of refs) {
    const snap = await ref.get();
    yield { path: ref.path, exists: snap.exists, data: snap.data() };
    for (const sub of await ref.listCollections()) {
      yield* walk(db, sub.path);
    }
  }
}

/** 文件裡若存了指向其他文件的參照，改指到目的專案的同一路徑 */
function rebase(value) {
  if (value instanceof DocumentReference) return dst.doc(value.path);
  if (Array.isArray(value)) return value.map(rebase);
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rebase(v)]));
  }
  return value;   // Timestamp、GeoPoint、純量原樣寫入
}

/** 內容指紋：欄位順序無關，參照只比路徑 */
function fingerprint(value) {
  const norm = (v) => {
    if (v instanceof DocumentReference) return { $ref: v.path };
    if (v && typeof v.toMillis === 'function') return { $ts: v.toMillis() };
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.keys(v).sort().map(k => [k, norm(v[k])]));
    }
    return v;
  };
  return createHash('sha1').update(JSON.stringify(norm(value))).digest('hex');
}

// 把路徑裡的文件 ID 換成萬用字元，用來分組統計：
// "households/abc/records/xyz" 會歸到 "households/{id}/records"
const groupOf = (path) =>
  path.split('/').map((seg, i) => (i % 2 === 1 ? '{id}' : seg)).slice(0, -1).join('/');

async function rootCollections() {
  const all = (await src.listCollections()).map(c => c.id);
  const skipped = all.filter(id => !ROOTS.includes(id));
  const roots = flag('--all') ? all : all.filter(id => ROOTS.includes(id));
  return { roots, skipped: flag('--all') ? [] : skipped };
}

function printCounts(title, counts) {
  console.log(`\n${title}`);
  const rows = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  if (rows.length === 0) console.log('  （沒有文件）');
  for (const [group, n] of rows) console.log(`  ${String(n).padStart(6)}  ${group}`);
  console.log(`  ${String(rows.reduce((s, [, n]) => s + n, 0)).padStart(6)}  合計`);
}

// MARK: - 複製 / 預演

async function copy(write) {
  const { roots, skipped } = await rootCollections();
  console.log(`${write ? '複製' : '預演（不寫入）'}：${FROM} → ${TO}`);
  console.log(`root 集合：${roots.join('、') || '（無）'}`);
  if (skipped.length) {
    console.log(`略過（已廢棄的舊 root 集合，要一起搬請加 --all）：${skipped.join('、')}`);
  }

  const counts = {};
  let shells = 0;
  const failures = [];
  const writer = write ? dst.bulkWriter() : null;
  writer?.onWriteError((err) => {
    if (err.failedAttempts < 5) return true;   // 重試
    failures.push(`${err.documentRef.path}：${err.message}`);
    return false;
  });

  for (const root of roots) {
    for await (const doc of walk(src, root)) {
      if (!doc.exists) { shells += 1; continue; }   // 空殼文件不必寫，子集合會各自建立
      counts[groupOf(doc.path)] = (counts[groupOf(doc.path)] || 0) + 1;
      writer?.set(dst.doc(doc.path), rebase(doc.data));
    }
  }
  await writer?.close();

  printCounts(write ? '已寫入' : '將會複製', counts);
  if (shells) console.log(`\n另有 ${shells} 份空殼文件（只有子集合、沒有欄位），其子集合已包含在上面。`);

  if (failures.length) {
    console.error(`\n✗ ${failures.length} 份文件寫入失敗：`);
    failures.forEach(f => console.error('  ' + f));
    process.exit(1);
  }
  console.log(write
    ? '\n✓ 複製完成。請接著執行 --verify 比對。'
    : '\n這是預演，沒有寫入任何資料。確認無誤後加上 --write 執行。');
}

// MARK: - 比對

async function snapshot(db, roots) {
  const docs = new Map();
  for (const root of roots) {
    for await (const doc of walk(db, root)) {
      if (doc.exists) docs.set(doc.path, fingerprint(doc.data));
    }
  }
  return docs;
}

async function verify() {
  const { roots } = await rootCollections();
  console.log(`比對：${FROM} ↔ ${TO}（${roots.join('、')}）`);

  const [a, b] = await Promise.all([snapshot(src, roots), snapshot(dst, roots)]);

  const missing = [...a.keys()].filter(p => !b.has(p));
  const extra   = [...b.keys()].filter(p => !a.has(p));
  const changed = [...a.keys()].filter(p => b.has(p) && a.get(p) !== b.get(p));

  const counts = {};
  for (const p of a.keys()) counts[groupOf(p)] = (counts[groupOf(p)] || 0) + 1;
  printCounts(`來源 ${FROM}`, counts);

  const report = (label, list) => {
    if (!list.length) return;
    console.log(`\n${label}（${list.length}）`);
    list.slice(0, 20).forEach(p => console.log('  ' + p));
    if (list.length > 20) console.log(`  …還有 ${list.length - 20} 份`);
  };
  report('目的專案缺少', missing);
  report('內容不同', changed);
  report('目的專案多出（來源沒有）', extra);

  if (missing.length || changed.length || extra.length) {
    console.log('\n✗ 兩邊不一致。');
    process.exit(1);
  }
  console.log(`\n✓ 兩邊一致：${a.size} 份文件的路徑與內容完全相同。`);
}

// MARK: - 執行

function fail(err) {
  console.error('\n✗ 執行失敗：', err?.message ?? err);
  if (/default credentials|Could not load/i.test(String(err?.message))) {
    console.error('  尚未設定憑證，請先執行：gcloud auth application-default login');
  }
  process.exit(1);
}

// 憑證錯誤會從 gRPC 連線的背景工作丟出來，try/catch 接不到
process.on('unhandledRejection', fail);
process.on('uncaughtException', fail);

try {
  await (MODE === 'verify' ? verify() : copy(MODE === 'write'));
} catch (err) {
  fail(err);
}
