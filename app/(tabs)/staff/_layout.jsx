import { Stack } from "expo-router";

export default function StaffLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="staff/index" />
      <Stack.Screen name="staff/add" />
      <Stack.Screen name="staff/[id]" />
      <Stack.Screen name="staff/edit/[id]" />
    </Stack>
  );
}
