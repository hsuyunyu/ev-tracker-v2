import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import BrandMark from './BrandMark';

export default function Login() {
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ww-bg px-6">
      <div className="w-full max-w-xs text-center">
        <BrandMark size={56} className="mx-auto mb-7" />

        <h1 className="text-2xl font-semibold text-ww-ink tracking-wide mb-1">WattWise</h1>
        <p className="text-ww-sub text-sm mb-10">電動車費用記錄</p>

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-full
                     border border-ww-line2 bg-ww-card hover:bg-ww-seg transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-sm text-ww-ink font-medium">使用 Google 帳號登入</span>
        </button>

        <p className="mt-6 text-[11px] text-ww-sub leading-relaxed">
          請用與 WattWise App 相同的 Google 帳號登入，<br />資料會自動同步。
        </p>

        {error && <p className="mt-5 text-ww-danger text-xs">{error}</p>}
      </div>
    </div>
  );
}
