import { useState } from "react";
import {
  Box,
  Heading,
  VStack,
  IconButton,
  Text,
  FlatList,
  HStack,
  Avatar,
  Fab,
  Pressable,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";

export default function InventoryScreen() {
  const router = useRouter();
  const [categories] = useState([
    {
      id: "1",
      name: "Suppliers",
      icon: "people",
      description: "Manage all suppliers",
      route: "/(tabs)/staff/suppliers",
    },
    // Add more categories if needed
  ]);

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      <Box
        px={4}
        py={3}
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
        bg="coolGray.50"
      >
        <HStack alignItems="center" justifyContent="space-between">
          <IconButton
            icon={
              <MaterialIcons name="arrow-back" size={24} color="coolGray.600" />
            }
            onPress={() => router.back()}
            variant="ghost"
            _pressed={{ bg: "gray.100" }}
            position="absolute"
            left={0}
            zIndex={1}
          />
          <Heading size="md" flex={1} textAlign="center">
            Inventory
          </Heading>
        </HStack>
      </Box>

      <FlatList
        data={categories}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(item.route)}>
            <Box
              bg="white"
              rounded="lg"
              shadow={1}
              mb={3}
              mx={4}
              p={4}
              borderWidth={1}
              borderColor="coolGray.200"
            >
              <HStack space={3} alignItems="center">
                <Avatar size="md" bg="cyan.500">
                  <MaterialIcons name={item.icon} size={24} color="white" />
                </Avatar>
                <VStack flex={1}>
                  <Text fontSize="lg" fontWeight="bold">
                    {item.name}
                  </Text>
                  <Text fontSize="sm" color="coolGray.600">
                    {item.description}
                  </Text>
                </VStack>
                <MaterialIcons
                  name="arrow-forward-ios"
                  size={20}
                  color="coolGray.400"
                />
              </HStack>
            </Box>
          </Pressable>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 16 }}
      />
    </Box>
  );
}
