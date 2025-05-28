npx expo start --go 

eas update --channel preview --message "changes"

I'll provide you a comprehensive list of commands for building and updating both preview and production versions:

### Building Commands

1. **Preview Build**
```bash
# Build Preview APK
eas build --profile preview --platform android

# Build Preview APK with auto-submit
eas build --profile preview --platform android --auto-submit
```

2. **Production Build**
```bash
# Build Production APK
eas build --profile production --platform android

# Build Production APK with auto-submit
eas build --profile production --platform android --auto-submit
```

### Update Commands

1. **Preview Updates**
```bash
# Update preview channel
eas update --channel preview

# Update preview with specific message
eas update --channel preview --message "what's new in this update"

# Update preview with specific branch
eas update --channel preview --branch preview-branch
```

2. **Production Updates**
```bash
# Update production channel
eas update --channel production

# Update production with specific message
eas update --channel production --message "what's new in this update"

# Update production with specific branch
eas update --channel production --branch main
```

### Channel Management

```bash
# List all channels
eas channel:list

# Create new channel (if needed)
eas channel:create preview
eas channel:create production

# View channel details
eas channel:view preview
eas channel:view production
```

### Build Status and History

```bash
# View build history
eas build:list

# View specific build details
eas build:view [BUILD_ID]

# Cancel ongoing build
eas build:cancel
```

### Update History and Status

```bash
# View update history
eas update:list

# View specific update details
eas update:view [UPDATE_ID]
```

### Best Practices:
1. **For Preview Builds/Updates:**
   - Use when testing new features
   - Package name: `com.menumitra.captainapp.preview`
   - Can be installed alongside production app

2. **For Production Builds/Updates:**
   - Use for stable releases
   - Package name: `com.menumitra.captainapp`
   - Always include a descriptive update message

3. **Version Management:**
   - Keep track of your app version in `app.json`
   - Use semantic versioning (e.g., 1.2.1)
   - Include meaningful update messages

4. **Before Building:**
   - Ensure all changes are committed
   - Test on preview before production
   - Check the target channel is correct

5. **After Updates:**
   - Verify the update is available
   - Test the update on actual devices
   - Monitor for any issues

Would you like me to explain any specific command in more detail or help you execute any of these commands?
