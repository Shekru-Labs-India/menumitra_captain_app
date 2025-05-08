import React from "react";
import { Tabs, usePathname, Link } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Box, HStack, Icon, Pressable, Text } from "native-base";

/**
 * Shared BottomNavigation component to be used across the app
 * This ensures a single source of truth for navigation
 */
const BottomNavigation = () => {
  const pathname = usePathname();
  
  // Helper function to determine if a path is active
  const isActive = (path) => {
    if (path === "/") return pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/index";
    return pathname.includes(path);
  };

  return (
    <HStack 
      bg="black" 
      alignItems="center" 
      safeAreaBottom
      height={16}
      width="100%"
      px={5}
      borderTopWidth={1}
      borderTopColor="gray.800"
      justifyContent="space-between"
      position="absolute"
      bottom={0}
    >
      <Link href="/(tabs)/" asChild>
        <Pressable flex={1} alignItems="center">
          <Icon 
            as={MaterialIcons} 
            name="home" 
            size={6} 
            color={isActive("/") ? "#0891b2" : "#6b7280"} 
          />
          <Text 
            fontSize="xs" 
            color={isActive("/") ? "#0891b2" : "#6b7280"}
          >Home</Text>
        </Pressable>
      </Link>
      
      <Link href="/(tabs)/staff" asChild>
        <Pressable flex={1} alignItems="center">
          <Icon 
            as={MaterialIcons} 
            name="people" 
            size={6} 
            color={isActive("/staff") ? "#0891b2" : "#6b7280"} 
          />
          <Text 
            fontSize="xs" 
            color={isActive("/staff") ? "#0891b2" : "#6b7280"}
          >Staff</Text>
        </Pressable>
      </Link>
      
      <Link href="/(tabs)/tables" asChild>
        <Pressable flex={1} alignItems="center">
          <Icon 
            as={MaterialIcons} 
            name="table-restaurant" 
            size={6} 
            color={isActive("/tables") ? "#0891b2" : "#6b7280"} 
          />
          <Text 
            fontSize="xs" 
            color={isActive("/tables") ? "#0891b2" : "#6b7280"}
          >Tables</Text>
        </Pressable>
      </Link>
      
      <Link href="/(tabs)/orders" asChild>
        <Pressable flex={1} alignItems="center">
          <Icon 
            as={MaterialIcons} 
            name="receipt" 
            size={6} 
            color={isActive("/orders") ? "#0891b2" : "#6b7280"} 
          />
          <Text 
            fontSize="xs" 
            color={isActive("/orders") ? "#0891b2" : "#6b7280"}
          >Orders</Text>
        </Pressable>
      </Link>
      
      <Link href="/(tabs)/profile" asChild>
        <Pressable flex={1} alignItems="center">
          <Icon 
            as={MaterialIcons} 
            name="account-circle" 
            size={6} 
            color={isActive("/profile") ? "#0891b2" : "#6b7280"} 
          />
          <Text 
            fontSize="xs" 
            color={isActive("/profile") ? "#0891b2" : "#6b7280"}
          >Profile</Text>
        </Pressable>
      </Link>
    </HStack>
  );
};

export default BottomNavigation;
