import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

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
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-80 text-center px-6">
        {/* Tesla T */}
        <svg className="w-12 h-12 mx-auto mb-8 text-white" viewBox="0 0 342 512" fill="currentColor">
          <path d="M171 0C76.5 0 0 76.5 0 171c0 62.9 34 117.9 84.7 147.9V512l86.3-86.3 86.3 86.3V318.9C308 288.9 342 233.9 342 171 342 76.5 265.5 0 171 0zm0 36c74.4 0 135 60.6 135 135S245.4 306 171 306 36 245.4 36 171 96.6 36 171 36zm0 45c-49.7 0-90 40.3-90 90h36c0-29.8 24.2-54 54-54s54 24.2 54 54h36c0-49.7-40.3-90-90-90z"/>
        </svg>

        <h1 className="text-2xl font-light text-white tracking-widest uppercase mb-1">EV Tracker</h1>
        <p className="text-neutral-500 text-sm mb-10 tracking-wide">特透費用記錄</p>

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-full border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-sm text-neutral-200">使用 Google 帳號登入</span>
        </button>

        {error && <p className="mt-5 text-red-500 text-xs">{error}</p>}
      </div>
    </div>
  );
}
