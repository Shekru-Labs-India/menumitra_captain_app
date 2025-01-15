import { Stack } from "expo-router";

export default function SuppliersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          href: null,
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          href: null,
        }}
      />
      <Stack.Screen
        name="details/[id]"
        options={{
          href: null,
        }}
      />
    </Stack>
  );
}
