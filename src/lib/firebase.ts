// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "studio-8638705182-2858a.firebaseapp.com",
  projectId: "studio-8638705182-2858a",
  storageBucket: "studio-8638705182-2858a.appspot.com",
  messagingSenderId: "1073866162334",
  appId: "1:1073866162334:web:7f6d43ea56f1406180c576",
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
}

const db = getFirestore(app);

export { db };
