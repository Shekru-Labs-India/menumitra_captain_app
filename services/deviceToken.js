import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const setupNotifications = async () => {
  if (!Device.isDevice) {
    return null;
  }

  // Configure notification settings without sound
  await Notifications.setNotificationChannelAsync("orders", {
    name: "Orders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  });
};

// Generate session token
const generateSessionToken = async () => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let token = "";
  for (let i = 0; i < 10; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Generate random token in Expo push token format
const generateRandomToken = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  // Generate a 22-character token (typical Expo push token length)
  for (let i = 0; i < 22; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Get Expo push token
const getExpoPushToken = async () => {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return generateRandomToken();
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: "b5b6147e-860e-409c-8abb-40f7fc620d95",
    });

    const tokenValue = token.data
      .replace("ExponentPushToken[", "")
      .replace("]", "");
    return tokenValue;
  } catch (error) {
    return generateRandomToken();
  }
};

// Main token handling function
export const handleTokens = async () => {
  try {
    const pushToken = await getExpoPushToken();
    const sessionToken = await generateSessionToken();

    // Store tokens in AsyncStorage
    await AsyncStorage.multiSet([
      ["expoPushToken", pushToken],
      ["sessionToken", sessionToken],
      ["tokenTimestamp", Date.now().toString()],
    ]);

    return {
      pushToken,
      sessionToken,
    };
  } catch (error) {
    throw error;
  }
};

export const addNotificationListener = (callback) => {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return subscription;
};

export const addNotificationResponseListener = (callback) => {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(callback);
  return subscription;
};

// Add this function to test notifications
export const sendTestNotification = async (pushToken) => {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: `ExponentPushToken[${pushToken}]`,
        title: "Test Notification",
        body: "This is a test notification",
        data: { type: "test" },
        sound: "default",
        priority: "high",
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return null;
  }
};
