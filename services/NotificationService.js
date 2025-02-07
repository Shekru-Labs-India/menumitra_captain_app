import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { getBaseUrl } from "../config/api.config";

// Initialize Notifications
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      console.log("🔔 Received notification:", notification.request.content);
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });
}

export class NotificationService {
  static async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log("Must use physical device for Push Notifications");
      return null;
    }

    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token permissions");
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: "c58bd2bc-2b46-4518-a238-6e981d88470a",
      });

      return token.data;
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      return null;
    }
  }

  static async callWaiter({ outletId, userId, accessToken }) {
    try {
      const response = await fetch(`${getBaseUrl()}/call_waiter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          outlet_id: outletId,
          user_id: userId,
        }),
      });

      const data = await response.json();
      console.log("Call waiter response:", data);

      return {
        success: data.st === 1,
        message: data.msg || "Request processed",
      };
    } catch (error) {
      console.error("Error calling waiter:", error);
      return {
        success: false,
        message: "Error calling waiter",
      };
    }
  }

  static async testLocalNotification() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Local Notification",
          body: "If you see this, notifications are working!",
        },
        trigger: null, // null means send immediately
      });
      console.log("Local notification scheduled successfully");
    } catch (error) {
      console.error("Error scheduling local notification:", error);
    }
  }
}
