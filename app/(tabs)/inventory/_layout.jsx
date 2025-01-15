import { Stack } from "expo-router";

export default function InventoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="inventory-items"
        options={{
          href: null,
        }}
      />
      <Stack.Screen
        name="add-inventory-item"
        options={{
          href: null,
        }}
      />
      <Stack.Screen
        name="edit-inventory-item/[id]"
        options={{
          href: null,
        }}
      />
      <Stack.Screen
        name="inventory-item-details/[id]"
        options={{
          href: null,
        }}
      />
    </Stack>
  );
}
