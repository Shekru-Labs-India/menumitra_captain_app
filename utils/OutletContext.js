import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebService from '../Screens/utils/WebService';

const OutletContext = createContext();

export const useOutlet = () => useContext(OutletContext);

export const OutletProvider = ({ children }) => {
  const [currentOutletId, setCurrentOutletId] = useState(null);
  const [isOutletChanged, setIsOutletChanged] = useState(false);

  useEffect(() => {
    // Load the initial outlet ID from AsyncStorage
    const loadOutletId = async () => {
      try {
        const outletId = await AsyncStorage.getItem(WebService.OUTLET_ID);
        if (outletId) {
          setCurrentOutletId(parseInt(outletId, 10));
        }
      } catch (error) {
        console.error('Error loading outlet ID:', error);
      }
    };
    
    loadOutletId();
  }, []);

  const updateOutletId = async (outletId, outletName) => {
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem(WebService.OUTLET_ID, outletId.toString());
      await AsyncStorage.setItem(WebService.OUTLET_NAME, outletName);
      
      // Update context state
      setCurrentOutletId(parseInt(outletId, 10));
      setIsOutletChanged(true);
      
      // Reset navigation to force a refresh of all screens
      if (global.navigationRef && global.navigationRef.current) {
        // Navigate to dashboard to refresh everything
        global.navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'DashboardScreen' }],
        });
      }
      
      // Reset the flag after a delay
      setTimeout(() => {
        setIsOutletChanged(false);
      }, 500);
      
      return true;
    } catch (error) {
      console.error('Error updating outlet ID:', error);
      return false;
    }
  };

  return (
    <OutletContext.Provider 
      value={{ 
        currentOutletId, 
        updateOutletId, 
        isOutletChanged 
      }}
    >
      {children}
    </OutletContext.Provider>
  );
}; 