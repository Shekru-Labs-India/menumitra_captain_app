import { Stack } from "expo-router";

export default function StaffLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="add" />
      <Stack.Screen name="edit/[id]" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="inventory-items" />
    </Stack>
  );
}
