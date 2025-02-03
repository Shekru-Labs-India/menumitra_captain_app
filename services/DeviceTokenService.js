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
    for (let i = 0; i < 10; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    console.log("Generated new session token:", token);
    return token;
  } catch (error) {
    console.error("Error generating session token:", error);
    throw new Error("Failed to generate session token");
  }
}

// Add this new function to format push token
export function formatAlphanumericToken(token) {
  // Remove any non-alphanumeric characters and take first 20 characters
  return token.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
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
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      if (!Device.isDevice) {
        throw new Error("Must use physical device for Push Notifications");
      }

      // Request permission first
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        throw new Error("Permission not granted for notifications");
      }

      // Get push token with retry mechanism
      const tokenResult = await Notifications.getExpoPushTokenAsync({
        projectId: "c58bd2bc-2b46-4518-a238-6e981d88470a", // Your project ID
      });

      if (!tokenResult?.data) {
        throw new Error("Token generation returned empty result");
      }

      console.log("Push token generated successfully:", tokenResult.data);
      return tokenResult.data;
    } catch (error) {
      console.error(
        `Token generation attempt ${retryCount + 1} failed:`,
        error
      );
      retryCount++;

      if (retryCount === maxRetries) {
        throw new Error(
          `Failed to generate push token after ${maxRetries} attempts: ${error.message}`
        );
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, retryCount))
      );
    }
  }
}

// Update handleTokens to be more resilient
export async function handleTokens(isNewInstall = false) {
  try {
    // Setup notifications first
    await setupNotifications();

    // Try to get push token with retries
    const pushToken = await getOrGenerateExpoPushToken();
    if (!pushToken) {
      throw new Error("Failed to generate required push token");
    }

    // Generate session token
    const sessionToken = await generateSessionToken();

    // Store tokens
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

    return {
      pushToken,
      sessionToken,
    };
  } catch (error) {
    console.error("Token handling error:", error);
    throw error; // Propagate error to prevent login without tokens
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
export const verifyTokens = async (sessionToken, pushToken) => {
  try {
    const activeSession = await AsyncStorage.getItem("activeSession");
    if (!activeSession) {
      return {
        isValid: false,
        message: "No active session found",
      };
    }

    const sessionInfo = JSON.parse(activeSession);
    return {
      isValid:
        sessionInfo.sessionToken === sessionToken &&
        sessionInfo.expoPushToken === pushToken,
      sessionInfo,
    };
  } catch (error) {
    console.error("Token verification error:", error);
    return { isValid: false, error: error.message };
  }
};

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
