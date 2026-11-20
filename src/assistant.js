/**
 * WattWise 助理（2026-11-08）：網頁上直接和記帳 agent 對話，做法同罐罐帳的「罐罐助理」。
 *
 * 送出的訊息寫成 `households/{id}/requests`（status pending）；Mac mini 上的 rose-assistant（`wattwise_web.py`）
 * 用即時監聽收到後交給 Claude。記帳只會變成提案卡片，按「記下」或分攤選項時網頁只寫 decisions，
 * 寫入由 rose-assistant 照卡片存的指令執行，不經過模型。只有帳本擁有者能用（firestore.rules 擋），
 * 因為 rose-assistant 記帳的付款人固定是 Rose。
 *
 * Demo 模式是假的助理：有數字就提一筆充電讓人試按鈕。
 */
import { doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { hCollection } from './household';

const requests = (hid) => hCollection(hid, 'requests');
const seconds = (value) => value?.seconds ?? (value instanceof Date ? value.getTime() / 1000 : Infinity);

/** 真的：Firestore。規則只讓本人讀自己的（by），查詢一定要帶這個條件；筆數不多，排序在手機上做。 */
export function firestoreAssistant(hid, uid) {
  return {
    watch: (onChange, onError) => onSnapshot(query(requests(hid), where('by', '==', uid)),
      (snap) => onChange(snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => seconds(a.at) - seconds(b.at))),
      onError),
    ask: (text, images, fresh, split) => setDoc(doc(requests(hid)), {
      text, by: uid, at: serverTimestamp(), status: 'pending',
      ...(images?.length ? { images } : {}), ...(fresh ? { fresh: true } : {}), ...(split ? { split } : {}),
    }),
    decide: (requestId, index, value) => updateDoc(doc(requests(hid), requestId), { [`decisions.${index}`]: value }),
  };
}

/** 假的：Demo 模式，記憶體裡的對話，不會真的寫進帳本。 */
export function demoAssistant() {
  const items = [];
  const listeners = new Set();
  const ping = () => listeners.forEach((fn) => fn(items.map((item) => ({ ...item }))));
  return {
    watch(onChange) {
      listeners.add(onChange);
      queueMicrotask(ping);
      return () => listeners.delete(onChange);
    },
    async ask(text, images, _fresh, split) {
      const item = { id: `q${items.length + 1}`, text, images, at: new Date(), status: 'pending' };
      items.push(item);
      ping();
      setTimeout(() => { item.status = 'thinking'; ping(); }, 600);
      setTimeout(() => {
        const cost = Number(text.match(/\d+/)?.[0]);
        if (cost > 0) {
          Object.assign(item, {
            status: 'proposed',
            reply: `提了一筆充電 ${cost} 元，看一下對不對。（Demo 模式，不是真的 agent，也不會寫進帳本）`,
            proposals: [{
              title: '🔌 記一筆電車費用', state: 'open', args: [],
              preview: `類型　充電\n金額　NT$ ${cost}\n付款　Rose${split ? `\n分攤　${split === 'none' ? '不分' : '均分'}` : ''}`,
              choices: split ? [] : [{ label: '👥 均分', arg: 'split=equal' }, { label: '🙋 我個人', arg: 'split=none' }],
            }],
          });
        } else {
          Object.assign(item, { status: 'answered', reply: 'Demo 模式不會真的回答。登入之後可以問「這個月充電花多少」，或傳充電 App 的截圖讓我記。' });
        }
        ping();
      }, 1800);
    },
    async decide(requestId, index, value) {
      const item = items.find((entry) => entry.id === requestId);
      item.decisions = { ...item.decisions, [index]: value };
      item.proposals[index].state = value === 'no' ? 'cancelled' : 'applied';
      if (item.proposals.every((entry) => entry.state !== 'open')) item.status = 'done';
      ping();
    },
  };
}

/** 截圖或收據：長邊縮到 1600、轉成 JPEG。budget 是這張最多幾個字元（一則有幾張就平分 880,000），超過就再縮。 */
export async function shrinkScreenshot(file, budget = 880_000) {
  if (!file.type.startsWith('image/')) throw new Error('要選一張圖片');
  const image = await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('讀不了這張圖，換一張試試（iPhone 的 HEIC 請先轉成 JPEG）')); };
    img.src = url;
  });
  for (const [side, quality] of [[1600, 0.82], [1280, 0.75], [1024, 0.7], [800, 0.65], [640, 0.6]]) {
    const scale = Math.min(1, side / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= budget) return url;
  }
  throw new Error('這張圖太大了，裁小一點再傳');
}
