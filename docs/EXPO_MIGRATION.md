# Expo Migration Guide - MenuMitra Captain App

This document outlines the migration process and configuration changes made to connect the local codebase with the Expo.dev project for MenuMitra Captain App.

## Project Identifiers

### Expo.dev Project Details
- Project Name: `MenuMitra Captain App`
- Project Slug: `menumitra-captain-app`
- Project ID: `c58bd2bc-2b46-4518-a238-6e981d88470a`
- Owner Account: `menumitra`
- Version: `1.2.1`
- Android Package: `com.menumitra.captainapp`

## Configuration Files Updated

### 1. app.json
```json
{
  "expo": {
    "name": "MenuMitra Captain App",
    "slug": "menumitra-captain-app",
    "version": "1.2.1",
    "owner": "menumitra",
    "extra": {
      "eas": {
        "projectId": "c58bd2bc-2b46-4518-a238-6e981d88470a"
      }
    },
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/c58bd2bc-2b46-4518-a238-6e981d88470a"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

### 2. eas.json
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
      "channel": "preview"
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
      "android": {
        "buildType": "apk",
        "credentialsSource": "local"
      },
      "channel": "preview"
    }
  }
}
```

## Project Separation and Safety Confirmation

This section confirms that this configuration is completely separate from the owner app and will not affect it in any way.

### Project Comparison

1. **Captain App Project (Current):**
   - Owner: `menumitra`
   - Project Name: `MenuMitra Captain App`
   - Slug: `menumitra-captain-app`
   - Project ID: `c58bd2bc-2b46-4518-a238-6e981d88470a`
   - Update URL: `https://u.expo.dev/c58bd2bc-2b46-4518-a238-6e981d88470a`

2. **Owner App Project (Separate):**
   - Owner: `wasims831`
   - Project Name: `MenuMitra`
   - Slug: `MenuMitra`
   - Project ID: `b5b6147e-860e-409c-8abb-40f7fc620d95`
   - Update URL: `https://u.expo.dev/b5b6147e-860e-409c-8abb-40f7fc620d95`

### Safety Confirmation

The following differences ensure complete separation between the two projects:

1. **Different Owner Accounts:**
   - Captain App uses `menumitra` account
   - Owner App uses `wasims831` account

2. **Different Project Identifiers:**
   - Unique Project IDs
   - Different slugs
   - Different package names
   - Separate update URLs

3. **Build and Update Safety:**
   - All EAS commands will only affect the captain app project
   - Updates are isolated to the captain app's preview channel
   - Builds are configured with captain-specific credentials

### Verification URLs
- Captain App: `https://expo.dev/accounts/menumitra/projects/menumitra-captain-app`
- Owner App: `https://expo.dev/accounts/wasims831/projects/MenuMitra`

## Update Channels
- Active Channel: `preview`
- Runtime Version: `1.2.1`
- Update Policy: `appVersion`

## Building APK

1. Initialize EAS for the project:
```bash
eas init --id c58bd2bc-2b46-4518-a238-6e981d88470a
```

2. Build Commands:
```bash
# Development build with development client
eas build --profile development --platform android

# Preview build (APK)
eas build --profile preview --platform android

# Production build (APK)
eas build --profile production --platform android
```

## EAS Updates

1. Push updates to the preview channel:
```bash
# Update preview channel (currently active)
eas update --channel preview
```

2. Check update status:
```bash
# View update history
eas update:list

# View channel details
eas channel:view preview
```

## Important Notes

1. **Version Management:**
   - App version: `1.2.1`
   - Runtime version follows app version (policy: "appVersion")
   - Version updates should be synchronized in app.json

2. **Android Package:**
   - Package name: `com.menumitra.captainapp`
   - Ensure this matches in Google Play Console

3. **Update Channel:**
   - All builds (development, preview, production) use the `preview` channel
   - This matches the current Expo.dev configuration

4. **Build Types:**
   - All Android builds are configured to generate APK files
   - Production builds use local credentials

## Troubleshooting

1. If builds fail, verify:
   - Correct project ID in initialization
   - Valid credentials in Expo.dev
   - Correct package name in app.json

2. If updates fail, check:
   - Channel exists and is active
   - Runtime version matches
   - Update URL is correct

## References

- Project URL: https://expo.dev/accounts/menumitra/projects/menumitra-captain-app
- Updates URL: https://u.expo.dev/c58bd2bc-2b46-4518-a238-6e981d88470a
- EAS Documentation: https://docs.expo.dev/eas/
