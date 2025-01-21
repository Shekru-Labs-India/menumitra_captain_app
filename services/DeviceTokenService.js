import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Application from "expo-application";

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
    console.log("Must use physical device for Push Notifications");
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

export async function generateUniqueToken() {
  try {
    if (!Device.isDevice) {
      throw new Error("Must use physical device");
    }

    // Get the real Expo token (this will always work for notifications)
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Notification permission not granted");
    }

    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId: "c58bd2bc-2b46-4518-a238-6e981d88470a",
    });

    // Generate session token with device info and random elements
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 15);
    const deviceInfo = [
      Device.modelName || "unknown",
      Platform.OS,
      Device.deviceName || "device",
    ].join("-");

    // Create a hash of the device info
    const deviceHash = Array.from(deviceInfo)
      .reduce((hash, char) => (hash << 5) - hash + char.charCodeAt(0), 0)
      .toString(36);

    const sessionToken = `session-${timestamp}-${randomPart}-${deviceHash}`;

    // Store both tokens and their pairing
    await AsyncStorage.multiSet([
      ["expoPushToken", expoPushToken.data],
      ["sessionToken", sessionToken],
      [`tokenPair_${sessionToken}`, expoPushToken.data], // Store the pairing
      ["lastLoginTime", timestamp.toString()], // Store login time
    ]);

    // Store the active session info
    const sessionInfo = {
      sessionToken,
      expoPushToken: expoPushToken.data,
      deviceInfo,
      loginTime: timestamp,
    };
    await AsyncStorage.setItem("activeSession", JSON.stringify(sessionInfo));

    return {
      pushToken: expoPushToken.data, // For notifications
      sessionToken: sessionToken, // For session management
    };
  } catch (error) {
    console.error("Error generating tokens:", error);
    return null;
  }
}

// Add a function to verify token pairing
export async function verifyTokenPairing(sessionToken, pushToken) {
  try {
    const storedPushToken = await AsyncStorage.getItem(
      `tokenPair_${sessionToken}`
    );
    const activeSession = await AsyncStorage.getItem("activeSession");

    if (!storedPushToken || !activeSession) {
      return false;
    }

    const sessionInfo = JSON.parse(activeSession);

    return (
      storedPushToken === pushToken &&
      sessionInfo.sessionToken === sessionToken &&
      sessionInfo.expoPushToken === pushToken
    );
  } catch (error) {
    console.error("Error verifying token pairing:", error);
    return false;
  }
}

// Add a function to invalidate old sessions on new login
export async function invalidateOldSessions() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const tokenPairKeys = keys.filter((key) => key.startsWith("tokenPair_"));

    await AsyncStorage.multiRemove(tokenPairKeys);
    await AsyncStorage.removeItem("activeSession");
  } catch (error) {
    console.error("Error invalidating old sessions:", error);
  }
}

export const addNotificationListener = (callback) => {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return subscription;
};

export const addNotificationResponseListener = (callback) => {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(callback);
  return subscription;
};
