# Expo Update Checker Utility

This utility provides a standardized way to check for and apply Expo over-the-air (OTA) updates in the MenuMitra Captain App.

## Features

- Check if app is running in Expo Go environment
- Check for available OTA updates
- Display customizable update alerts
- Provides callbacks for update events
- Offers silent update checking

## Usage Examples

### Basic Usage

```javascript
import { checkForExpoUpdates } from "../utils/updateChecker";

// Check for updates with default alert dialogs
const checkForUpdates = async () => {
  await checkForExpoUpdates();
};
```

### Silent Update Check

```javascript
import { checkForExpoUpdates } from "../utils/updateChecker";

// Check for updates without showing any UI
const checkForSilentUpdates = async () => {
  const result = await checkForExpoUpdates({
    silent: true,
    onUpdateAvailable: (update) => {
      console.log("Update available:", update);
      // Show custom UI or handle silently
    }
  });
  
  if (result.isAvailable) {
    // Do something when update is available
  }
};
```

### Apply Updates Immediately

```javascript
import { applyExpoUpdateIfAvailable } from "../utils/updateChecker";

// Check, download and apply update in one go
const updateApp = async () => {
  const wasUpdated = await applyExpoUpdateIfAvailable();
  if (wasUpdated) {
    console.log("App was updated and restarted");
  } else {
    console.log("No update available or update failed");
  }
};
```

### Check If Running In Expo Go

```javascript
import { isRunningInExpoGo } from "../utils/updateChecker";

// Skip features not supported in Expo Go
if (!isRunningInExpoGo()) {
  // Run production-only code
} else {
  console.log("Running in Expo Go - some features disabled");
}
```

## API Reference

### `isRunningInExpoGo()`

Returns `true` if the app is running in Expo Go environment, `false` if running as a standalone app.

### `checkForExpoUpdates(options)`

Checks for OTA updates via Expo Updates and handles the update flow.

**Parameters:**
- `options` (Object, optional): Configuration options
  - `silent` (boolean): If true, doesn't show alert dialogs (default: false)
  - `onUpdateAvailable` (Function): Callback when update is available
  - `onUpdateDownloaded` (Function): Callback when update is downloaded
  - `onError` (Function): Callback when an error occurs

**Returns:**
- Promise resolving to `{isAvailable: boolean, isDownloaded: boolean, error?: Error}`

### `applyExpoUpdateIfAvailable()`

Immediately checks, downloads and applies an update if available.

**Returns:**
- Promise resolving to boolean indicating whether an update was applied

## Integration Guidelines

1. Import the utility in components that need update checking
2. Use `isRunningInExpoGo()` to conditionally skip update checks in Expo Go
3. Call `checkForExpoUpdates()` at appropriate times (app start, pull-to-refresh)
4. Consider using silent mode with custom UI for a more integrated experience

## Best Practices

- Don't check for updates too frequently (once per app start is usually sufficient)
- Handle errors gracefully to prevent crashes
- Only use `applyExpoUpdateIfAvailable()` when immediate updates are required
- Be mindful of user experience when forcing updates 