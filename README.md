# MenuMitra Captain App 👨‍✈️

A powerful restaurant management application built with [Expo](https://expo.dev) for restaurant captains and staff.

## Project Overview

MenuMitra Captain App is a comprehensive React Native/Expo mobile application designed for restaurant staff to efficiently manage orders, tables, and restaurant operations. Built with modern technologies and best practices in mind.

## Technical Stack

- **Core**: React Native v0.76.7, Expo SDK v52.0.36, React v18.3.1
- **Navigation**: Expo Router v4.0.16
- **Backend**: Firebase v11.1.0 (Firestore)
- **UI**: Native Base v3.4.28, Expo Vector Icons, Lottie Animations
- **Device Features**: BLE Integration, QR Code handling, Push Notifications

## Key Features

- 📱 Order Management System
- 🎯 Table Management
- 📸 QR Code Generation & Scanning
- 🖨️ Bluetooth Printer Integration
- 🔔 Push Notifications
- 🔒 Secure Storage
- 📁 File System Operations
- 📷 Media Management

## Getting Started

1. Install dependencies
   ```bash
   npm install
   ```

2. Start the development server
   ```bash
   npx expo start
   ```

3. Choose your development environment:
   - [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
   - [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
   - [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
   - [Expo Go](https://expo.dev/go)

## Project Structure

```
├── app/                 # Main application code
├── components/          # Reusable React components
├── context/            # React Context providers
├── hooks/              # Custom React hooks
├── services/           # API and service layer
├── utils/              # Utility functions
├── types/              # TypeScript definitions
├── constants/          # App constants
├── assets/             # Static assets
└── config/             # Configuration files
```

## Available Scripts

```bash
# Development
npm start                # Start development server
npm run android         # Run on Android
npm run ios            # Run on iOS
npm run web            # Run on Web

# Building
npm run build:android        # Build Android preview
npm run build:android-dev    # Build Android development
npm run build:android-prod   # Build Android production

# Maintenance
npm run reset-project       # Reset to fresh project
npm run clean:android      # Clean Android build
npm run clean:ios         # Clean iOS build
```

## Development Tools

- **Testing**: Jest with expo preset
- **Build**: EAS CLI v13.4.2
- **Development**: Expo Dev Client
- **Code Quality**: Babel with module resolver

## UI/UX Features

- 🎨 Modern UI Components
- 🎭 Custom Animations
- 📱 Responsive Layouts
- 🔔 Toast Notifications
- 🖼️ Blur Effects
- 🎨 Linear Gradients
- 🤚 Gesture Handling

## Security Features

- 🔐 Secure Storage Implementation
- 💾 AsyncStorage for Data Persistence
- 🔑 Firebase Authentication Ready

## Learn More

- [Expo Documentation](https://docs.expo.dev/): Learn fundamentals and advanced topics
- [React Native Documentation](https://reactnative.dev)
- [Native Base Documentation](https://docs.nativebase.io)

## Community & Support

Join our community of developers:
- [Expo on GitHub](https://github.com/expo/expo)
- [Discord Community](https://chat.expo.dev)

## License

This project is proprietary software. All rights reserved.
