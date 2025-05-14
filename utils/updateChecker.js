import * as Updates from "expo-updates";
import { Alert } from "react-native";
import Constants from 'expo-constants';

/**
 * Checks if the app is running in Expo Go or as a standalone app
 * @returns {boolean} true if running in Expo Go
 */
export const isRunningInExpoGo = () => {
  return Constants.executionEnvironment === "storeClient";
};

/**
 * Checks for OTA updates via Expo Updates
 * @param {Object} options - Configuration options
 * @param {boolean} options.silent - If true, doesn't show alert dialogs (default: false)
 * @param {Function} options.onUpdateAvailable - Callback when update is available
 * @param {Function} options.onUpdateDownloaded - Callback when update is downloaded
 * @param {Function} options.onError - Callback when an error occurs
 * @param {Object} options.customStrings - Custom text for alert dialogs
 * @returns {Promise<{isAvailable: boolean, isDownloaded: boolean}>}
 */
export const checkForExpoUpdates = async ({
  silent = false,
  onUpdateAvailable = null,
  onUpdateDownloaded = null,
  onError = null,
  customStrings = null,
} = {}) => {
  // Skip update check in Expo Go
  if (isRunningInExpoGo()) {
    console.log("Update checking is not supported in Expo Go");
    return { isAvailable: false, isDownloaded: false };
  }

  // Default strings
  const strings = {
    updateAvailableTitle: "Update Available",
    updateAvailableMessage: "A new version of the app is available. Would you like to update now?",
    updateButton: "Update",
    laterButton: "Later",
    updateDownloadedTitle: "Update Downloaded",
    updateDownloadedMessage: "The update has been downloaded. The app will now restart to apply the changes.",
    okButton: "OK",
    errorTitle: "Error",
    errorMessage: "Failed to download update. Please try again later.",
    ...customStrings,
  };

  try {
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      if (onUpdateAvailable) {
        onUpdateAvailable(update);
      }
      
      if (!silent) {
        Alert.alert(
          strings.updateAvailableTitle,
          strings.updateAvailableMessage,
          [
            {
              text: strings.updateButton,
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  
                  if (onUpdateDownloaded) {
                    onUpdateDownloaded();
                  }
                  
                  if (!silent) {
                    Alert.alert(
                      strings.updateDownloadedTitle,
                      strings.updateDownloadedMessage,
                      [
                        {
                          text: strings.okButton,
                          onPress: async () => {
                            await Updates.reloadAsync();
                          },
                        },
                      ]
                    );
                  }
                } catch (error) {
                  console.log("Error downloading update:", error);
                  
                  if (onError) {
                    onError(error);
                  }
                  
                  if (!silent) {
                    Alert.alert(
                      strings.errorTitle,
                      strings.errorMessage
                    );
                  }
                }
              },
            },
            {
              text: strings.laterButton,
              style: "cancel",
            },
          ]
        );
      }
      
      return { isAvailable: true, isDownloaded: false };
    }
    
    return { isAvailable: false, isDownloaded: false };
  } catch (error) {
    console.log("Error checking for updates:", error);
    
    if (onError) {
      onError(error);
    }
    
    return { isAvailable: false, isDownloaded: false, error };
  }
};

/**
 * Immediately checks, downloads and applies update if available
 * @returns {Promise<boolean>} Whether update was applied
 */
export const applyExpoUpdateIfAvailable = async () => {
  if (isRunningInExpoGo()) {
    return false;
  }
  
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return true;
    }
    return false;
  } catch (error) {
    console.log("Error applying update:", error);
    return false;
  }
}; 