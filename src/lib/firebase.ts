// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDWwSN4r1Olyu6oOtTWCJsrbVN-4vrw5-g",
  authDomain: "webdevice-9c097.firebaseapp.com",
  projectId: "webdevice-9c097",
  storageBucket: "webdevice-9c097.firebasestorage.app",
  messagingSenderId: "871227593835",
  appId: "1:871227593835:web:ee5f9656c99c6cad1d4d2e",
  measurementId: "G-8C2MP503K9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// Connect to emulators in development
// if (import.meta.env.DEV) {
//   try {
//     connectAuthEmulator(auth, "http://localhost:9099");
//     connectFirestoreEmulator(db, "localhost", 8080);
//     connectStorageEmulator(storage, "localhost", 9199);
//   } catch (error) {
//     console.log("Emulators already connected or not available");
//   }
// }

export default app;
