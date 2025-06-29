// firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhvBttl3n7SqU9rDeGIZTrdspnwoVm6f4",
  authDomain: "to-do-list-d31a1.firebaseapp.com",
  projectId: "to-do-list-d31a1",
  storageBucket: "to-do-list-d31a1.firebasestorage.app",
  messagingSenderId: "212406609459",
  appId: "1:212406609459:web:6f60905f5922233dbd2546",
  measurementId: "G-4N6RYDDYKC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
