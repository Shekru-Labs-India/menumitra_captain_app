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
    console.log("Starting token generation process...");

    if (!Device.isDevice) {
      console.log("Not a physical device");
      return null;
    }

    // Check if we already have a token
    const existingToken = await AsyncStorage.getItem("expoPushToken");
    if (existingToken) {
      console.log("Found existing push token:", existingToken);
    }

    // Request notification permissions with detailed error handling
    let finalStatus;
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      console.log("Current permission status:", existingStatus);

      finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        console.log("Requesting permissions...");
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log("New permission status:", status);
      }
    } catch (permError) {
      console.error("Permission request error:", permError);
      throw new Error(`Permission error: ${permError.message}`);
    }

    if (finalStatus !== "granted") {
      console.log("Permission not granted:", finalStatus);
      throw new Error("Failed to get notification permission");
    }

    // Get Expo Push Token with retry mechanism
    let retryCount = 0;
    let expoPushToken = null;

    while (retryCount < 3 && !expoPushToken) {
      try {
        console.log(`Attempting to get push token (attempt ${retryCount + 1})`);

        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId: "c58bd2bc-2b46-4518-a238-6e981d88470a",
        });

        expoPushToken = tokenResponse.data;
        console.log("Successfully got push token:", expoPushToken);
      } catch (tokenError) {
        console.error(
          `Token generation attempt ${retryCount + 1} failed:`,
          tokenError
        );
        retryCount++;

        if (retryCount === 3) {
          throw new Error(
            `Failed to get push token after ${retryCount} attempts`
          );
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Generate session token
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 15);
    const sessionToken = `session-${timestamp}-${randomPart}`;

    // Store the tokens
    try {
      await AsyncStorage.multiSet([
        ["expoPushToken", expoPushToken],
        ["sessionToken", sessionToken],
      ]);

      // Store session info
      const sessionInfo = {
        sessionToken,
        expoPushToken,
        deviceName: Device.deviceName || "Unknown Device",
        platform: Platform.OS,
        timestamp: timestamp,
        deviceInfo: {
          brand: Device.brand,
          modelName: Device.modelName,
          osVersion: Device.osVersion,
        },
      };

      await AsyncStorage.setItem("activeSession", JSON.stringify(sessionInfo));
      console.log("Successfully stored all tokens and session info");
    } catch (storageError) {
      console.error("Storage error:", storageError);
      throw new Error(`Failed to store tokens: ${storageError.message}`);
    }

    return {
      pushToken: expoPushToken,
      sessionToken: sessionToken,
    };
  } catch (error) {
    console.error("Token generation failed:", error);
    // Include more detailed error information
    const errorDetails = {
      message: error.message,
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version,
        brand: Device.brand,
        model: Device.modelName,
      },
      permissionStatus: await Notifications.getPermissionsAsync()
        .then((result) => result.status)
        .catch((err) => `Error getting status: ${err.message}`),
    };
    console.log("Error details:", errorDetails);

    throw new Error(
      `Token generation failed: ${error.message}\nDevice: ${Device.brand} ${Device.modelName}`
    );
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
