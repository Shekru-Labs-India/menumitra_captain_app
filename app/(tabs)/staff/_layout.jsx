import { Stack } from "expo-router";

export default function StaffLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="inventory"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="suppliers/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="suppliers/add"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="suppliers/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="suppliers/edit/[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
