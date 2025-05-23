import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WebService from "../Screens/utils/WebService";

const RestaurantContext = createContext();

export const RestaurantProvider = ({ children }) => {
  const [currentRestaurantId, setCurrentRestaurantId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize context with stored restaurant ID
  useEffect(() => {
    const initializeContext = async () => {
      try {
        const storedId = await AsyncStorage.getItem(WebService.OUTLET_ID);
        if (storedId) {
          setCurrentRestaurantId(parseInt(storedId, 10));
        }
        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing context:", error);
        setIsInitialized(true); // Set initialized even on error
      }
    };

    initializeContext();
  }, []);

  const switchRestaurant = async (newRestaurantId, restaurantName) => {
    try {
      // Get current owner_data to preserve authentication info
      const ownerDataString = await AsyncStorage.getItem('owner_data');
      let ownerData = {};
      
      if (ownerDataString) {
        // Parse existing data
        ownerData = JSON.parse(ownerDataString);
        
        // Update only the restaurant-specific fields
        ownerData.outlet_id = newRestaurantId.toString();
        ownerData.outlet_name = restaurantName;

        
        
        // Save updated data back to storage
        await AsyncStorage.setItem('owner_data', JSON.stringify(ownerData));
      }
      
      // Still update individual keys for redundancy
      await Promise.all([
        AsyncStorage.setItem(WebService.OUTLET_ID, newRestaurantId.toString()),
        AsyncStorage.setItem(WebService.OUTLET_NAME, restaurantName)
      ]);
      
      // Update context state
      setCurrentRestaurantId(parseInt(newRestaurantId, 10));
      setRefreshTrigger(Date.now());
      
      return true;
    } catch (error) {
      console.error("Error switching restaurant:", error);
      throw error;
    }
  };

  return (
    <RestaurantContext.Provider
      value={{
        currentRestaurantId,
        refreshTrigger,
        switchRestaurant,
        isInitialized,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error("useRestaurant must be used within a RestaurantProvider");
  }
  return context;
};
