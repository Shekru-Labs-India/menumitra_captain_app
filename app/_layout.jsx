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

// Prevent the splash screen from auto-hiding before asset loading is complete.
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
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SupplierProvider>
      <NativeBaseProvider theme={theme}>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="+not-found"
              options={{ presentation: "modal" }}
            />
          </Stack>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </ThemeProvider>
      </NativeBaseProvider>
    </SupplierProvider>
  );
}
