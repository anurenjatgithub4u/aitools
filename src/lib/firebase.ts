import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD0Zt8Wq_GYV5TF6iPNItRF4aNt7qf6RH0",
  authDomain: "findurai.firebaseapp.com",
  projectId: "findurai",
  storageBucket: "findurai.firebasestorage.app",
  messagingSenderId: "812494792067",
  appId: "1:812494792067:web:5a252f385f37420e3342b6",
  measurementId: "G-73SV0NYB8M"
};

// Initialize Firebase (ensuring single instance in Next.js hot-reloads)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth = getAuth(app);

// Initialize Analytics conditionally (only in the browser environment)
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, analytics };
