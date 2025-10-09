
// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC9oIHt72gUTxiXYwDTgsNxHgzVTfEcedI",
  authDomain: "studio-8638705182-2858a.firebaseapp.com",
  projectId: "studio-8638705182-2858a",
  storageBucket: "studio-8638705182-2858a.appspot.com",
  messagingSenderId: "97381895941",
  appId: "1:97381895941:web:3e4f51df6cd2ac10a4716c",
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
}

const db = getFirestore(app);

export { db };
