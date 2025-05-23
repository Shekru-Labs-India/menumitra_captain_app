import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";
import { onGetProductionUrl } from "../Screens/utils/ConstantFunctions";

// Create an axios instance with default config
const axiosInstance = axios.create();

// Add a request interceptor to automatically add device_token to all requests
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Get the device token from AsyncStorage
      const deviceToken = await AsyncStorage.getItem("device_token");
      
      // If device token exists, add it to the request data
      if (deviceToken) {
        // For POST requests, add to the request body
        if (config.method === 'post' && config.data) {
          // Handle different types of request data
          if (typeof config.data === 'string') {
            try {
              const data = JSON.parse(config.data);
              data.device_token = deviceToken;
              config.data = JSON.stringify(data);
            } catch (e) {
              // If not valid JSON, append as new param
              config.data = config.data + `&device_token=${deviceToken}`;
            }
          } else if (config.data instanceof FormData) {
            config.data.append('device_token', deviceToken);
          } else if (typeof config.data === 'object') {
            config.data.device_token = deviceToken;
          }
        }
        
        // For GET requests, add to query params
        if (config.method === 'get' && config.params) {
          config.params.device_token = deviceToken;
        } else if (config.method === 'get') {
          config.params = { device_token: deviceToken };
        }
      }
      
      return config;
    } catch (error) {
      console.error("Error in request interceptor:", error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Check if response has st=5, which also requires logout
    if (response.data && response.data.st === 5) {
      handleUnauthorized();
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);

// Centralized function to handle unauthorized access or session expiry
const handleUnauthorized = async () => {
  try {
    // Get user_id before clearing storage
    const ownerData = await AsyncStorage.getItem("owner_data");
    let userId = null;
    
    if (ownerData) {
      try {
        const userData = JSON.parse(ownerData);
        userId = userData?.user_id;
      } catch (e) {
        console.error("Error parsing owner data:", e);
      }
    }
    
    // If no userId from owner_data, try to get it directly
    if (!userId) {
      userId = await AsyncStorage.getItem("user_id");
    }
    
    // Try to call logout API if we have a user ID - using same approach as MyProfileView.js
    if (userId) {
      try {
        // Create a new instance to avoid interceptors that might cause infinite loops
        const freshAxios = axios.create();
        await freshAxios.post(
          onGetProductionUrl() + "logout",
          {
            user_id: userId,
            role: "captain",
            app: "captain",
          }
        );
        console.log("Logout API called successfully");
      } catch (logoutError) {
        console.error("Error calling logout API:", logoutError);
        // Continue with logout process even if API call fails
      }
    }
    
    // Clear all stored data
    const keys = [
      "owner_data",
      "access_token",
      "refresh_token",
      "restaurant_id",
      "user_id",
      "expoPushToken",
      "sessionToken",
      "tokenTimestamp",
      "device_token",
      "push_token",
      "app_settings",
      "outlet_config",
      "outlet_name",
      "outlet_address",
      "outlet_mobile",
      "upi_id"
    ];
    await AsyncStorage.multiRemove(keys);
    
    // Navigate to login screen
    if (global.navigationRef?.current) {
      global.navigationRef.current.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
    }
  } catch (e) {
    console.error("Error during forced logout:", e);
    
    // Fallback: try to clear all storage and navigate anyway
    try {
      await AsyncStorage.clear();
      if (global.navigationRef?.current) {
        global.navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Login" }],
          })
        );
      }
    } catch (clearError) {
      console.error("Error clearing storage:", clearError);
    }
  }
};

export default axiosInstance;
