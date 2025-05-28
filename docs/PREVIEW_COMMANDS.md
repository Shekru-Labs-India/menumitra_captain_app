# Preview Build and Update Commands

## Pre-build Checklist
1. Verify current branch is `main`:
```bash
git branch
```

2. Verify APP_ENV is 'dev' in `Screens/utils/ConstantFunctions.js`
3. Verify you're on the latest code:
```bash
git pull origin main
```

## Building Preview APK

### Basic Preview Build
```bash
eas build --profile preview --platform android
```

### Build with Auto-Submit (if needed)
```bash
eas build --profile preview --platform android --auto-submit
```

### Build with Clear Cache (if having build issues)
```bash
eas build --profile preview --platform android --clear-cache
```

## EAS Updates

### Push Regular Update
```bash
eas update --channel preview --message "Preview: [Feature description]"
```

### Push Update with Branch Specification
```bash
eas update --channel preview --branch main --message "Preview: [Feature description]"
```

### Push Update with Auto-Publish
```bash
eas update --channel preview --message "Preview: [Feature description]" --auto
```

## Verification Commands

### Check Update Status
```bash
eas update:list
```

### Check Build Status
```bash
eas build:list
```

### View Channel Details
```bash
eas channel:view preview
```

## Expected Results
1. Package Name: `com.menumitra.captainapp.preview`
2. App Name: Will show "(Preview)" suffix
3. API Endpoints: Will use `men4u.xyz`
4. Update Channel: Will receive updates from preview channel only

## Troubleshooting

If build fails:
```bash
# Clear cache and rebuild
eas build --profile preview --platform android --clear-cache

# Check build logs
eas build:list
eas build:view
```

If updates not received:
```bash
# Verify channel
eas channel:view preview

# Check update history
eas update:list

# Force republish last update
eas update:republish
```

## Notes
- Always build preview from main branch
- Keep APP_ENV as 'dev' in ConstantFunctions.js
- Use descriptive update messages
- Can be installed alongside production app 