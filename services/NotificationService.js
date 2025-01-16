import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp } from "@firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const sendNotificationToWaiter = async (orderDetails) => {
  try {
    // Get the stored device token
    const deviceToken = await AsyncStorage.getItem("devicePushToken");
    if (!deviceToken) {
      throw new Error("Device token not found");
    }

    console.log("Using device token:", deviceToken);

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: deviceToken,
        title: "🔔 New Order Alert",
        body: `Table ${orderDetails.tableNumber} needs attention`,
        data: {
          screen: "Orders",
          orderId: orderDetails.order_id,
          tableNumber: orderDetails.tableNumber,
        },
        sound: "notification.wav",
        priority: "high",
        badge: 1,
        channelId: "orders",
      }),
    });

    const pushResult = await response.json();
    console.log("Push notification result:", pushResult);

    // Store in Firebase
    const notificationRef = await addDoc(
      collection(db, "waiter_notifications"),
      {
        title: "🔔 New Order Alert",
        body: `Table ${orderDetails.tableNumber} needs attention`,
        data: orderDetails,
        isRead: false,
        createdAt: serverTimestamp(),
        deviceToken: deviceToken,
        status: "sent",
      }
    );

    return {
      success: true,
      message: "Notification sent successfully",
      notificationId: notificationRef.id,
    };
  } catch (error) {
    console.error("Error sending notification:", error);
    return {
      success: false,
      message: "Failed to send notification",
      error: error.message,
    };
  }
};
