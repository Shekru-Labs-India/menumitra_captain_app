import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "./axiosConfig";

// Cache expiration time (24 hours in milliseconds)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * Performs a cached request that:
 * 1. Returns cached data immediately if available (no loading state needed)
 * 2. Performs the actual API request in the background
 * 3. Updates the UI when fresh data arrives
 * 
 * @param {string} url - The API endpoint
 * @param {object} data - Request data/payload
 * @param {object} options - Additional options
 * @param {function} updateStateFn - Function to update state with new data
 */
export const cachedRequest = async (url, data, options = {}, updateStateFn) => {
  try {
    // Get device session ID to include in cache key
    const deviceSessionId = await AsyncStorage.getItem("device_sessid") || "no_session";
    
    // Generate a unique cache key based on URL, request data and session ID
    // This ensures cache is per-user based on their session
    const cacheKey = `cache_${url}_${JSON.stringify(data)}_${deviceSessionId}`;
    console.log("🔑 Cache key:", cacheKey);
    
    // Check if this is a real-time critical endpoint
    const isRealtimeCritical = url.includes("order_listview") || url.includes("order_");
    console.log("🕒 Is realtime critical endpoint:", isRealtimeCritical);
    
    // If real-time critical, use a much shorter expiry (5 minutes instead of 24 hours)
    const cacheExpiry = isRealtimeCritical ? 5 * 60 * 1000 : CACHE_EXPIRY;
    
    // Immediately initialize UI with an appropriate empty state if no cached data
    // This ensures the UI always renders something immediately
    let hasCachedData = false;
    let emptySent = false;
    
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        console.log("📦 Found cached data for:", url);
        const { data: cachedResponseData, timestamp } = JSON.parse(cachedData);
        
        // Check if cache is still valid
        const isExpired = Date.now() - timestamp > cacheExpiry;
        console.log("📦 Cache expired?", isExpired);
        
        // If cache is valid, update UI state immediately
        if (!isExpired && updateStateFn && cachedResponseData) {
          console.log("📦 Using valid cached data to update UI");
          updateStateFn(cachedResponseData);
          hasCachedData = true;
        } else {
          console.log("📦 Cache expired or invalid, will fetch fresh data");
          // Even if cache is expired, we can still use it temporarily to avoid showing loading state
          if (updateStateFn && cachedResponseData) {
            console.log("📦 Using expired cached data temporarily while fetching fresh data");
            updateStateFn(cachedResponseData);
            hasCachedData = true;
          }
        }
      } else {
        console.log("📦 No cached data found for:", url);
        
        // For first-time load with no cache, we need to provide a valid empty state
        // This prevents "No data" messages from flashing while data loads
        if (updateStateFn && !emptySent) {
          console.log("📦 Sending initial empty state to prevent loading indicators");
          
          // Create endpoint-specific empty states to avoid UI flicker
          if (url.includes("order_listview")) {
            updateStateFn({ st: 1, lists: [] });
          } else if (url.includes("menu_listview")) {
            updateStateFn({ st: 1, lists: [] });
          } else {
            // Default empty state for other endpoints
            updateStateFn({ st: 1, data: [] });
          }
          
          emptySent = true;
        }
      }
    } catch (cacheError) {
      console.error("📦 Error reading from cache:", cacheError);
      // Continue with the request even if cache reading fails
    }
    
    console.log("🔄 Fetching fresh data from API:", url);
    // Always fetch fresh data in the background
    // The device session ID will be automatically added by the request interceptor
    const response = await axiosInstance.post(url, data, options);
    console.log("🔄 Received response from API");
    
    if (response && response.data) {
      // Cache the fresh response
      try {
        const cacheEntry = {
          data: response.data,
          timestamp: Date.now()
        };
        
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
        console.log("💾 Saved fresh data to cache");
      } catch (saveError) {
        console.error("💾 Error saving to cache:", saveError);
        // Continue even if cache saving fails
      }
      
      // For real-time critical endpoints, always update UI with fresh data
      if (isRealtimeCritical || !hasCachedData) {
        console.log("🔄 Updating UI with fresh data (real-time critical or no cached data)");
        if (updateStateFn) {
          updateStateFn(response.data);
        }
      } else {
        // For non-critical endpoints, only update if data has changed
        try {
          const cachedData = await AsyncStorage.getItem(cacheKey);
          const cachedResponseData = JSON.parse(cachedData).data;
          
          if (JSON.stringify(response.data) !== JSON.stringify(cachedResponseData)) {
            console.log("🔄 Fresh data different from cache, updating UI");
            if (updateStateFn) {
              updateStateFn(response.data);
            }
          } else {
            console.log("🔄 Fresh data same as cached data, no UI update needed");
          }
        } catch (error) {
          // If comparison fails, update anyway
          console.log("🔄 Error comparing data, updating UI");
          if (updateStateFn) {
            updateStateFn(response.data);
          }
        }
      }
      
      return response;
    } else {
      console.warn("🔄 Empty or invalid response from API");
      
      // If we have valid cached data but API returned nothing, keep using the cached data
      if (hasCachedData) {
        console.log("🔄 Using cached data since API returned nothing");
        // No need to call updateStateFn again as we already did above
      } else if (updateStateFn && !emptySent) {
        // If we don't have cached data and API returned nothing, update with empty response
        console.log("🔄 No cached data and API returned nothing");
        updateStateFn(response?.data || null);
      }
      
      return response;
    }
  } catch (error) {
    console.error("❌ Cached request error:", error.message || error);
    
    // Check if we can return cached data even in case of API error
    try {
      const deviceSessionId = await AsyncStorage.getItem("device_sessid") || "no_session";
      const cacheKey = `cache_${url}_${JSON.stringify(data)}_${deviceSessionId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData && updateStateFn) {
        console.log("⚠️ API error, but using cached data as fallback");
        const { data: cachedResponseData } = JSON.parse(cachedData);
        updateStateFn(cachedResponseData);
      }
    } catch (cacheError) {
      console.error("⚠️ Couldn't read cache as fallback:", cacheError);
    }
    
    throw error;
  }
};

/**
 * Clears a specific cache entry
 * @param {string} url - The API endpoint
 * @param {object} data - Request data/payload that was used
 */
export const clearCache = async (url, data) => {
  try {
    const deviceSessionId = await AsyncStorage.getItem("device_sessid") || "no_session";
    const cacheKey = `cache_${url}_${JSON.stringify(data)}_${deviceSessionId}`;
    await AsyncStorage.removeItem(cacheKey);
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
};

/**
 * Clears all cached API responses for the current session
 */
export const clearAllCache = async () => {
  try {
    const deviceSessionId = await AsyncStorage.getItem("device_sessid") || "no_session";
    const keys = await AsyncStorage.getAllKeys();
    // Only clear caches for the current session
    const cacheKeys = keys.filter(key => key.startsWith('cache_') && key.includes(deviceSessionId));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
};

/**
 * Clears all cached data when device session changes
 * Call this when the user logs in and gets a new device session ID
 */
export const clearAllCacheOnNewSession = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error("Error clearing all cache:", error);
  }
}; 