import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const getDeviceToken = async () => {
  try {
    if (!Device.isDevice) {
      console.log("Must use physical device for Push Notifications");
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: "c58bd2bc-2b46-4518-a238-6e981d88470a",
    });

    // Store token in AsyncStorage
    await AsyncStorage.setItem("devicePushToken", token.data);
    console.log("Push token:", token.data);

    return token.data;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
};
