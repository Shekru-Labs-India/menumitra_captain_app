import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { useColorScheme, LogBox } from "react-native";
import { NativeBaseProvider, extendTheme } from "native-base";
import { SupplierProvider } from "../context/SupplierContext";
import { Slot } from "expo-router";
import { VersionProvider } from "../context/VersionContext";
import { AuthProvider } from "../context/AuthContext";
import { PrinterProvider } from '../context/PrinterContext';

// Ignore specific warnings to improve performance
LogBox.ignoreLogs([
  'NativeBase:',
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Keep your original theme but move it outside component
const theme = extendTheme({
  config: {
    // Disable unnecessary features
    useSystemColorMode: false,
    suppressColorAccessibilityWarning: true,
  }
});

// Memoize common configurations
const stackScreenOptions = {
  headerShown: false,
  animation: 'fade',
  animationDuration: 200,
};

// Optimize NativeBase configuration
const nativeBaseConfig = {
  isSSR: false,
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    boxicons: require("../assets/fonts/boxicons.ttf"),
  });

  // Memoize theme value to prevent unnecessary re-renders
  const themeValue = useMemo(() => 
    colorScheme === "dark" ? DarkTheme : DefaultTheme,
    [colorScheme]
  );

  useEffect(() => {
    if (fontsLoaded) {
      // Add a small timeout to ensure smooth transition
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NativeBaseProvider theme={theme} config={nativeBaseConfig}>
      <AuthProvider>
        <VersionProvider>
          <SupplierProvider>
            <PrinterProvider>
              <ThemeProvider value={themeValue}>
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                <Stack screenOptions={stackScreenOptions}>
                  <Stack.Screen 
                    name="index" 
                    options={{ freezeOnBlur: true }} 
                  />
                  <Stack.Screen 
                    name="login" 
                    options={{ freezeOnBlur: true }}
                  />
                  <Stack.Screen 
                    name="otp" 
                    options={{ freezeOnBlur: true }}
                  />
                  <Stack.Screen 
                    name="(tabs)" 
                    options={{ freezeOnBlur: true }}
                  />
                  <Stack.Screen 
                    name="screens" 
                    options={{ freezeOnBlur: true }}
                  />
                </Stack>
              </ThemeProvider>
            </PrinterProvider>
          </SupplierProvider>
        </VersionProvider>
      </AuthProvider>
    </NativeBaseProvider>
  );
}
