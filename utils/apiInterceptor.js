import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Function to handle unauthorized responses
const handleUnauthorizedResponse = async () => {
  try {
    // Clear all stored credentials/tokens
    await AsyncStorage.multiRemove([
      "access",
      "refresh",
      "user_id",
      "captain_id",
      "outlet_id",
      "userSession",
      "device_token"
      // Add any other relevant keys you're storing
    ]);

    // Navigate to login screen
    router.replace("/login");
  } catch (error) {
    console.error("Error handling unauthorized response:", error);
    // Fallback navigation if clearing storage fails
    router.replace("/login");
  }
};

// Wrapper function for API calls
export const fetchWithAuth = async (url, options = {}) => {
  try {
    const [accessToken, deviceToken] = await AsyncStorage.multiGet(["access", "device_token"]);
    
    // Initialize headers if not already set
    options.headers = options.headers || {};
    
    // Add authorization header if token exists
    if (accessToken[1]) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${accessToken[1]}`,
      };
    }
    
    // Add device token to headers
    if (deviceToken[1]) {
      options.headers = {
        ...options.headers,
        "X-Device-Token": deviceToken[1]
      };
    }
    
    // For POST requests, add device_token to the body if it's JSON
    if (options.method === 'POST' && options.body && deviceToken[1]) {
      try {
        const bodyJson = JSON.parse(options.body);
        // Only add device_token if it doesn't already exist
        if (!bodyJson.device_token) {
          bodyJson.device_token = deviceToken[1];
          options.body = JSON.stringify(bodyJson);
        }
      } catch (e) {
        // If body is not valid JSON, just continue
        console.log("Request body is not JSON, skipping device_token addition");
      }
    }

    const response = await fetch(url, options);
    
    if (response.status === 401) {
      await handleUnauthorizedResponse();
      throw new Error("Unauthorized access. Please login again.");
    }

    const data = await response.json();
    
    if (data?.status === 401 || data?.st === 401) {
      await handleUnauthorizedResponse();
      throw new Error("Unauthorized access. Please login again.");
    }

    return data;
  } catch (error) {
    if (error.message === "Unauthorized access. Please login again.") {
      throw error;
    }
    console.error("API Error:", error);
    throw new Error("Failed to fetch data");
  }
};

// Helper function to get common headers
export const getAuthHeaders = async () => {
  try {
    const [accessToken, deviceToken] = await AsyncStorage.multiGet(["access", "device_token"]);
    
    let headers = {
      "Content-Type": "application/json",
    };
    
    if (accessToken[1]) {
      headers.Authorization = `Bearer ${accessToken[1]}`;
    }
    
    if (deviceToken[1]) {
      headers["X-Device-Token"] = deviceToken[1];
    }
    
    return headers;
  } catch (error) {
    console.error("Error getting auth headers:", error);
    return {
      "Content-Type": "application/json",
    };
  }
};

// Example usage functions
