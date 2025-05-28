# Expo EAS Build Setup: Preview & Production Configuration

This documentation explains how to set up an Expo EAS project with separate preview and production builds that can be installed simultaneously on the same device.

## File Structure

```
your-app/
├── app.config.js        # Dynamic configuration file
├── app.config.json      # Base configuration
└── eas.json            # EAS build profiles
```

## 1. Dynamic Configuration Setup (app.config.js)

```javascript
module.exports = ({ config }) => {
  const buildType = process.env.EAS_BUILD_PROFILE || 'development';
  
  // Base package name - Change this for each app
  const basePackageName = 'com.menumitra.captainapp'; // e.g., com.menumitra.waiterapp
  
  // Determine package name based on build profile
  const packageName = buildType === 'production' 
    ? basePackageName 
    : `${basePackageName}.preview`;

  return {
    ...config,
    android: {
      ...config.android,
      package: packageName,
    },
    extra: {
      ...config.extra,
      buildType,
    },
  };
};
```

This file automatically sets the package name based on the build profile:
- Production: `com.menumitra.appname`
- Preview: `com.menumitra.appname.preview`

## 2. Base Configuration (app.config.json)

This file contains all the static configuration for your Expo app. Important sections:

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "android": {
      "newArchEnabled": true,
      "adaptiveIcon": {
        "foregroundImage": "./assets/icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        // Your required permissions
      ]
    },
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/YOUR-PROJECT-ID"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

Note: Don't include the `package` field in `app.config.json` as it's handled by `app.config.js`.

## 3. EAS Build Configuration (eas.json)

```json
{
  "cli": {
    "version": ">= 14.0.2",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "preview",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "android": {
        "buildType": "apk",
        "credentialsSource": "local"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

## 4. Update Channels

Two channels are required:
- `preview`: For testing builds
- `production`: For production releases

To check existing channels:
```bash
eas channel:list
```

To create channels if they don't exist:
```bash
eas channel:create preview
eas channel:create production
```

## 5. Building and Updating

### Building Apps

1. Preview Build:
```bash
eas build --profile preview --platform android
```

2. Production Build:
```bash
eas build --profile production --platform android
```

### Pushing Updates

1. Preview Updates:
```bash
eas update --channel preview --message "What's new in this update"
```

2. Production Updates:
```bash
eas update --channel production --message "What's new in this update"
```

## 6. Key Features

1. **Simultaneous Installation**: Both preview and production versions can be installed on the same device due to different package names.

2. **Automatic Package Names**:
   - Production: `com.menumitra.appname`
   - Preview: `com.menumitra.appname.preview`

3. **Separate Update Channels**:
   - Preview builds receive updates from preview channel
   - Production builds receive updates from production channel

## 7. Implementation Steps for New Apps

1. Copy the three configuration files (`app.config.js`, `app.config.json`, `eas.json`)
2. Update the base package name in `app.config.js`
3. Update app-specific configurations in `app.config.json`
4. Create the required update channels on expo.dev
5. Build and test both preview and production versions

## 8. Best Practices

1. Always test updates on preview builds first
2. Use meaningful update messages
3. Keep track of version numbers
4. Test both preview and production builds after setup
5. Verify update channels are working correctly for both builds

## 9. Troubleshooting

1. If updates aren't received:
   - Check the channel configuration in `eas.json`
   - Verify the update URL in `app.config.json`
   - Ensure the app has the correct package name

2. If builds fail:
   - Verify the project ID in `app.config.json`
   - Check the build profile configuration in `eas.json`
   - Ensure all required assets are present 