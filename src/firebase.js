import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyArVd24e_-GnMU2orf2qNsBxlQ3hi46b5Q",
  authDomain: "gst-calculator-ac832.firebaseapp.com",
  projectId: "gst-calculator-ac832",
  storageBucket: "gst-calculator-ac832.firebasestorage.app",
  messagingSenderId: "247543386295",
  appId: "1:247543386295:web:0b853a50ca3121fb6b3d32",
  measurementId: "G-446SQXQH5W"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export default app;
