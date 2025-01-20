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

export async function getDeviceToken(forceNew = true) {
  try {
    // Get basic device info that works on both platforms
    const deviceName = (await Device.deviceName) || "";
    const deviceBrand = Device.brand || "";
    const timestamp = Date.now();

    // Generate a random component
    const randomPart = Math.random().toString(36).substring(2, 15);

    // Create a unique identifier that works on both platforms
    const uniqueToken = `${deviceBrand}-${timestamp}-${randomPart}`;

    // Get push token if possible
    let pushToken = null;
    if (Device.isDevice) {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === "granted") {
          const tokenResponse = await Notifications.getExpoPushTokenAsync({
            projectId: "c58bd2bc-2b46-4518-a238-6e981d88470a", // Replace with your actual project ID
          });
          pushToken = tokenResponse.data;
        }
      } catch (notificationError) {
        console.warn("Push notification error:", notificationError);
        // Continue without push token
      }
    }

    return {
      uniqueToken,
      pushToken,
    };
  } catch (error) {
    console.error("Error generating tokens:", error);
    // Return a fallback unique token even if there's an error
    const fallbackToken = `fallback-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    return {
      uniqueToken: fallbackToken,
      pushToken: null,
    };
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
