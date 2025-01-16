import { initializeApp, getApps, getApp } from "@firebase/app";
import { getFirestore } from "@firebase/firestore";
import { getMessaging, getToken } from "firebase/messaging";

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

// Initialize Firebase only if it hasn't been initialized
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firestore
const db = getFirestore(app);

// Get FCM Token with detailed logging
const getFcmToken = async () => {
  try {
    console.log("Initializing messaging...");
    const messaging = getMessaging(app);

    console.log("Requesting notification permission...");
    const permission = await Notification.requestPermission();
    console.log("Permission:", permission);

    if (permission === "granted") {
      console.log("Getting token...");
      const token = await getToken(messaging, {
        vapidKey:
          "BGsWfw7acs_yXMa_bcWfw-49_MQkV8MdSOrCih9OO-v9pQ7AvKA2niL1dvguaHMfObKP8tO7Bq_4aTVEwOyA8x4", // Replace with your actual VAPID key
      });

      if (token) {
        console.log("Successfully got FCM token:", token);
        return token;
      } else {
        console.log("No token received");
      }
    } else {
      console.log("Notification permission denied");
    }
  } catch (error) {
    console.error("Error in getFcmToken:", error);
    throw error;
  }
};

// Call getFcmToken immediately and handle the promise
getFcmToken()
  .then((token) => {
    if (token) {
      console.log("Token in then block:", token);
    }
  })
  .catch((error) => {
    console.error("Error in token promise:", error);
  });

// Export the initialized db and getFcmToken function
export { db, getFcmToken };
