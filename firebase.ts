import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgOzdBnkvmTFS5xWY_ieW5TIMZXoJsOCE",
  authDomain: "taskflow-fa36c.firebaseapp.com",
  projectId: "taskflow-fa36c",
  storageBucket: "taskflow-fa36c.firebasestorage.app",
  messagingSenderId: "972292200536",
  appId: "1:972292200536:web:151a9333ec8e57d32fd22d",
  measurementId: "G-4NKPLRHBFC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);