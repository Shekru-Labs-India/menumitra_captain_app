import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp } from "@firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyTokenPairing } from "./DeviceTokenService";
import * as Notifications from "expo-notifications";
import { DeviceEventEmitter, Platform } from "react-native";

export const sendNotificationToWaiter = async ({
  order_number,
  order_id,
  tableNumber,
  outletId,
  token, // session token
  to, // push token
}) => {
  try {
    console.log("Verifying token pair:", {
      sessionToken: token,
      pushToken: to,
    });

    // First verify that this is a valid and current token pair
    const isValidPair = await verifyTokenPairing(token, to);
    if (!isValidPair) {
      console.log("Token pair verification failed");
      throw new Error(
        "Invalid or expired token pair. Please ensure you're using the current device's tokens."
      );
    }

    // Get the active session to double-check
    const activeSession = await AsyncStorage.getItem("activeSession");
    if (!activeSession) {
      throw new Error("No active session found");
    }

    const sessionInfo = JSON.parse(activeSession);
    if (
      sessionInfo.sessionToken !== token ||
      sessionInfo.expoPushToken !== to
    ) {
      console.log("Token mismatch with active session:", {
        providedSession: token,
        activeSession: sessionInfo.sessionToken,
        providedPush: to,
        activePush: sessionInfo.expoPushToken,
      });
      throw new Error("Tokens do not match active session");
    }

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: to,
        title: `Order #${order_number}`,
        body: `New order for Table ${tableNumber}`,
        sound: "default",
        priority: "high",
        data: {
          order_id,
          tableNumber,
          outletId,
          sessionToken: token,
          timestamp: Date.now(),
        },
      }),
    });

    const data = await response.json();
    console.log("Expo notification response:", data);

    if (data.errors) {
      throw new Error(data.errors[0]?.message || "Failed to send notification");
    }

    return {
      success: true,
      message: "Notification sent successfully",
    };
  } catch (error) {
    console.error("Error in sendNotificationToWaiter:", error);
    return {
      success: false,
      message: error.message || "Failed to send notification",
    };
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

export const CALL_WAITER_NOTIFICATION = "CALL_WAITER_NOTIFICATION";

// Hardcoded values for testing
const WAITER_PUSH_TOKEN = "ExponentPushToken[jGL2VvJ3tikj_B8kHhfarE]";
const TEST_OUTLET_ID = 1;
const TEST_USER_ID = 4;

// Skip notification setup on web platform
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      console.log(
        "🔔 [NotificationHandler] Received:",
        notification.request.content
      );

      const data = notification.request.content.data;
      if (data?.type === "call_waiter") {
        console.log(
          "📢 [NotificationHandler] Call waiter notification received"
        );
        DeviceEventEmitter.emit(CALL_WAITER_NOTIFICATION, {
          type: "call_waiter",
          callerName: data.caller_name || "Captain",
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
    // Skip registration on web
    if (Platform.OS === "web") {
      console.log("📱 Push notifications not supported on web");
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
        console.log("❌ Failed to get push notification permissions!");
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: "menumitra-waiter-app", // Your Expo project ID
      });

      console.log("📱 Push token generated:", tokenData.data);
      return tokenData.data;
    } catch (error) {
      console.error("❌ Error registering for push notifications:", error);
      return null;
    }
  }

  static async callWaiter() {
    try {
      console.log("🚀 Calling waiter API with:", {
        outlet_id: TEST_OUTLET_ID,
        user_id: TEST_USER_ID,
      });

      // First call the API
      const response = await fetch("https://men4u.xyz/common_api/call_waiter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outlet_id: TEST_OUTLET_ID,
          user_id: TEST_USER_ID,
        }),
      });

      const data = await response.json();
      console.log("✅ API Response:", data);

      if (data.st === 1) {
        // Send notification to waiter
        console.log("📤 Sending notification to waiter:", WAITER_PUSH_TOKEN);

        const pushResponse = await fetch(
          "https://exp.host/--/api/v2/push/send",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: WAITER_PUSH_TOKEN,
              title: "Table Assistance Required",
              body: "A table needs your assistance",
              data: {
                type: "call_waiter",
                outlet_id: TEST_OUTLET_ID,
                user_id: TEST_USER_ID,
                caller_name: "Captain",
                message: "Waiter assistance needed",
              },
              sound: "default",
              priority: "high",
            }),
          }
        );

        const pushResult = await pushResponse.json();
        console.log("📨 Push notification result:", pushResult);

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
        message: "Error calling waiter",
      };
    }
  }

  // Test method to verify notification works
  static async testNotification() {
    try {
      console.log("🧪 Testing notification to:", WAITER_PUSH_TOKEN);

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: WAITER_PUSH_TOKEN,
          title: "Test Notification",
          body: "This is a test notification",
          data: {
            type: "call_waiter",
            outlet_id: TEST_OUTLET_ID,
            user_id: TEST_USER_ID,
            caller_name: "Captain",
            message: "Test message",
          },
          sound: "default",
          priority: "high",
        }),
      });

      const result = await response.json();
      console.log("✅ Test notification result:", result);
      return result;
    } catch (error) {
      console.error("❌ Test notification error:", error);
      return null;
    }
  }
}

export { NotificationService };
// or
export default NotificationService;
