import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Linking, Alert } from "react-native";
import * as Application from "expo-application";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Add this function to generate session tokens
export async function generateSessionToken() {
  try {
    // Generate a random string of numbers and letters
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 20; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    console.log("Generated new session token:", token);
    return token;
  } catch (error) {
    console.error("Error generating session token:", error);
    throw new Error("Failed to generate session token");
  }
}

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

export async function getOrGenerateExpoPushToken() {
  try {
    console.log("Getting push token...");
    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId: "c58bd2bc-2b46-4518-a238-6e981d88470a",
    });

    if (tokenResult?.data) {
      console.log("Successfully generated push token");
      return tokenResult.data;
    }

    return null; // Return null if token generation fails
  } catch (error) {
    console.error("Error getting push token:", error);
    return null; // Return null on error instead of throwing
  }
}

// Simplified token handling
export async function handleTokens(isNewInstall = false) {
  try {
    let pushToken = null;

    // Try to get push token but don't block login if it fails
    try {
      pushToken = await getOrGenerateExpoPushToken();
    } catch (error) {
      console.log("Push token generation failed, continuing with login");
    }

    // Generate new session token
    const sessionToken = await generateSessionToken();

    // Store tokens (only if push token was successfully generated)
    if (pushToken) {
      await AsyncStorage.multiSet([
        ["expoPushToken", pushToken],
        ["sessionToken", sessionToken],
      ]);

      // Store session info
      const sessionInfo = {
        sessionToken,
        expoPushToken: pushToken,
        lastUpdated: Date.now(),
      };

      await AsyncStorage.setItem("activeSession", JSON.stringify(sessionInfo));
    } else {
      // Store only session token if push token failed
      await AsyncStorage.setItem("sessionToken", sessionToken);
    }

    return {
      pushToken: pushToken || null,
      sessionToken: sessionToken || null,
    };
  } catch (error) {
    console.error("Token handling error:", error);
    return {
      pushToken: null,
      sessionToken: null,
    };
  }
}

// Helper function to check device settings
export async function checkDeviceSettings() {
  try {
    const permissionStatus = await Notifications.getPermissionsAsync();
    return {
      notificationsEnabled: permissionStatus.status === "granted",
      deviceInfo: {
        brand: Device.brand,
        model: Device.modelName,
        os: Platform.OS,
        version: Platform.Version,
      },
    };
  } catch (error) {
    console.error("Error checking device settings:", error);
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
