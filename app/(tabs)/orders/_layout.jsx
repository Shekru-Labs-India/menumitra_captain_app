import { Stack } from "expo-router";

export default function OrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          href: "/(tabs)/orders/",
        }}
      />
      <Stack.Screen
        name="order-details"
        options={{
          href: null,
        }}
      />
      <Stack.Screen
        name="create-order"
        options={{
          href: null,
        }}
      />
    </Stack>
  );
}
