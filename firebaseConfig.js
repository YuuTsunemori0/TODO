// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAhvBttl3n7SqU9rDeGIZTrdspnwoVm6f4",
  authDomain: "to-do-list-d31a1.firebaseapp.com",
  projectId: "to-do-list-d31a1",
  storageBucket: "to-do-list-d31a1.firebasestorage.app",
  messagingSenderId: "212406609459",
  appId: "1:212406609459:web:6f60905f5922233dbd2546"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
