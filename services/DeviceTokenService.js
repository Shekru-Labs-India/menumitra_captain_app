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
      console.log("Not a physical device");
      return null;
    }

    // Request notification permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return null;
    }

    // Get Expo Push Token
    try {
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: "c58bd2bc-2b46-4518-a238-6e981d88470a",
      });

      // Generate new session token
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 15);
      const sessionToken = `session-${timestamp}-${randomPart}`;

      // Clear any existing tokens first
      await AsyncStorage.multiRemove([
        "expoPushToken",
        "sessionToken",
        "activeSession",
      ]);

      // Store new tokens
      await AsyncStorage.multiSet([
        ["expoPushToken", expoPushToken.data],
        ["sessionToken", sessionToken],
      ]);

      // Store session info
      const sessionInfo = {
        sessionToken,
        expoPushToken: expoPushToken.data,
        deviceName: Device.deviceName || "Unknown Device",
        platform: Platform.OS,
        timestamp: timestamp,
      };

      await AsyncStorage.setItem("activeSession", JSON.stringify(sessionInfo));

      console.log("Successfully generated tokens:", {
        pushToken: expoPushToken.data,
        sessionToken: sessionToken,
      });

      return {
        pushToken: expoPushToken.data,
        sessionToken: sessionToken,
      };
    } catch (error) {
      console.error("Error getting push token:", error);
      return null;
    }
  } catch (error) {
    console.error("Error in generateUniqueToken:", error);
    return null;
  }
}

// Simplified token verification
export async function verifyTokenPairing(sessionToken, pushToken) {
  try {
    const activeSession = await AsyncStorage.getItem("activeSession");
    if (!activeSession) return false;

    const session = JSON.parse(activeSession);
    return (
      session.sessionToken === sessionToken &&
      session.expoPushToken === pushToken
    );
  } catch (error) {
    console.error("Error verifying tokens:", error);
    return false;
  }
}

// Clear old sessions
export async function invalidateOldSessions() {
  try {
    await AsyncStorage.multiRemove([
      "expoPushToken",
      "sessionToken",
      "activeSession",
    ]);
  } catch (error) {
    console.error("Error clearing old sessions:", error);
  }
}

// Add this helper function to check token status
export async function checkTokenStatus() {
  try {
    const activeSession = await AsyncStorage.getItem("activeSession");
    const expoPushToken = await AsyncStorage.getItem("expoPushToken");
    const sessionToken = await AsyncStorage.getItem("sessionToken");

    return {
      hasActiveSession: !!activeSession,
      hasExpoPushToken: !!expoPushToken,
      hasSessionToken: !!sessionToken,
      sessionInfo: activeSession ? JSON.parse(activeSession) : null,
    };
  } catch (error) {
    console.error("Error checking token status:", error);
    return null;
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
