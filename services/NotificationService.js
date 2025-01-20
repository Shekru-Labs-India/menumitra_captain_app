import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp } from "@firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const sendNotificationToWaiter = async (orderDetails) => {
  try {
    const { pushToken, uniqueToken } = orderDetails;

    if (!pushToken || !uniqueToken) {
      throw new Error("Both push token and unique token are required");
    }

    console.log("Sending notification with tokens:", {
      pushToken,
      uniqueToken,
    });

    const notificationData = {
      to: pushToken,
      title: "🔔 New Order Alert",
      body: `Table ${orderDetails.tableNumber} needs attention`,
      data: {
        screen: "Orders",
        orderId: orderDetails.order_id,
        tableNumber: orderDetails.tableNumber,
        deviceIdentifier: uniqueToken,
      },
      priority: "high",
      channelId: "orders",
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notificationData),
    });

    const pushResult = await response.json();
    console.log("Push notification result:", pushResult);

    // Store in Firebase
    const notificationRef = await addDoc(
      collection(db, "waiter_notifications"),
      {
        ...notificationData,
        isRead: false,
        createdAt: serverTimestamp(),
        pushToken,
        uniqueToken,
        status: pushResult.data?.status === "ok" ? "sent" : "failed",
      }
    );

    return {
      success: pushResult.data?.status === "ok",
      message:
        pushResult.data?.status === "ok"
          ? "Notification sent successfully"
          : "Failed to send notification",
      notificationId: notificationRef.id,
    };
  } catch (error) {
    console.error("Error in sendNotificationToWaiter:", error);
    return {
      success: false,
      message: error.message || "Failed to send notification",
    };
  }
};
