import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Pressable,
  Icon,
  StatusBar,
} from "native-base";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Platform } from "react-native";

export const Sidebar = ({ isOpen, onClose }) => {
  const menuItems = [
    {
      title: "Home",
      icon: "home-variant-outline",
      route: "/(tabs)",
    },
    {
      title: "Staff",
      icon: "account-group-outline",
      route: "/(tabs)/staff",
    },
    {
      title: "Orders",
      icon: "clipboard-list-outline",
      route: "/(tabs)/orders",
    },
    {
      title: "Profile",
      icon: "account-outline",
      route: "/(tabs)/profile",
    },
    {
      title: "Inventory",
      icon: "package-variant-closed",
      route: "/(tabs)/staff/inventory",
    },
    {
      title: "Inventory Report",
      icon: "file-document-outline",
      route: "/(tabs)/staff/inventory-report",
    },
    {
      title: "Order Report",
      icon: "clipboard-text-outline",
      route: "/(tabs)/staff/order-report",
    },
  ];

  const handleNavigation = (route) => {
    router.push(route);
    onClose();
  };

  const handleLogout = () => {
    router.replace("/login");
  };

  if (!isOpen) return null;

  return (
    <Box
      w="300"
      h="full"
      bg="white"
      position="absolute"
      top="0"
      right="0"
      pt={Platform.OS === "android" ? `${StatusBar.currentHeight}px` : "0"}
      shadow={5}
    >
      <HStack
        justifyContent="flex-end"
        p={4}
        borderBottomWidth={1}
        borderBottomColor="gray.200"
      >
        <IconButton
          onPress={onClose}
          icon={
            <Icon
              as={MaterialCommunityIcons}
              name="close"
              size={6}
              color="gray.600"
            />
          }
        />
      </HStack>

      <VStack flex={1} space={0}>
        {menuItems.map((item, index) => (
          <Pressable
            key={index}
            onPress={() => handleNavigation(item.route)}
            py={4}
            px={6}
            borderBottomWidth={1}
            borderBottomColor="gray.200"
          >
            <HStack space={4} alignItems="center">
              <Icon
                as={MaterialCommunityIcons}
                name={item.icon}
                size={6}
                color="gray.600"
              />
              <Text fontSize="md" color="gray.700">
                {item.title}
              </Text>
            </HStack>
          </Pressable>
        ))}
      </VStack>

      <Pressable
        onPress={handleLogout}
        py={4}
        px={6}
        borderTopWidth={1}
        borderTopColor="gray.200"
      >
        <HStack space={4} alignItems="center">
          <Icon
            as={MaterialCommunityIcons}
            name="logout-variant"
            size={6}
            color="red.500"
          />
          <Text fontSize="md" color="red.500">
            Logout
          </Text>
        </HStack>
      </Pressable>
    </Box>
  );
};
