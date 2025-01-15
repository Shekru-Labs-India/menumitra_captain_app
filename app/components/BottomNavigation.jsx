import React from "react";
import { Tabs, usePathname } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

const BottomNavigation = () => {
  const pathname = usePathname();

  // Function to determine if a tab should be active
  const isTabActive = (tabPath) => {
    // For home tab
    if (tabPath === "index" && pathname === "/(tabs)") return true;

    // For staff tab and its sub-screens
    if (tabPath === "staff") {
      // Return false if we're on inventory or supplier related screens
      if (pathname.includes("inventory") || pathname.includes("suppliers")) {
        return false;
      }
      // Only return true for main staff screen and staff-specific screens
      return pathname === "/(tabs)/staff";
    }

    // For other main tabs
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
          href: "/orders",
          unmountOnBlur: true,
          listeners: ({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate("orders", { screen: "index" });
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
    </Tabs>
  );
};

export default BottomNavigation;
