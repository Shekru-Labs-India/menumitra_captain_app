import { useEffect, useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';

/**
 * Custom hook to handle hardware back button presses consistently
 * @param {Function} customAction - Optional custom action to run on back press
 * @param {boolean} preventDefaultNavigation - Optional flag to prevent default navigation
 * @returns {Function} - Function to manually trigger the back action
 */
export const useBackButtonHandler = (customAction, preventDefaultNavigation = false) => {
  const navigation = useNavigation();
  
  // Create a consistent back action handler
  const handleBackAction = useCallback(() => {
    console.log('Back button handler triggered');
    
    // Run custom action if provided
    if (customAction && typeof customAction === 'function') {
      console.log('Executing custom back action');
      // Execute the custom action and ALWAYS return true to prevent default behavior
      // This is crucial - we want the custom action to fully control navigation
      customAction();
      return true;
    }
    
    // If we don't want to prevent default navigation and navigation is available
    if (!preventDefaultNavigation && navigation) {
      // Check if we can go back in the stack
      if (navigation.canGoBack()) {
        console.log('Default navigation: going back');
        navigation.goBack();
        return true;
      }
    }
    
    // Return the prevention flag if no custom action handled it
    return preventDefaultNavigation;
  }, [customAction, navigation, preventDefaultNavigation]);
  
  // Set up the hardware back button handler
  useEffect(() => {
    console.log('Setting up hardware back button handler');
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress', 
      handleBackAction
    );
    
    return () => {
      console.log('Removing hardware back button handler');
      backHandler.remove();
    };
  }, [handleBackAction]);
  
  // Return the handler so it can be used for header back buttons
  return handleBackAction;
}; 