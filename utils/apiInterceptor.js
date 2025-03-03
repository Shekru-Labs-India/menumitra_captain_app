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
      "userSession"
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
    const accessToken = await AsyncStorage.getItem("access");
    
    // Add authorization header if token exists
    if (accessToken) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      };
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
    const accessToken = await AsyncStorage.getItem("access");
    return {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
  } catch (error) {
    console.error("Error getting auth headers:", error);
    return {
      "Content-Type": "application/json",
    };
  }
};

// Example usage functions
