import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBFiHBJv0JJPIN9_zLM6hx4s80ldYuN_SU",
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
export { signInWithPopup, signOut, onAuthStateChanged };
