import React, { useCallback, useEffect, useRef, useState } from 'react';
import BrandMark from './BrandMark';

/**
 * 底部分頁列：對應 iOS WattTabBar（液態玻璃，外觀與手感比照 iOS 27 系統分頁列）。
 * 左邊一條浮動的玻璃膠囊放 4 個單字分頁，右邊獨立的葉形玻璃圓鈕新增記錄。
 * - 選取中的分頁墊一塊淡灰膠囊，文字用品牌色，其餘用主文字色
 * - 一按下，選取底浮起變成透明玻璃透鏡、上下左右各長大 16px，底下的分頁放大 16%，整條列也脹大；
 *   透鏡像果凍一樣滑到按的分頁（起步拉長壓扁、到點擠扁再彈回）。按住可拖著透鏡走，放開切到手指下的分頁
 * 動畫參數與 iOS 相同（取自實測 UIKit 分頁列的數據）。網頁沒有 SwiftUI 的彈簧，
 * 這裡用 requestAnimationFrame 跑同一組彈簧，直接寫 DOM 的 transform，不經過 React 重繪。
 * 內容會從列的下方透出來；列的下方另有一層模糊淡出，對應 iOS 的 scroll edge effect。
 */
const TABS = [
  { id: 'home',      mono: '覽', label: '總覽' },
  { id: 'records',   mono: '記', label: '記錄' },
  { id: 'analytics', mono: '析', label: '分析' },
  { id: 'settings',  mono: '設', label: '設定' },
];

/** 玻璃質感：背景模糊加飽和、上緣高光、柔和陰影 */
const GLASS = `backdrop-blur-xl backdrop-saturate-[1.8]
  shadow-[inset_0_1px_0_rgba(255,255,255,.45),inset_0_0_0_0.5px_rgba(255,255,255,.28),0_8px_24px_rgba(0,0,0,.14)]`;

/** 透鏡：近乎透明的玻璃，只有亮邊與陰影 */
const LENS_GLASS = `backdrop-blur-[2px] backdrop-saturate-150 bg-white/[0.08]
  shadow-[inset_0_1px_0_rgba(255,255,255,.6),inset_0_0_0_0.5px_rgba(255,255,255,.5),inset_0_-1px_2px_rgba(0,0,0,.06),0_6px_18px_rgba(0,0,0,.16)]`;

const BAR_H = 62;
/** 膠囊內緣到選取底的距離 */
const INSET = 4;
/** 浮起時透鏡上下左右各長大的量 */
const LIFT_GROW = 16;
/** 按住時整條列加寬的量（快點一下只會到一部分，形成一個小脈衝） */
const PRESS_GROW = 14.6;
/** 透鏡底下的分頁放大比例 */
const MAGNIFY = 0.16;

/** 各動作的彈簧（與 iOS 相同的量測值）：omega 為自然頻率，zeta 為阻尼比 */
const SPRING = {
  travel:  { omega: (2 * Math.PI) / 0.4,  zeta: 0.85 }, // 透鏡滑到分頁
  follow:  { omega: 32,                   zeta: 0.9 },  // 拖曳時跟著手指
  lift:    { omega: (2 * Math.PI) / 0.25, zeta: 1 },    // 浮起 / 放下
  platter: { omega: (2 * Math.PI) / 0.4,  zeta: 1 },    // 放下後灰底浮現
  press:   { omega: 17.6,                 zeta: 0.59 }, // 整條列脹大
  stretch: { omega: (2 * Math.PI) / 0.3,  zeta: 0.45 }, // 拖曳速度造成的拉伸
};

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

const makeSpring = (value, cfg) => ({ x: value, v: 0, target: value, cfg });

function stepSpring(s, dt) {
  const { omega, zeta } = s.cfg;
  s.v += (-2 * zeta * omega * s.v - omega * omega * (s.x - s.target)) * dt;
  s.x += s.v * dt;
}

const isSettled = (s, eps) => Math.abs(s.x - s.target) < eps && Math.abs(s.v) < eps * 10;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** 依時間取一條形變曲線：從 1 經過各段到達指定值，最後以衰減振盪彈回 1 */
function track(t, segments) {
  let from = 1;
  let start = 0;
  for (const [duration, to] of segments) {
    if (t < start + duration) return from + (to - from) * easeInOut((t - start) / duration);
    from = to;
    start += duration;
  }
  const s = t - start;
  const omega = (2 * Math.PI) / 0.4;
  const zeta = 0.6;
  return 1 + (from - 1) * Math.exp(-zeta * omega * s) * Math.cos(omega * Math.sqrt(1 - zeta * zeta) * s);
}

/**
 * 透鏡移動時的果凍形變（量測值）：起步 0.14 秒內橫向拉到 1.12、縱向壓到 0.84，
 * 回到原狀後在到點時依移動距離 d 擠扁（移 258px 約橫 0.88、縱 1.14），再彈回。
 */
function jellyAt(t, d) {
  return {
    x: track(t, [[0.14, 1.12], [0.23, 1], [0.13, 1 - 0.00046 * d]]),
    y: track(t, [[0.14, 0.84], [0.23, 1], [0.16, 1 + 0.00055 * d]]),
  };
}
const JELLY_SECONDS = 1.4;

/** 透鏡從目前位置滑到某個位置，並觸發果凍形變 */
function travelTo(s, x) {
  const d = Math.abs(x - s.pos.x);
  if (d > 1) s.jelly = { t0: performance.now(), d };
  s.pos.cfg = SPRING.travel;
  s.pos.target = x;
}

function createSim() {
  return {
    pos: makeSpring(0, SPRING.travel),
    lift: makeSpring(0, SPRING.lift),
    platter: makeSpring(1, SPRING.platter),
    press: makeSpring(0, SPRING.press),
    stretch: makeSpring(0, SPRING.stretch),
    jelly: null,     // { t0, d }：進行中的果凍形變
    width: 0,        // 四個分頁那一排的寬度
    magnified: 0,    // 透鏡底下（會放大）的分頁
    touch: null,     // 按著時的狀態
    token: 0,        // 每次按下加一，讓上一次放開時排的延遲動作作廢
    raf: 0,
  };
}

export default function TabBar({ tab, onChange, dueCount = 0, onAdd }) {
  const index = Math.max(0, TABS.findIndex(t => t.id === tab));
  /** 按著時透鏡要去的分頁（決定文字顏色）；null 表示沒有按著 */
  const [target, setTarget] = useState(null);
  const shown = target ?? index;

  const sim = useRef(createSim());
  const barRef = useRef(null);
  const rowRef = useRef(null);
  const pillRef = useRef(null);
  const lensRef = useRef(null);
  const itemRefs = useRef([]);

  /** 把目前的模擬狀態寫到 DOM */
  const paint = useCallback(() => {
    const s = sim.current;
    const tw = s.width / TABS.length;
    if (!tw || !barRef.current) return;

    const j = s.jelly ? jellyAt((performance.now() - s.jelly.t0) / 1000, s.jelly.d) : { x: 1, y: 1 };
    const lift = clamp(s.lift.x, 0, 1);
    const stretch = s.stretch.x;

    const barWidth = s.width + INSET * 2;
    barRef.current.style.transform = `scale(${(barWidth + s.press.x) / barWidth})`;

    const pill = pillRef.current;
    pill.style.width = `${tw}px`;
    pill.style.transform = `translateX(${s.pos.x}px) scale(${j.x}, ${j.y})`;
    pill.style.opacity = clamp(s.platter.x, 0, 1);

    // 透鏡平常縮在選取底的大小，浮起時長到完整大小
    const lw = tw + LIFT_GROW;
    const lh = BAR_H - INSET * 2 + LIFT_GROW;
    const liftX = tw / lw + (1 - tw / lw) * lift;
    const liftY = (lh - LIFT_GROW) / lh + (LIFT_GROW / lh) * lift;
    const lens = lensRef.current;
    lens.style.width = `${lw}px`;
    lens.style.height = `${lh}px`;
    lens.style.transform = `translate(${INSET + s.pos.x - LIFT_GROW / 2}px, -50%) `
      + `scale(${j.x * (1 + stretch) * liftX}, ${j.y * (1 - stretch * 0.6) * liftY})`;
    lens.style.opacity = lift;

    itemRefs.current.forEach((el, i) => {
      if (el) el.style.transform = i === s.magnified && lift > 0.001 ? `scale(${1 + MAGNIFY * lift})` : '';
    });
  }, []);

  /** 啟動動畫迴圈；所有彈簧都停下、形變跑完就自己停 */
  const kick = useCallback(() => {
    const s = sim.current;
    if (s.raf) return;
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      // 細分成 1/240 秒的小步，低阻尼的彈簧才穩定
      const steps = Math.max(1, Math.round(dt * 240));
      const springs = [s.pos, s.lift, s.platter, s.press, s.stretch];
      for (let k = 0; k < steps; k++) springs.forEach(sp => stepSpring(sp, dt / steps));
      if (s.jelly && (now - s.jelly.t0) / 1000 > JELLY_SECONDS) s.jelly = null;
      paint();

      const busy = s.jelly || !isSettled(s.pos, 0.1) || !isSettled(s.press, 0.05)
        || [s.lift, s.platter, s.stretch].some(sp => !isSettled(sp, 0.001));
      s.raf = busy ? requestAnimationFrame(frame) : 0;
    };
    s.raf = requestAnimationFrame(frame);
  }, [paint]);

  // 量測那一排的寬度；寬度改變時（旋轉、縮放視窗）直接對齊到選取中的分頁
  useEffect(() => {
    const s = sim.current;
    const row = rowRef.current;
    const ro = new ResizeObserver(() => {
      s.width = row.getBoundingClientRect().width;
      const x = (s.width / TABS.length) * TABS.findIndex(t => t.id === row.dataset.tab);
      if (!s.touch) {
        s.pos.x = s.pos.target = Math.max(0, x);
        s.pos.v = 0;
      }
      paint();
    });
    ro.observe(row);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [paint]);

  // 從別處切換分頁（例如首頁的連結、鍵盤）時，選取底也用同一條彈簧滑過去
  useEffect(() => {
    const s = sim.current;
    if (s.touch) return;
    s.magnified = index;
    const tw = s.width / TABS.length;
    if (!tw) return;
    if (Math.abs(s.pos.target - index * tw) < 0.5) return;
    travelTo(s, index * tw);
    kick();
  }, [index, kick]);

  const localX = (e) => e.clientX - rowRef.current.getBoundingClientRect().left;
  const tabAt = (x) => clamp(Math.floor(x / (sim.current.width / TABS.length)), 0, TABS.length - 1);

  // 按下：透鏡浮起、整條列脹大，透鏡立刻滑向按的分頁（按的是選取中的分頁就原地浮起）
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const s = sim.current;
    const tw = s.width / TABS.length;
    if (!tw) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const x = localX(e);
    const i = tabAt(x);
    s.token += 1;
    s.touch = { t0: performance.now(), x0: x, dragging: false, token: s.token };
    s.press.target = PRESS_GROW;
    s.lift.target = 1;
    s.platter.cfg = SPRING.lift;
    s.platter.target = 0;
    s.magnified = i;
    setTarget(i);
    travelTo(s, i * tw);
    kick();
  };

  // 手指橫移超過 6px：透鏡改成跟著手指走，越快拉得越長
  const onPointerMove = (e) => {
    const s = sim.current;
    const t = s.touch;
    if (!t) return;
    const x = localX(e);
    if (!t.dragging && Math.abs(x - t.x0) > 6) t.dragging = true;
    if (!t.dragging) return;

    const tw = s.width / TABS.length;
    s.pos.cfg = SPRING.follow;
    s.pos.target = clamp(x - tw / 2, 0, s.width - tw);

    const now = performance.now();
    if (t.lastX != null) {
      const v = (x - t.lastX) / Math.max((now - t.lastT) / 1000, 1 / 240);
      s.stretch.target = Math.min(Math.abs(v) / 2500, 0.2);
    }
    t.lastX = x;
    t.lastT = now;
    // 手指停住時不會再收到事件，自己把拉伸歸零讓透鏡彈回
    clearTimeout(t.idle);
    t.idle = setTimeout(() => { s.stretch.target = 0; kick(); }, 80);

    const i = tabAt(x);
    if (i !== s.magnified) {
      s.magnified = i;
      setTarget(i);
    }
    kick();
  };

  // 放開：切到手指下的分頁；透鏡到定點後放下，整條列縮回。取消時回到原分頁
  const release = (e, cancelled) => {
    const s = sim.current;
    const t = s.touch;
    if (!t) return;
    const tw = s.width / TABS.length;
    clearTimeout(t.idle);
    s.stretch.target = 0;

    const i = cancelled ? index : t.dragging ? tabAt(localX(e)) : s.magnified;
    if (t.dragging || cancelled) travelTo(s, i * tw);
    s.magnified = i;
    s.touch = null;
    if (!cancelled) onChange(TABS[i].id);

    const held = performance.now() - t.t0;
    // 點太快時讓整條列至少脹大 0.1 秒，脈衝才看得出來
    setTimeout(() => {
      if (s.token !== t.token) return;
      s.press.target = 0;
      kick();
    }, Math.max(0, 100 - held));
    // 透鏡快到定點（約 0.3 秒）才放下；按住夠久的話已經到了，放開就放下
    setTimeout(() => {
      if (s.token !== t.token) return;
      s.lift.target = 0;
      s.platter.cfg = SPRING.platter;
      s.platter.target = 1;
      setTarget(null);
      kick();
    }, t.dragging || cancelled ? 300 : Math.max(300 - held, 50));
    kick();
  };

  return (
    <>
      {/* 捲到列底下的內容模糊淡出，列才不會跟後面的文字打架 */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 z-30 pointer-events-none
                   h-[calc(100px+env(safe-area-inset-bottom))]
                   bg-gradient-to-t from-ww-bg/80 to-transparent backdrop-blur-[6px]
                   [mask-image:linear-gradient(to_top,black_55%,transparent)]
                   [-webkit-mask-image:linear-gradient(to_top,black_55%,transparent)]"
      />

      {/* 有 home indicator 時稍微沉進安全區，位置與 iOS 的分頁列接近 */}
      <div className="fixed inset-x-0 z-40 pointer-events-none
                      bottom-[max(calc(env(safe-area-inset-bottom)-12px),10px)]">
        <div className="max-w-app mx-auto px-5 flex items-center gap-3">
          <div
            ref={barRef}
            className={`pointer-events-auto relative flex-1 h-[62px] p-1 rounded-full bg-ww-card/60
                        will-change-transform ${GLASS}`}
          >
            {/* 透鏡墊在文字底下，文字才不會被它的模糊糊掉；放大效果由分頁本身縮放 */}
            <span
              ref={lensRef}
              aria-hidden="true"
              className={`absolute left-0 top-1/2 rounded-full pointer-events-none opacity-0
                          will-change-transform ${LENS_GLASS}`}
            />
            <div
              ref={rowRef}
              data-tab={TABS[index].id}
              className="relative flex h-full touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => release(e, false)}
              onPointerCancel={(e) => release(e, true)}
            >
              {/* 選取底：一塊淡灰膠囊（同系統分頁列），按著時淡出、讓位給透鏡 */}
              <span
                ref={pillRef}
                aria-hidden="true"
                className="absolute inset-y-0 left-0 rounded-full bg-ww-ink/[0.08] will-change-transform"
              />
              {TABS.map((t, i) => (
                <TabButton key={t.id} mono={t.mono} label={t.label}
                  itemRef={(el) => { itemRefs.current[i] = el; }}
                  active={shown === i} current={tab === t.id}
                  badge={t.id === 'home' ? dueCount : 0} onSelect={() => onChange(t.id)} />
              ))}
            </div>
          </div>

          <button
            onClick={onAdd} aria-label="新增記錄"
            className={`pointer-events-auto shrink-0 w-[62px] h-[62px] rounded-full bg-ww-card/60
                        flex items-center justify-center active:scale-110 transition-transform duration-200 ${GLASS}`}
          >
            <BrandMark size={28} />
          </button>
        </div>
      </div>
    </>
  );
}

function TabButton({ mono, label, active, current, badge, onSelect, itemRef }) {
  return (
    <button
      ref={itemRef}
      // 點擊與拖曳由整排的 pointer 事件處理；這裡只接鍵盤與輔助工具觸發的點擊（detail 為 0）
      onClick={(e) => { if (e.detail === 0) onSelect(); }}
      aria-current={current ? 'page' : undefined}
      className={`relative flex-1 flex flex-col items-center justify-center gap-[3px] rounded-full
                  transition-colors will-change-transform ${active ? 'text-ww-brand' : 'text-ww-ink'}`}
    >
      <span className="relative text-[19px] font-semibold leading-none">
        {mono}
        {badge > 0 && (
          <span className="absolute -top-[6px] left-full -ml-[6px] bg-ww-danger text-white text-[9px] font-bold
                           px-1 py-px rounded-full leading-none">
            {badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}
