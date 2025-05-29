import { Platform, Keyboard } from "react-native";

// Define the environment variable at the top
export const APP_ENV = 'prod'; // Change this to 'prod' for production

// Define base URLs
const BASE_URLS = {
  dev: {
    common: 'https://men4u.xyz/1.3/common_api/',
    owner: 'https://men4u.xyz/1.3/captain_api/'
  },
  prod: {
    common: 'https://menusmitra.xyz/1.3/common_api/',
    owner: 'https://menusmitra.xyz/1.3/captain_api/'
  }
};

export const onGetProductionUrl = () => {
  return BASE_URLS[APP_ENV].common;
};

export const onGetOwnerUrl = () => {
  return BASE_URLS[APP_ENV].owner;
};

// Helper function to check if we're in development environment
export const isDevelopment = () => {
  return APP_ENV === 'dev';
};

export const handlePress = () => {
  if (Platform.OS === "web") {
    // No need to dismiss the keyboard on web
    return;
  }
  Keyboard.dismiss();
};

// Corrected API endpoints for offline sync
export const getApiEndpoints = () => {  
  const baseUrl = onGetProductionUrl();
  const ownerUrl = onGetOwnerUrl();
  
  return {
    // Reference data endpoints
    referenceData: `${baseUrl}reference_data`,
    categories: `${baseUrl}menu_category_listview`,
    foodTypes: `${baseUrl}get_food_type_list`,
    spicyLevels: `${baseUrl}get_spicy_index_list`,
    
    // Menu item endpoints - Corrected format
    menuList: `${baseUrl}menu_listview`,
    menuCreate: `${baseUrl}menu_create`,
    menuUpdate: `${baseUrl}menu_update`,
    menuDelete: `${baseUrl}menu_delete`,
    menuView: `${baseUrl}menu_view`,
    
    // Sync endpoints - Using correct format
    syncStatus: `${baseUrl}sync_status`,
    syncPush: `${baseUrl}menu_create`, // Same as menu creation endpoint
    syncUpdate: `${baseUrl}menu_update`, // Same as menu update endpoint
    syncDelete: `${baseUrl}menu_delete`, // Same as menu delete endpoint
    
    // AI endpoints
    aiGenerateDetails: `${baseUrl}ai_genrate_menu_details`,
    aiGenerateImage: `${baseUrl}ai_genrate_image_details`,
    
    // Health check
    healthCheck: `${baseUrl}health-check`
  };
};
