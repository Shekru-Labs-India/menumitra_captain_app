import { initializeApp } from '@firebase/app';
import { getFirestore } from '@firebase/firestore';
import { getStorage } from '@firebase/storage';
import Constants from "expo-constants";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCoPZ3_Ktah8UBBSgh0_OXL5SQwUtL6Wok",
  authDomain: "menumitra-83831.firebaseapp.com",
  projectId: "menumitra-83831",
  storageBucket: "menumitra-83831.appspot.com",
  messagingSenderId: "851450497367",
  appId: "1:851450497367:web:e2347945f3decce56a9612",
  measurementId: "G-Q6V5R4EDYT",
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  if (error.code !== 'app/duplicate-app') {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

// Initialize Firebase services
const db = getFirestore(app);
const storage = getStorage(app);

// Export the initialized services
export { db, storage };
