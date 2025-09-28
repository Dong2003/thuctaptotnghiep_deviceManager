// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDWwSN4r1Olyu6oOtTWCJsrbVN-4vrw5-g",
  authDomain: "webdevice-9c097.firebaseapp.com",
  projectId: "webdevice-9c097",
  storageBucket: "webdevice-9c097.appspot.com", // ✅ sửa lại đúng
  messagingSenderId: "871227593835",
  appId: "1:871227593835:web:ee5f9656c99c6cad1d4d2e",
  measurementId: "G-8C2MP503K9",
};
// const firebaseConfig = {
//   apiKey: "AIzaSyAST-0KKcNv57wpAtKSl0KIjEmFQ9gPI1U",
//   authDomain: "user-a28cc.firebaseapp.com",
//   databaseURL: "https://user-a28cc-default-rtdb.firebaseio.com",
//   projectId: "user-a28cc",
//   storageBucket: "user-a28cc.appspot.com",
//   messagingSenderId: "61803478198",
//   appId: "1:61803478198:web:74f011b77e9505e00e7a17",
//   measurementId: "G-EMLXX9EYZ8"
// };
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export let analytics: any = null;
if (typeof window !== "undefined" && import.meta.env.MODE === "production") {
  import("firebase/analytics").then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  });
}

export default app;
