import { Stack } from "expo-router";

export default function TablesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="sections/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sections/[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
