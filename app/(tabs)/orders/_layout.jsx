import { Stack } from "expo-router";

export default function OrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="index"
    >
      <Stack.Screen
        name="index"
        options={{
          href: "/orders",
        }}
      />
      <Stack.Screen
        name="order-details"
        options={{
          href: null, // This makes it not directly accessible via URL/tab
        }}
      />
      <Stack.Screen
        name="create-order"
        options={{
          href: null, // This makes it not directly accessible via URL/tab
        }}
      />
    </Stack>
  );
}
