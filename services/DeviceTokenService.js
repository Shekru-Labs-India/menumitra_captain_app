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
    console.log("Device Info:", {
      brand: Device.brand,
      model: Device.modelName,
      os: Platform.OS,
      version: Platform.Version,
    });

    // First check if it's a physical device
    if (!Device.isDevice) {
      throw new Error("Must use a physical device for notifications");
    }

    // Check current permission status
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    console.log("Current permission status:", existingStatus);

    let finalStatus = existingStatus;

    // If not granted, request permission
    if (existingStatus !== "granted") {
      console.log("Requesting notification permission...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("New permission status:", status);
    }

    // If still not granted after request
    if (finalStatus !== "granted") {
      Alert.alert(
        "Notification Permission Required",
        "Please enable notifications for this app in your device settings to continue:",
        [
          {
            text: "Open Settings",
            onPress: () => {
              Linking.openSettings();
            },
          },
          {
            text: "Try Again",
            onPress: async () => {
              const { status } = await Notifications.requestPermissionsAsync();
              if (status !== "granted") {
                throw new Error(
                  "Notification permission is required to use this app"
                );
              }
            },
          },
        ]
      );
      throw new Error("Please enable notifications and try again");
    }

    // Add a small delay to ensure system is ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Try to get push token with multiple attempts
    let attempts = 0;
    let error = null;

    while (attempts < 3) {
      try {
        console.log(`Attempting to get push token (attempt ${attempts + 1})`);
        const tokenResult = await Notifications.getExpoPushTokenAsync({
          projectId: "c58bd2bc-2b46-4518-a238-6e981d88470a",
        });

        if (tokenResult?.data) {
          console.log("Successfully generated push token");
          return tokenResult.data;
        }

        throw new Error("Invalid token response");
      } catch (e) {
        error = e;
        attempts++;
        if (attempts < 3) {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // If all attempts failed
    console.error("Failed to get push token after 3 attempts:", error);
    throw new Error(
      "Device initialization failed. Please ensure:\n" +
        "1. Notifications are enabled\n" +
        "2. App has required permissions\n" +
        "3. Device is connected to the internet\n" +
        "4. Battery saver is not restricting the app"
    );
  } catch (error) {
    console.error("Error in getOrGenerateExpoPushToken:", error);
    throw error;
  }
}

// Update the main token handling function
export async function handleTokens(isNewInstall = false) {
  try {
    let pushToken;

    if (isNewInstall) {
      pushToken = await getOrGenerateExpoPushToken();
    } else {
      // Try to get existing token first
      const existingToken = await AsyncStorage.getItem("expoPushToken");
      if (!existingToken) {
        pushToken = await getOrGenerateExpoPushToken();
      } else {
        pushToken = existingToken;
      }
    }

    // Generate new session token
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
      deviceInfo: {
        brand: Device.brand,
        model: Device.modelName,
        os: Platform.OS,
        version: Platform.Version,
      },
      lastUpdated: Date.now(),
    };

    await AsyncStorage.setItem("activeSession", JSON.stringify(sessionInfo));

    return {
      pushToken,
      sessionToken,
    };
  } catch (error) {
    console.error("Token handling error:", error);
    throw error;
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
