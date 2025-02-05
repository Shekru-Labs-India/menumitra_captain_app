import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp } from "@firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyTokenPairing } from "./DeviceTokenService";
import * as Notifications from "expo-notifications";
import { DeviceEventEmitter, Platform } from "react-native";
import * as Device from "expo-device";
import { getBaseUrl } from "../config/api.config";
import { formatAlphanumericToken } from "./DeviceTokenService";

// Constants
export const CALL_WAITER_NOTIFICATION = "CALL_WAITER_NOTIFICATION";

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

class NotificationServiceClass {
  static async initialize() {
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
        return null;
      }

      return true;
    } catch (error) {
      console.error("Error initializing notifications:", error);
      return null;
    }
  }

  static async sendNotification(to, title, body, data = {}) {
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          title,
          body,
          data,
          sound: "default",
          priority: "high",
        }),
      });

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error("Error sending notification:", error);
      return { success: false, error: error.message };
    }
  }
}

export const sendNotificationToWaiter = async ({
  order_number,
  order_id,
  tableNumber,
  outletId,
  token,
  to,
}) => {
  try {
    console.log("Sending notification with params:", {
      order_number,
      tableNumber,
      outletId,
      token: token?.substring(0, 10) + "...", // Log partial token for security
    });

    const formattedTo = formatAlphanumericToken(to);
    console.log("Formatted destination token:", formattedTo);

    const message = {
      to: formattedTo,
      sound: "default",
      title: `Order #${order_number}`,
      body: `New order for Table ${tableNumber}`,
      data: {
        type: "new_order",
        order_id,
        tableNumber,
        outletId,
        sessionToken: token,
        timestamp: Date.now(),
      },
    };

    console.log("Sending notification payload:", message);

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log("Notification send result:", result);

    if (result.data?.status === "ok") {
      console.log("Notification sent successfully");
    } else {
      console.warn("Notification might not have been sent:", result);
    }

    return result;
  } catch (error) {
    console.error("Error sending notification:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message };
  }
};

export const sendCallWaiterNotification = async ({
  tableNumber,
  outletId,
  token,
  to,
}) => {
  try {
    const formattedTo = formatAlphanumericToken(to);

    const message = {
      to: formattedTo,
      sound: "default",
      title: "Call Waiter",
      body: `Table ${tableNumber} needs assistance`,
      data: {
        type: "call_waiter",
        tableNumber,
        outletId,
        sessionToken: token,
        timestamp: Date.now(),
      },
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log("Call waiter notification result:", result);
    return result;
  } catch (error) {
    console.error("Error sending call waiter notification:", error);
    return { success: false, error: error.message };
  }
};

// Add a helper function to verify current device tokens
export const verifyCurrentDeviceTokens = async (sessionToken, pushToken) => {
  try {
    const activeSession = await AsyncStorage.getItem("activeSession");
    if (!activeSession) {
      return {
        isValid: false,
        message: "No active session found",
      };
    }

    const sessionInfo = JSON.parse(activeSession);
    const isValid =
      sessionInfo.sessionToken === sessionToken &&
      sessionInfo.expoPushToken === pushToken;

    return {
      isValid,
      message: isValid
        ? "Tokens are valid for current device"
        : "Tokens do not match current device",
      deviceInfo: sessionInfo.deviceInfo,
    };
  } catch (error) {
    console.error("Error verifying device tokens:", error);
    return {
      isValid: false,
      message: "Error verifying tokens",
    };
  }
};

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

  static async callWaiter({ outletId, userId }) {
    try {
      const formattedPushToken = await AsyncStorage.getItem(
        "formattedPushToken"
      );
      if (!formattedPushToken) {
        throw new Error("Push token not found");
      }

      const response = await fetch(`${getBaseUrl()}/call_waiter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outlet_id: outletId,
          user_id: userId,
          token: formattedPushToken, // Send formatted token
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
}
