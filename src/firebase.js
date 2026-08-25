import { initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBFiHBJv0JJPIN9_zLM6hx4s80ldYuN_SU",
  // ⚠️ 目前只有 firebaseapp.com 這個網域被 Google OAuth 授權為 redirect_uri。
  // 若日後要改成 ev-tracker-119e6.web.app，必須先到 Google Cloud Console 的
  // OAuth 用戶端加入 https://ev-tracker-119e6.web.app/__/auth/handler，否則會 redirect_uri_mismatch。
  authDomain: "ev-tracker-119e6.firebaseapp.com",
  projectId: "ev-tracker-119e6",
  storageBucket: "ev-tracker-119e6.firebasestorage.app",
  messagingSenderId: "434539249476",
  appId: "1:434539249476:web:4e3c4e53b3ec4b0766e111",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

/** 加到主畫面（standalone PWA）執行中 */
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** iOS / iPadOS */
export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * iOS Safari 與 standalone PWA 對彈出視窗限制很嚴，popup 流程會失敗（Google 回 400）。
 * 這些環境改用 redirect 流程；桌機維持 popup（體驗較好，且不會離開頁面）。
 */
export async function signInWithGoogle() {
  if (isIOS() || isStandalone()) {
    return signInWithRedirect(auth, googleProvider);
  }
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err) {
    // 彈出視窗被瀏覽器擋掉時退回 redirect
    const fallback = [
      'auth/popup-blocked',
      'auth/operation-not-supported-in-this-environment',
      'auth/web-storage-unsupported',
      'auth/cancelled-popup-request',
    ];
    if (fallback.includes(err?.code)) {
      return signInWithRedirect(auth, googleProvider);
    }
    throw err;
  }
}

export { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged };
