import AsyncStorage from "@react-native-async-storage/async-storage";

// Keys for AsyncStorage
const RESTAURANT_CONFIG = {
  GST: "restaurant_gst",
  SERVICE_CHARGE: "restaurant_service_charge",
};

// Main function to get restaurant config - only uses stored values
export const getRestaurantConfig = async () => {
  try {
    const storedConfig = await getStoredRestaurantConfig();
    return storedConfig;
  } catch (error) {
    console.error("Error getting restaurant config:", error);
    return {
      gst: 0,
      service_charges: 0,
    };
  }
};

// Get stored values
export const getStoredRestaurantConfig = async () => {
  try {
    const [storedGst, storedService] = await Promise.all([
      AsyncStorage.getItem(RESTAURANT_CONFIG.GST),
      AsyncStorage.getItem(RESTAURANT_CONFIG.SERVICE_CHARGE),
    ]);

    return {
      gst: parseFloat(storedGst || "0"),
      service_charges: parseFloat(storedService || "0"),
    };
  } catch (error) {
    console.error("Error getting stored restaurant config:", error);
    return {
      gst: 0,
      service_charges: 0,
    };
  }
};

// Helper function to store config values
export const storeRestaurantConfig = async (gst, serviceCharges) => {
  try {
    await Promise.all([
      AsyncStorage.setItem(RESTAURANT_CONFIG.GST, gst.toString()),
      AsyncStorage.setItem(
        RESTAURANT_CONFIG.SERVICE_CHARGE,
        serviceCharges.toString()
      ),
    ]);
  } catch (error) {
    console.error("Error storing restaurant config:", error);
  }
};

// Add a function to clear stored config (useful when logging out)
export const clearStoredConfig = async () => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(RESTAURANT_CONFIG.GST),
      AsyncStorage.removeItem(RESTAURANT_CONFIG.SERVICE_CHARGE),
    ]);
  } catch (error) {
    console.error("Error clearing stored config:", error);
  }
};
