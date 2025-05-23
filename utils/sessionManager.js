import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAllCacheOnNewSession } from "./cachedAxios";

/**
 * Saves the device token from the OTP or login response
 * @param {string} deviceToken - The device token from API response
 */
export const saveDeviceToken = async (deviceToken) => {
  if (!deviceToken) {
    console.error("No device token provided");
    return;
  }
  
  try {
    // Get the old device token, if any
    const oldDeviceToken = await AsyncStorage.getItem("device_token");
    
    // Save the new device token
    await AsyncStorage.setItem("device_token", deviceToken);
    
    // If device token changed, clear all cached data to prevent data leakage across sessions
    if (oldDeviceToken !== deviceToken) {
      console.log("Device token changed, clearing cache");
      await clearAllCacheOnNewSession();
    }
  } catch (error) {
    console.error("Error saving device token:", error);
  }
};

/**
 * Gets the device token
 * @returns {Promise<string>} The device token
 */
export const getDeviceToken = async () => {
  try {
    return await AsyncStorage.getItem("device_token");
  } catch (error) {
    console.error("Error getting device token:", error);
    return null;
  }
};

/**
 * Clears the device token (e.g. on logout)
 */
export const clearDeviceToken = async () => {
  try {
    await AsyncStorage.removeItem("device_token");
  } catch (error) {
    console.error("Error clearing device token:", error);
  }
};

/**
 * Stores all data from OTP verification response
 * @param {Object} responseData - The OTP verification response data
 */
export const storeOTPResponseData = async (responseData) => {
  if (!responseData || !responseData.owner_data) {
    console.error("Invalid OTP response data");
    return;
  }
  
  try {
    const ownerData = responseData.owner_data;
    
    // Store authentication tokens
    await AsyncStorage.setItem("access_token", ownerData.access);
    await AsyncStorage.setItem("refresh_token", ownerData.refresh);
    
    // Store device token
    if (ownerData.device_token) {
      await saveDeviceToken(ownerData.device_token);
    }
    
    // Store user and outlet information
    await AsyncStorage.setItem("user_id", ownerData.user_id?.toString() || "");
    await AsyncStorage.setItem("owner_name", ownerData.owner_name || "");
    await AsyncStorage.setItem("outlet_id", ownerData.outlet_id?.toString() || "");
    await AsyncStorage.setItem("outlet_name", ownerData.outlet_name || "");
    
    // Store additional outlet details
    await AsyncStorage.setItem("outlet_address", ownerData.address || "");
    await AsyncStorage.setItem("outlet_mobile", ownerData.mobile || "");
    await AsyncStorage.setItem("upi_id", ownerData.upi_id || "");
    
    // Store outlet configuration
    const outletConfig = {
      gst: ownerData.gst,
      service_charges: ownerData.service_charges,
      is_open: ownerData.is_open,
    };
    await AsyncStorage.setItem("outlet_config", JSON.stringify(outletConfig));
    
    // Store app settings if available
    if (responseData.settings) {
      await AsyncStorage.setItem("app_settings", JSON.stringify(responseData.settings));
    }
    
    // Store owner data without sensitive information
    const ownerDataWithoutTokens = { ...ownerData };
    delete ownerDataWithoutTokens.access;
    delete ownerDataWithoutTokens.refresh;
    await AsyncStorage.setItem("owner_data", JSON.stringify(ownerDataWithoutTokens));
    
    console.log("All OTP response data stored successfully");
  } catch (error) {
    console.error("Error storing OTP response data:", error);
    throw error;
  }
}; 