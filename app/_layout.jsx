import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { NativeBaseProvider, extendTheme } from "native-base";
import { SupplierProvider } from "../context/SupplierContext";
import { Slot, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VersionProvider } from "../context/VersionContext";
import { AuthProvider } from "../context/AuthContext";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Define your custom theme
const theme = extendTheme({
  colors: {
    primary: {
      50: "#e3f2f9",
      100: "#c5e4f3",
      200: "#a2d4ec",
      300: "#7ac1e4",
      400: "#47a9da",
      500: "#0a7ea4", // primary color
      600: "#007192",
      700: "#005c7a",
      800: "#004c64",
      900: "#003f54",
    },
  },
  config: {
    initialColorMode: "light",
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    boxicons: require("../assets/fonts/boxicons.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <VersionProvider>
        <SupplierProvider>
          <NativeBaseProvider>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="otp" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </ThemeProvider>
          </NativeBaseProvider>
        </SupplierProvider>
      </VersionProvider>
    </AuthProvider>
  );
}
