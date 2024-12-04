import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function AuxLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: {
          backgroundColor: "white",
        },
        presentation: Platform.OS === "ios" ? "modal" : "card",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen 
        name="order-details"
      />
    </Stack>
  );
}
