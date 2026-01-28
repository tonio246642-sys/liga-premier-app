import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAgQlxOQl86VUuMKODvPsAJKK4Yubf4WiU",
  authDomain: "liga-futbol-sca.firebaseapp.com",
  projectId: "liga-futbol-sca",
  storageBucket: "liga-futbol-sca.firebasestorage.app",
  messagingSenderId: "358837702042",
  appId: "1:358837702042:web:2672d9c3604dc881bc7e23",
  measurementId: "G-6P4431KGVB"
};

// Singleton pattern para evitar inicializar múltiples veces
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);