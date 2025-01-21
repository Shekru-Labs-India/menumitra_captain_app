import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp } from "@firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyTokenPairing } from "./DeviceTokenService";

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
