# MenuMitra Captain App - Setup Report
Date: May 28, 2024

## 1. Environment Configuration Status

### 1.1 Branch Structure
- **Main Branch**: Development/Preview environment
- **Production Branch**: Stable/Production environment

### 1.2 Environment Variables
Location: `Screens/utils/ConstantFunctions.js`
```javascript
export const APP_ENV = 'dev'; // Changes to 'prod' for production

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
```

### 1.3 Package Names
- Preview: `com.menumitra.captainapp.preview`
- Production: `com.menumitra.captainapp`

## 2. Configuration Files

### 2.1 Dynamic Configuration (app.config.js)
```javascript
const { APP_ENV } = require('./Screens/utils/ConstantFunctions');

module.exports = ({ config }) => {
  const buildType = process.env.EAS_BUILD_PROFILE || 'development';
  const basePackageName = 'com.menumitra.captainapp';
  
  // Dynamic package name based on environment
  const packageName = buildType === 'production' && APP_ENV === 'prod'
    ? basePackageName 
    : `${basePackageName}.preview`;

  // Visual differentiation in app name
  const appNameSuffix = APP_ENV === 'prod' ? '' : ' (Preview)';
  
  // Configuration returns
  return {
    name: `${config.name}${appNameSuffix}`,
    android: { package: packageName },
    updates: { channel: APP_ENV === 'prod' ? 'production' : 'preview' }
  };
};
```

### 2.2 EAS Build Configuration (eas.json)
```json
{
  "build": {
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
  }
}
```

## 3. Environment Matrix

| Aspect          | Preview (Main Branch) | Production Branch |
|-----------------|----------------------|-------------------|
| APP_ENV         | dev                  | prod             |
| Package Name    | .preview suffix      | base name        |
| API Endpoints   | men4u.xyz           | menusmitra.xyz   |
| Update Channel  | preview              | production       |
| Build Profile   | preview              | production       |
| App Name Suffix | (Preview)            | none             |

## 4. Update Channels Status

- **Preview Channel**: ✅ Configured
- **Production Channel**: ✅ Configured

## 5. Build Commands

### 5.1 Preview Build
```bash
git checkout main
# Ensure APP_ENV = 'dev' in ConstantFunctions.js
eas build --profile preview --platform android
```

### 5.2 Production Build
```bash
git checkout production
git pull origin main
# Change APP_ENV to 'prod' in ConstantFunctions.js
eas build --profile production --platform android
```

## 6. Update Commands

### 6.1 Preview Updates
```bash
# On main branch
eas update --channel preview --message "Preview: feature description"
```

### 6.2 Production Updates
```bash
# On production branch
eas update --channel production --message "Release: version description"
```

## 7. Verification Checklist

### 7.1 Configuration Files
- ✅ app.config.js: Dynamic configuration
- ✅ eas.json: Build profiles
- ✅ ConstantFunctions.js: Environment variables

### 7.2 Package Names
- ✅ Preview: com.menumitra.captainapp.preview
- ✅ Production: com.menumitra.captainapp

### 7.3 Update Channels
- ✅ Preview channel configured
- ✅ Production channel configured

### 7.4 API Endpoints
- ✅ Preview: men4u.xyz
- ✅ Production: menusmitra.xyz

## 8. Release Process

1. Development on main branch
   - APP_ENV = 'dev'
   - Preview builds and updates
   - Testing with development APIs

2. Production Release
   - Pull from main to production branch
   - Change APP_ENV to 'prod'
   - Build production APK
   - Push updates to production channel

## 9. Maintenance Notes

1. **Version Control**
   - Keep APP_ENV as 'dev' in main branch
   - Update APP_ENV to 'prod' in production branch
   - Tag production releases with version numbers

2. **Update Channels**
   - Preview updates only go to preview channel
   - Production updates only go to production channel

3. **API Endpoints**
   - Preview builds use development APIs
   - Production builds use production APIs

## 10. Security Considerations

1. **API Access**
   - Different endpoints for dev/prod
   - Separate credentials per environment

2. **Build Security**
   - Production builds use local credentials
   - Preview builds are internal distribution

---

Report generated for MenuMitra Captain App
Last verified: May 28, 2024 