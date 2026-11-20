/**
 * WattWise 助理的全畫面對話（2026-11-08，做法同罐罐帳的罐罐助理，見 src/assistant.js）。
 *
 * 記帳只會變成提案卡片：按「均分」「我個人」「記下」才由 rose-assistant 寫入，不經過模型。
 * 輸入框上方的分攤快速鍵（自動｜不分｜均分）記在這支手機上；選了不分或均分，卡片只剩「記下」。
 * 「清除」只把之前的從這支手機收起來（localStorage 記時間），下一則帶 fresh，agent 不接續之前的。
 * Mac 睡著時訊息會排隊，醒來才回。
 */
import { ImagePlus, Send, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { shrinkScreenshot } from '../assistant';
import BrandMark from './BrandMark';

const MAX_PHOTOS = 4;
/** 送出去的照片：新的是 images（多張），舊的是 image（一張）。 */
const sentImages = (item) => item.images ?? (item.image ? [item.image] : []);

const SUGGESTIONS = ['這個月充電花多少？', '每度電平均多少錢？', '充電 320 元 25 度 DARA'];
const SPLITS = [[null, '自動'], ['none', '不分'], ['equal', '均分']];
const FROM_KEY = 'wattwise.assistantFrom';
const SPLIT_KEY = 'wattwise.assistantSplit';

const read = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* 這次有效就好 */ } };
const millis = (value) => (value?.toMillis ? value.toMillis() : value instanceof Date ? value.getTime() : Date.now());

function Bubble({ children }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-ww-greenbg">
        <BrandMark size={18} />
      </span>
      <div className="min-w-0 max-w-[85%] space-y-2 rounded-[20px] rounded-tl-md bg-ww-card px-3.5 py-2.5 text-[15px] leading-relaxed text-ww-ink">
        {children}
      </div>
    </div>
  );
}

function Proposal({ proposal, decision, onDecide }) {
  const busy = decision && proposal.state === 'open';
  const done = {
    applied: <p className="text-[13px] font-semibold text-ww-brand">✅ 已記下</p>,
    cancelled: <p className="text-[13px] text-ww-sub">已取消</p>,
    expired: <p className="text-[13px] text-ww-sub">已過期。要記的話再說一次。</p>,
    failed: <p className="text-[13px] text-ww-danger">⚠️ 沒有記：{proposal.result}</p>,
  }[proposal.state];
  const buttons = proposal.choices.length ? proposal.choices.map((choice, index) => [choice.label, `c${index}`]) : [['✅ 記下', 'ok']];
  return (
    <div className="rounded-ww-inner border border-ww-greenline bg-ww-greenbg p-3">
      <p className="text-[13.5px] font-semibold text-ww-greentitle">{proposal.title}</p>
      <p className="mt-1 whitespace-pre-line text-[13.5px] text-ww-ink2">{proposal.preview}</p>
      <div className="mt-2">
        {done ?? (busy ? <p className="text-[13px] text-ww-sub">處理中…</p> : (
          <div className="flex flex-wrap gap-2">
            {buttons.map(([label, value]) => (
              <button key={value} type="button" onClick={() => onDecide(value)}
                className="rounded-full bg-ww-brand px-3.5 py-1.5 text-[13.5px] font-semibold text-white active:bg-ww-brandhover">{label}</button>
            ))}
            <button type="button" onClick={() => onDecide('no')}
              className="rounded-full bg-ww-card px-3.5 py-1.5 text-[13.5px] text-ww-ink2">❌ 取消</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Answer({ item, onDecide }) {
  if (item.status === 'pending' || item.status === 'thinking') {
    return <Bubble><p className="text-ww-sub">{item.status === 'pending' ? '收到，排隊中…（家裡的電腦睡著時會晚一點回）' : '想一下…'}</p></Bubble>;
  }
  return (
    <Bubble>
      {item.reply && <p className="whitespace-pre-line">{item.reply}</p>}
      {item.status === 'error' && <p className="text-ww-danger">{item.error || '出了點問題，再說一次試試。'}</p>}
      {(item.proposals ?? []).map((proposal, index) => (
        <Proposal key={index} proposal={proposal} decision={item.decisions?.[index]}
          onDecide={(value) => onDecide(item.id, index, value)} />
      ))}
    </Bubble>
  );
}

export default function AssistantSheet({ assistant, allowed, onClose }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  // 要傳的照片（2026-11-12 起可以多選，最多 MAX_PHOTOS 張）：先留著原檔，送出時才依張數縮圖。
  const [photos, setPhotos] = useState([]);
  const [from, setFrom] = useState(() => Number(read(FROM_KEY) ?? 0));
  const [fresh, setFresh] = useState(false);
  const [split, setSplit] = useState(() => (['none', 'equal'].includes(read(SPLIT_KEY)) ? read(SPLIT_KEY) : null));
  const [sending, setSending] = useState(false);
  // 點縮圖放大看（2026-11-12）：要傳的那張、或對話裡送出去的。
  const [zoom, setZoom] = useState(null);
  const [zoomWide, setZoomWide] = useState(false);
  const bottom = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => (allowed ? assistant.watch(setItems, (failure) => setError(`讀不到對話：${failure.message}`)) : undefined), [assistant, allowed]);
  const shown = items.filter((item) => millis(item.at) >= from);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [shown.length, shown.at(-1)?.status]);

  const send = async (words = text) => {
    const body = words.trim();
    if ((!body && photos.length === 0) || sending) return;
    setSending(true);
    setError('');
    try {
      // 一則訊息整份要在 1MB 以內，照片越多每張縮得越小。
      const images = await Promise.all(photos.map((photo) => shrinkScreenshot(photo.file, Math.floor(880_000 / photos.length))));
      await assistant.ask(body, images, fresh, split);
      setText('');
      photos.forEach((photo) => URL.revokeObjectURL(photo.url));
      setPhotos([]);
      setFresh(false);
    } catch (failure) {
      setError(`沒有送出：${failure.message}`);
    }
    setSending(false);
  };
  const pickImage = (event) => {
    const files = [...(event.target.files ?? [])].filter((file) => file.type.startsWith('image/'));
    event.target.value = '';
    if (files.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) setError(`一則最多 ${MAX_PHOTOS} 張，多的沒有加進來`);
    else setError('');
    setPhotos([...photos, ...files.slice(0, Math.max(0, room)).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };
  const removePhoto = (index) => {
    URL.revokeObjectURL(photos[index].url);
    setPhotos(photos.filter((_, at) => at !== index));
  };
  const clear = () => {
    if (!window.confirm('清除對話內容？助理也會忘記剛剛聊的，從新的對話開始。')) return;
    const now = Date.now();
    write(FROM_KEY, String(now));
    setFrom(now);
    setFresh(true);
  };
  const pickSplit = (value) => { setSplit(value); write(SPLIT_KEY, value); };
  const decide = (requestId, index, value) =>
    assistant.decide(requestId, index, value).catch((failure) => setError(`沒有送出：${failure.message}`));

  return (
    <div role="dialog" aria-label="WattWise 助理" className="fixed inset-0 z-50 mx-auto flex max-w-app flex-col bg-ww-bg">
      <header className="flex items-center gap-2 px-5 pb-3 pt-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))]">
        <button type="button" aria-label="關閉" onClick={onClose} className="-m-2 p-2 text-ww-sub"><X size={24} /></button>
        <h2 className="flex-1 text-center text-[17px] font-bold text-ww-ink">WattWise 助理</h2>
        <button type="button" aria-label="清除對話內容" onClick={clear} disabled={shown.length === 0}
          className="-my-2 -mr-2 flex items-center gap-1 rounded-full px-2 py-2 text-[13px] text-ww-sub disabled:opacity-30">
          <Trash2 size={17} aria-hidden />清除
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        <Bubble>
          {allowed ? (
            <>
              <p>我是 WattWise 助理。傳充電 App 的截圖、收據，或直接說「充電 320 元 25 度 DARA」；也可以問「這個月充電花多少」。</p>
              <p className="text-[13px] text-ww-sub">記帳都要你按按鈕才會寫進帳本。已經記下的要改或刪，請在記錄上操作。</p>
            </>
          ) : <p>WattWise 助理目前只有帳本擁有者（Rose）能用。</p>}
        </Bubble>
        {shown.map((item) => (
          <div key={item.id} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[85%] space-y-2 rounded-[20px] rounded-tr-md bg-ww-brand px-3.5 py-2.5 text-[15px] text-white">
                {sentImages(item).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {sentImages(item).map((src, index) => (
                      <button key={index} type="button" aria-label="放大看這張圖" onClick={() => { setZoomWide(false); setZoom(src); }}>
                        <img src={src} alt="附的截圖" className={sentImages(item).length > 1 ? 'h-24 w-20 object-cover rounded-ww-inner' : 'max-h-48 rounded-ww-inner'} />
                      </button>
                    ))}
                  </div>
                )}
                {item.text && <p className="whitespace-pre-line">{item.text}</p>}
              </div>
            </div>
            <Answer item={item} onDecide={decide} />
          </div>
        ))}
        {allowed && shown.length === 0 && (
          <div className="flex flex-wrap gap-2 pl-10">
            {SUGGESTIONS.map((words) => (
              <button key={words} type="button" onClick={() => send(words)}
                className="rounded-full border border-ww-line bg-ww-card px-3 py-1.5 text-[13.5px] text-ww-ink2">{words}</button>
            ))}
          </div>
        )}
        <div ref={bottom} />
      </div>

      {allowed && (
        <div className="border-t border-ww-line3 bg-ww-bg px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          {error && <p role="alert" className="mb-2 text-[13px] text-ww-danger">{error}</p>}
          <div className="mb-2 flex items-center gap-1.5 text-[13px]" role="group" aria-label="分攤">
            <span className="mr-0.5 text-ww-sub">分攤</span>
            {SPLITS.map(([value, label]) => (
              <button key={label} type="button" aria-pressed={split === value} onClick={() => pickSplit(value)}
                className={`rounded-full border px-3 py-1 ${split === value ? 'border-ww-brand bg-ww-greenbg font-semibold text-ww-greentitle' : 'border-ww-line bg-ww-card text-ww-sub'}`}>
                {label}
              </button>
            ))}
            <span className="ml-1 truncate text-[11.5px] text-ww-faint">{split ? '你講了別的分法照你講的' : '沒講就在卡片上問'}</span>
          </div>
          {photos.length > 0 && (
          <div className="mb-2 flex gap-3 overflow-x-auto pt-2">
            {photos.map((photo, index) => (
              <div key={photo.url} className="relative shrink-0">
                <button type="button" aria-label={`放大看第 ${index + 1} 張`} onClick={() => { setZoomWide(false); setZoom(photo.url); }}>
                  <img src={photo.url} alt={`要傳的第 ${index + 1} 張`} className="h-14 rounded-ww-inner" />
                </button>
                <button type="button" aria-label={`拿掉第 ${index + 1} 張`} onClick={() => removePhoto(index)}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
                  <X size={14} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}
          <div className="flex items-end gap-2">
            <button type="button" aria-label="附截圖或收據" disabled={photos.length >= MAX_PHOTOS} onClick={() => fileInput.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ww-card text-ww-brand"><ImagePlus size={20} /></button>
            <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={pickImage} />
            <textarea value={text} rows={1} maxLength={1000} placeholder="例如：充電 320 元 DARA"
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-[22px] border border-ww-line bg-ww-field px-4 py-2.5 text-[16px] text-ww-ink outline-none focus:border-ww-brand" />
            <button type="button" aria-label="送出" disabled={sending || (!text.trim() && photos.length === 0)} onClick={() => send()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ww-brand text-white disabled:opacity-40"><Send size={18} /></button>
          </div>
        </div>
      )}
      {zoom && (
        // 點圖片：整張看 ↔ 放大到螢幕寬、上下捲動（長條收據看得清楚），也可以用兩指縮放。點圖片外面或 ✕ 關掉。
        <div role="dialog" aria-label="放大的圖" onClick={() => setZoom(null)}
          className={`fixed inset-0 z-[60] overflow-auto bg-black/90 ${zoomWide ? '' : 'flex items-center justify-center p-3'}`}>
          <img src={zoom} alt="放大的圖" onClick={(event) => { event.stopPropagation(); setZoomWide(!zoomWide); }}
            className={zoomWide ? 'block h-auto w-full cursor-zoom-out' : 'max-h-full max-w-full cursor-zoom-in object-contain'} />
          <button type="button" aria-label="關閉" onClick={() => setZoom(null)}
            className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
            <X size={22} />
          </button>
        </div>
      )}
    </div>
  );
}
