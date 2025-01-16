import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { usePathname } from "expo-router";

export default function TabLayout() {
  const pathname = usePathname();

  const isInventoryOrSuppliers =
    pathname.includes("/screens/inventory") ||
    pathname.includes("/screens/suppliers");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0891b2",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          display: isInventoryOrSuppliers ? "none" : "flex", // Hide tabBar for inventory/suppliers
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: "Staff",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tables"
        options={{
          title: "Tables",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="table-restaurant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="account-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
