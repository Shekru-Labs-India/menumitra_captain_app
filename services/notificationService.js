import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp } from "@firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform, DeviceEventEmitter } from "react-native";
import { getRestaurantId, getUserId } from "../Screens/utils/getOwnerData";
import { setupNotifications, handleTokens } from "./deviceToken";

export const CALL_WAITER_NOTIFICATION = "CALL_WAITER_NOTIFICATION";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      console.log("🔔 Received notification:", notification.request.content);

      const data = notification.request.content.data;
      if (data?.type === "call_waiter") {
        console.log("Call waiter notification received");
        DeviceEventEmitter.emit(CALL_WAITER_NOTIFICATION, {
          type: "call_waiter",
          callerName: data.caller_name || "Customer",
          message: data.message || "Waiter assistance needed",
        });
      }

      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });
}

class NotificationService {
  static async registerForPushNotifications() {
    try {
      // Initialize notifications first
      await setupNotifications();

      const { pushToken } = await handleTokens();

      if (!pushToken) {
        throw new Error("Failed to get push token");
      }

      // Store the complete token string
      await AsyncStorage.setItem("pushToken", pushToken);

      return pushToken;
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      return null;
    }
  }

  static async callWaiter() {
    try {
      const restaurantId = await getRestaurantId();
      const userId = await getUserId();
      const accessToken = await AsyncStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error("Access token not found");
      }

      console.log("🚀 Calling waiter API with:", {
        outlet_id: restaurantId,
        user_id: userId,
      });

      const response = await fetch(
        "https://men4u.xyz/common_api/call_waiter",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            outlet_id: restaurantId,
            user_id: userId,
          }),
        }
      );

      const data = await response.json();
      console.log("✅ API Response:", data);

      if (data.st === 1) {
        return {
          success: true,
          message: "Waiter has been notified",
        };
      }

      return {
        success: false,
        message: data.msg || "Failed to call waiter",
      };
    } catch (error) {
      console.error("❌ Error calling waiter:", error);
      return {
        success: false,
        message: "Error calling waiter: " + error.message,
      };
    }
  }

  static async createNotificationChannel() {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        sound: "notification.wav",
      });
    }
  }
}

// Initialize notification channel
NotificationService.createNotificationChannel().catch(console.error);

// Initialize notification service when imported
NotificationService.registerForPushNotifications().catch(console.error);

export default NotificationService;
