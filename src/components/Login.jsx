import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { signInWithGoogle, getRedirectResult, auth, isIOS, isStandalone } from '../firebase';
import { LeafBadge } from './BrandMark';

const HOST_OK = 'ev-tracker-119e6.firebaseapp.com';

const FEATURES = [
  { badge: '充', color: '#4E7BB5', title: '記錄每一筆用車花費', desc: '充電、過路費、保養、保險一次管理' },
  { badge: '家', color: '#6E9266', title: '家庭共同帳本',       desc: '多人分攤，自動算出誰該還誰多少' },
  { badge: '析', color: '#8C6BA6', title: '費用分析與趨勢',     desc: '看清每月支出、電價與里程變化' },
];

/** 登入頁 —— 對應 iOS LoginView */
export default function Login({ onDemo }) {
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  // redirect 流程返回後，把失敗原因顯示出來（成功則由 onAuthStateChanged 接手）
  useEffect(() => {
    getRedirectResult(auth).catch(err => setError(err?.message || String(err)));
  }, []);

  // 手機開在非 authDomain 的網域時，Safari 會擋跨網域登入儲存 → 導致 Google 400
  const wrongHost =
    (isIOS() || isStandalone()) &&
    location.hostname !== HOST_OK &&
    location.hostname !== 'localhost';

  const handleGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user') setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-ww-bg flex justify-center">
      <div className="w-full max-w-app flex flex-col ww-safe-top">
        <div className="flex-1 min-h-6" />

        {/* Logo + 標語 */}
        <div className="flex flex-col items-center">
          <LeafBadge className="shadow-[0_14px_20px_rgba(95,138,87,.6)] mb-6" />
          <h1 className="text-[36px] leading-tight font-extrabold text-ww-ink tracking-[-0.7px]">WattWise</h1>
          <p className="mt-[9px] text-[14px] font-medium text-ww-sub text-center leading-[1.55]">
            把電動車的每一筆花費，<br />記在同一本帳上
          </p>
        </div>

        {/* 功能亮點 */}
        <div className="mt-9 px-[34px] flex flex-col gap-3">
          {FEATURES.map(f => (
            <div key={f.badge}
              className="flex items-center gap-3.5 px-4 py-3.5 bg-ww-card border border-ww-line rounded-ww-sm">
              <span className="w-[42px] h-[42px] rounded-[13px] flex items-center justify-center
                               text-[18px] font-bold shrink-0"
                style={{ backgroundColor: f.color + '1A', color: f.color }}>
                {f.badge}
              </span>
              <span>
                <span className="block text-[14px] font-semibold text-ww-ink">{f.title}</span>
                <span className="block mt-0.5 text-[12px] font-medium text-ww-sub">{f.desc}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-6" />

        {error && (
          <div className="px-8 pb-3 flex items-start gap-2 text-ww-danger text-[12px] break-words">
            <AlertTriangle size={14} className="shrink-0 mt-px" />
            <span className="min-w-0">{error}</span>
          </div>
        )}

        {/* 底部按鈕 */}
        <div className="px-8 pb-[calc(38px+env(safe-area-inset-bottom))] flex flex-col items-center">
          {wrongHost ? (
            <div className="w-full bg-ww-card border border-ww-line rounded-ww-sm p-4">
              <p className="text-[13px] text-ww-ink2 leading-relaxed mb-3">
                iPhone 上請改用下面這個網址登入，否則 Safari 會擋住 Google 登入。
              </p>
              <a href={`https://${HOST_OK}/`}
                className="block w-full text-center bg-[#211D17] text-white py-3.5 rounded-ww-inner
                           text-[14px] font-semibold">
                前往正確網址
              </a>
            </div>
          ) : (
            <button onClick={handleGoogle} disabled={busy}
              className="w-full flex items-center justify-center gap-3 py-[17px] rounded-ww-sm
                         bg-[#211D17] shadow-[0_10px_13px_rgba(0,0,0,.3)] active:opacity-85
                         disabled:opacity-60 dark:border dark:border-ww-line2">
              <span className="w-[26px] h-[26px] rounded-[7px] bg-white flex items-center justify-center
                               text-[14px] font-extrabold text-[#4285f4]">G</span>
              <span className="text-[15px] font-semibold text-white">
                {busy ? '登入中…' : '以 Google 帳號登入'}
              </span>
            </button>
          )}

          {onDemo && (
            <button onClick={onDemo} className="mt-[13px] p-2 text-[13px] font-semibold text-ww-brand">
              ⚡ 先用 Demo 逛逛
            </button>
          )}

          <p className="mt-2.5 text-[11px] font-medium text-ww-faint text-center">
            請用與 App 相同的 Google 帳號登入，資料自動同步
          </p>
        </div>
      </div>
    </div>
  );
}

/** 載入畫面 —— 對應 iOS LoadingView（旋轉環 + 葉形徽章） */
export function LoadingView({ text = '正在載入您的帳本…' }) {
  return (
    <div className="min-h-[100dvh] bg-ww-bg flex flex-col items-center justify-center">
      <div className="relative w-[100px] h-[100px] flex items-center justify-center mb-7">
        <svg className="absolute inset-0 ww-spin" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="47.5" stroke="#6E9266" strokeOpacity="0.12" strokeWidth="5" />
          <circle cx="50" cy="50" r="47.5" stroke="#5F8A57" strokeWidth="5" strokeLinecap="round"
            strokeDasharray="68.6 298.5" transform="rotate(-90 50 50)" />
        </svg>
        <LeafBadge side={76} corner={24} leaf={42} />
      </div>
      <div className="text-[27px] font-extrabold text-ww-ink tracking-[-0.3px]">WattWise</div>
      <div className="mt-[7px] text-[13px] font-medium text-ww-sub">{text}</div>
    </div>
  );
}
