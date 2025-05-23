import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from './axiosConfig';
import { onGetProductionUrl } from "../Screens/utils/ConstantFunctions";
import { getRestaurantId } from '../Screens/utils/getOwnerData';

// Default settings to use if nothing is in storage
const DEFAULT_SETTINGS = {
  theme: 'system',
  style: 'blue',
  has_parcel: true,
  has_counter: true,
  has_delivery: true,
  has_drive_through: true,
  has_dine_in: true,
  POS_show_menu_image: true,
  print_and_save: true,
  KOT_and_save: true,
  settle: true,
  reserve_table: true,
  cancel: true,
  has_save: true,
};

// New function to fetch settings directly from API
export const fetchSettingsFromAPI = async () => {
  try {
    const restaurantId = await getRestaurantId();
    const accessToken = await AsyncStorage.getItem("access_token");
    
    if (!restaurantId || !accessToken) {
      throw new Error("Missing restaurant ID or access token");
    }
    
    // Call the outlet_settings_view API
    const response = await axiosInstance.post(
      onGetProductionUrl() + 'outlet_settings_view',
      {
        outlet_id: restaurantId
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.st === 1) {
      const { data } = response.data;
      
      // Format the API response data to match our settings structure
      const formattedSettings = {
        theme: data.theme || 'system',
        style: data.style || 'blue',
        has_parcel: data.has_parcel,
        has_counter: data.has_counter,
        has_delivery: data.has_delivery,
        has_drive_through: data.has_drive_through,
        has_dine_in: data.has_dine_in,
        POS_show_menu_image: data.POS_show_menu_image,
        print_and_save: data.print_and_save,
        KOT_and_save: data.KOT_and_save,
        settle: data.settle,
        reserve_table: data.reserve_table,
        cancel: data.cancel,
        has_save: data.has_save,
      };
      
      // Save to AsyncStorage for offline use
      await saveSettings(formattedSettings);
      
      return formattedSettings;
    } else {
      throw new Error(response.data?.msg || "Failed to fetch settings from API");
    }
  } catch (error) {
    console.error('Error fetching settings from API:', error);
    throw error;
  }
};

// Update getSettings to always try API first, then use stored settings as fallback
export const getSettings = async () => {
  try {
    // Always try to get from API first for most up-to-date settings
    try {
      const apiSettings = await fetchSettingsFromAPI();
      return apiSettings;
    } catch (apiError) {
      console.log('API settings fetch failed, using stored settings:', apiError);
      // If API fails, fall back to AsyncStorage
    }
    
    // Get from AsyncStorage as fallback
    const storedSettings = await AsyncStorage.getItem("app_settings");
    if (storedSettings) {
      return JSON.parse(storedSettings);
    }
    
    // If no settings found, save and return defaults
    await AsyncStorage.setItem("app_settings", JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS; // Return defaults on error
  }
};

// Add a simple save function
export const saveSettings = async (settings) => {
  try {
    // Convert settings object to string for storage
    const settingsString = JSON.stringify(settings);
    
    // Save to AsyncStorage
    await AsyncStorage.setItem("app_settings", settingsString);
    
    console.log("Settings saved to AsyncStorage:", settings);
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}; 