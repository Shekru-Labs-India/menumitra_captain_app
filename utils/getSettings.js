import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWithAuth } from './apiInterceptor';
import { getBaseUrl } from '../config/api.config';

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
};

/**
 * Fetch the latest settings directly from the API
 * @returns {Promise<Object>} The settings object
 */
export const fetchSettingsFromAPI = async () => {
  try {
    const outletId = await AsyncStorage.getItem('outlet_id');
    
    if (!outletId) {
      throw new Error('Missing outlet ID. Please login again.');
    }
    
    // Call the outlet_settings_view API using the captain app's authentication
    const response = await fetchWithAuth(`${getBaseUrl()}/outlet_settings_view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: outletId
      }),
    });

    if (response && response.st === 1) {
      const { data } = response;
      
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
      throw new Error(response?.msg || "Failed to fetch settings from API");
    }
  } catch (error) {
    console.error('Error fetching settings from API:', error);
    throw error;
  }
};

/**
 * Get settings - tries API first, then falls back to AsyncStorage
 * @returns {Promise<Object>} The settings object
 */
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
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS; // Return defaults on error
  }
};

/**
 * Save settings to AsyncStorage
 * @param {Object} settings - The settings object to save
 * @returns {Promise<boolean>} Success status
 */
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