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

// Update this function to properly format the token
export function formatAlphanumericToken(token) {
  try {
    if (!token) return generateRandomToken();

    if (
      typeof token === "string" &&
      token.length === 20 &&
      /^[a-zA-Z0-9]+$/.test(token)
    ) {
      return token;
    }

    const matches = token.match(/\[(.*?)\]/);
    if (matches && matches[1]) {
      return matches[1];
    }

    return token.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
  } catch (error) {
    return generateRandomToken();
  }
}

function generateRandomToken() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 20; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export const setupNotifications = async () => {
  try {
    console.log("Setting up notifications...");

    if (!Device.isDevice) {
      console.warn("Not a physical device, notifications may not work");
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    console.log("Current permission status:", existingStatus);

    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      console.log("Requesting notification permissions...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("New permission status:", status);
    }

    if (finalStatus !== "granted") {
      console.warn("Notification permissions not granted");
      return null;
    }

    if (Platform.OS === "android") {
      console.log("Setting up Android notification channels...");
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    // Get the actual token instead of returning true
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: "c58bd2bc-2b46-4518-a238-6e981d88470a",
    });

    console.log(
      "Notification setup completed successfully with token:",
      token.data
    );
    return token.data; // Return the actual token string
  } catch (error) {
    console.error("Notification setup error:", error);
    return null;
  }
};

export async function getOrGenerateExpoPushToken() {
  try {
    console.log("Getting Expo push token...");
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: "c58bd2bc-2b46-4518-a238-6e981d88470a",
    });

    if (!token?.data) {
      console.warn("No token data received");
      return null;
    }

    console.log("Successfully received push token:", token.data);
    return token.data.toString();
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
}

export async function handleTokens(isNewInstall = false) {
  try {
    console.log("Starting token setup...");
    await setupNotifications();

    // Get push token
    let pushToken = await getOrGenerateExpoPushToken();
    console.log("Initial Push Token:", pushToken);

    if (!pushToken) {
      console.warn("No push token received, generating fallback...");
      pushToken = generateRandomToken();
    }

    const formattedPushToken = formatAlphanumericToken(pushToken);
    console.log("Formatted Push Token:", formattedPushToken);

    const sessionToken = generateRandomToken();
    console.log("Generated Session Token:", sessionToken);

    // Store tokens
    const tokensToStore = [
      ["expoPushToken", String(pushToken)],
      ["formattedPushToken", String(formattedPushToken)],
      ["sessionToken", String(sessionToken)],
    ];

    await AsyncStorage.multiSet(tokensToStore);
    console.log("Tokens stored successfully");

    // Verify storage
    const storedTokens = await AsyncStorage.multiGet([
      "expoPushToken",
      "formattedPushToken",
      "sessionToken",
    ]);
    console.log("Stored Tokens:", storedTokens);

    return {
      pushToken: formattedPushToken,
      sessionToken,
    };
  } catch (error) {
    console.error("Token handling error:", error);
    const fallbackToken = generateRandomToken();
    console.log("Using fallback token:", fallbackToken);
    return {
      pushToken: fallbackToken,
      sessionToken: fallbackToken,
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

// Add a function to test notifications
export async function testNotification() {
  try {
    const token = await AsyncStorage.getItem("expoPushToken");
    if (!token) {
      console.error("No push token found");
      return false;
    }

    // Send a test notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "If you see this, notifications are working!",
        sound: "notification.mp3",
      },
      trigger: null, // Send immediately
    });

    console.log("Test notification sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending test notification:", error);
    return false;
  }
}
