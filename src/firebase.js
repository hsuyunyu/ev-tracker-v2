import { initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/** 主要網址（手機請用這個） */
export const PRIMARY_HOST = 'wattwise.web.app';

/**
 * 可以當 authDomain 的網域：authDomain 必須與目前網址相同，iOS Safari 才不會擋跨網域登入儲存。
 * ⚠️ 每個網域都必須先完成兩件事，否則會 redirect_uri_mismatch：
 *   1. Firebase Console → Authentication → 設定 → 已授權網域 加入該網域
 *   2. Google Cloud Console 的 OAuth 用戶端加入 https://<網域>/__/auth/handler
 * （ev-tracker-119e6.web.app 尚未授權，所以不在清單內）
 */
export const AUTH_HOSTS = [PRIMARY_HOST, 'ev-tracker-119e6.firebaseapp.com'];

const authDomain = AUTH_HOSTS.includes(window.location.hostname)
  ? window.location.hostname
  : 'ev-tracker-119e6.firebaseapp.com';

const firebaseConfig = {
  apiKey: "AIzaSyBFiHBJv0JJPIN9_zLM6hx4s80ldYuN_SU",
  authDomain,
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
