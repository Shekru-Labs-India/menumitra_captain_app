import React from "react";
import { Tabs, usePathname } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

const BottomNavigation = () => {
  const pathname = usePathname();

  // Function to determine if a tab should be active
  const isTabActive = (tabPath) => {
    // For home tab
    if (tabPath === "index") {
      return (
        pathname === "/(tabs)" ||
        pathname.startsWith("/screens/inventory") ||
        pathname.startsWith("/screens/suppliers")
      );
    }

    // For orders tab - explicitly check only index and order-details
    if (tabPath === "orders") {
      return pathname === "/(tabs)/orders" || 
             pathname === "/(tabs)/orders/index" || 
             pathname === "/(tabs)/orders/order-details";
    }

    // For other tabs
    return pathname === `/(tabs)/${tabPath}`;
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0891b2",
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          display:
            pathname.startsWith("/screens/inventory") ||
            pathname.startsWith("/screens/suppliers")
              ? "flex"
              : undefined,
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
            <MaterialIcons 
              name="receipt" 
              size={size} 
              color={pathname.includes("create-order") ? "#6b7280" : color} 
            />
          ),
          href: "/(tabs)/orders/",
          unmountOnBlur: true,
          tabBarActiveTintColor: isTabActive("orders") ? "#0891b2" : "#6b7280",
          listeners: ({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              // Always navigate to orders index, never to create-order
              navigation.navigate("/(tabs)/orders/");
            },
          }),
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
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarButton: () => null, // This hides the tab but keeps the screen in the navigation
        }}
      />
      <Tabs.Screen
        name="suppliers"
        options={{
          tabBarButton: () => null, // This hides the tab but keeps the screen in the navigation
        }}
      />
    </Tabs>
  );
};

export default BottomNavigation;
