import { Stack } from "expo-router";

export default function OrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: {
          backgroundColor: "white",
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="order-details"
        options={{
          animation: "slide_from_right",
          presentation: "card"
        }}
      />
    </Stack>
  );
}
