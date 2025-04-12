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
    // Initialize headers if not already set
    options.headers = options.headers || {};
    
    // Get tokens with retries for production reliability
    let retries = 3;
    let accessToken = null;
    let deviceToken = null;
    
    while (retries > 0 && (!accessToken || !deviceToken)) {
      try {
        const tokens = await AsyncStorage.multiGet(["access", "device_token"]);
        accessToken = tokens[0][1];
        deviceToken = tokens[1][1];
        
        if (!deviceToken) {
          // Try to get it from a secondary source if primary fails
          deviceToken = await AsyncStorage.getItem("expoPushToken");
        }
        
        // Log for debugging in production
        console.log(`Attempt ${4-retries}: Token status - Access: ${!!accessToken}, Device: ${!!deviceToken}`);
        
        if (accessToken && deviceToken) break;
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between retries
      } catch (e) {
        console.error("Token retrieval error:", e);
      }
      retries--;
    }
    
    // Add authorization header if token exists
    if (accessToken) {
      options.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // Add device token to headers AND query params for maximum compatibility
    if (deviceToken) {
      options.headers["X-Device-Token"] = deviceToken;
      
      // Also include in URL for GET requests
      if (!options.method || options.method === 'GET') {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}device_token=${encodeURIComponent(deviceToken)}`;
      }
      
      // For POST requests, ensure it's in the body
      if (options.method === 'POST' && options.body) {
        try {
          const bodyJson = JSON.parse(options.body);
          bodyJson.device_token = deviceToken;
          options.body = JSON.stringify(bodyJson);
        } catch (e) {
          console.log("Request body parse error, adding device_token failed");
        }
      }
    } else {
      console.warn("No device_token available for request to:", url);
    }

    // Log the complete request for debugging
    console.log(`Making request to ${url} with device_token: ${deviceToken?.substring(0, 10)}...`);

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
