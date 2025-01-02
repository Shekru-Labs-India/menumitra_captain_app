import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "@firebase/firestore";

export const sendNotificationToWaiter = async (orderDetails) => {
  try {
    const waiterId = "25"; // Prassanna's waiter_id
    const outletId = "5"; // Outlet ID
    const waiterName = "Prassanna"; // Waiter's name

    console.log(`Sending notification to ${waiterName} (ID: ${waiterId})`);

    // Send through Expo with custom sound
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: "ExponentPushToken[jGL2VvJ3tikj_B8kHhfarE]",
        title: "🔔 New Order Alert",
        body: `Table ${orderDetails.tableNumber} needs attention`,
        data: {
          screen: "Orders",
          orderId: orderDetails.order_id,
          waiterId: waiterId,
          waiterName: waiterName,
          tableNumber: orderDetails.tableNumber,
        },
        sound: "notification.wav", // Custom sound file
        priority: "high",
        badge: 1,
        channelId: "orders", // Android notification channel
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
        data: {
          screen: "Orders",
          orderId: orderDetails.order_id,
          tableNumber: orderDetails.tableNumber,
          outletId: outletId,
        },
        isRead: false,
        createdAt: serverTimestamp(),
        outletId: outletId,
        waiterId: waiterId,
        waiterName: waiterName,
        status: "sent",
      }
    );

    return {
      success: true,
      message: `Notification sent to ${waiterName}`,
      notificationId: notificationRef.id,
      waiterName: waiterName,
    };
  } catch (error) {
    console.error("Error sending notification:", error);
    return {
      success: false,
      message: `Failed to send notification to waiter`,
      error: error.message,
    };
  }
};
