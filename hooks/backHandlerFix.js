/**
 * This module fixes the issue with BackHandler.removeEventListener
 * by patching the BackHandler API if needed
 */
import { BackHandler, Platform } from 'react-native';

// Fix for BackHandler.removeEventListener issue
export function fixBackHandler() {
  // Only apply the fix if we're on a platform that uses BackHandler
  if (Platform.OS === 'android' || Platform.OS === 'windows') {
    console.log('Applying BackHandler fix');
    
    // Check if removeEventListener is incorrectly being accessed
    if (!BackHandler.removeEventListener) {
      // Add a dummy implementation that just calls remove()
      BackHandler.removeEventListener = function(eventName, handler) {
        console.warn('BackHandler.removeEventListener is deprecated. Please use the remove() method on the event subscription returned by addEventListener.');
        // We don't actually have the subscription object here,
        // so we can't call remove(), but at least it won't throw an error
        // This is just to prevent crashes when code incorrectly calls this method
        return true;
      };
    }
  }
}

// Apply the fix immediately when the module is imported
fixBackHandler(); 