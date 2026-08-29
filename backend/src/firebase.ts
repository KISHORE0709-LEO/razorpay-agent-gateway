import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCa4S7Nb0qyRTjg7n79pOw5B9tDPN_EelI",
  authDomain: "sentrypay-4537d.firebaseapp.com",
  projectId: "sentrypay-4537d",
  storageBucket: "sentrypay-4537d.firebasestorage.app",
  messagingSenderId: "55309665804",
  appId: "1:55309665804:web:e00a34dda65b22ab255029",
  measurementId: "G-TTZFZZPRZH"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
