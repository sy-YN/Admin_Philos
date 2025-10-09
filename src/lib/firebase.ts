// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC9oIHt72gUTxiXYwDTgsNxHgzVTfEcedI",
  authDomain: "philos2-41336736-69b80.firebaseapp.com",
  projectId: "philos2-41336736-69b80",
  storageBucket: "philos2-41336736-69b80.appspot.com",
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
