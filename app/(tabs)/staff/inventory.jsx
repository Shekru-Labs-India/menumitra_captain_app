import { useState } from "react";
import {
  Box,
  Heading,
  VStack,
  IconButton,
  Icon,
  Text,
  FlatList,
  HStack,
  Avatar,
  Fab,
  Pressable,
} from "native-base";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";

export default function InventoryScreen() {
  const router = useRouter();
  const [categories] = useState([
    {
      id: "1",
      name: "Suppliers",
      icon: "people-outline",
      description: "Manage all suppliers",
      route: "/staff/suppliers",
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
        <IconButton
          position="absolute"
          left={2}
          top={2}
          icon={<Icon as={Ionicons} name="arrow-back" size={6} />}
          onPress={() => router.back()}
        />
        <Heading textAlign="center">Inventory</Heading>
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
                  <Icon as={Ionicons} name={item.icon} size={6} color="white" />
                </Avatar>
                <VStack flex={1}>
                  <Text fontSize="lg" fontWeight="bold">
                    {item.name}
                  </Text>
                  <Text fontSize="sm" color="coolGray.600">
                    {item.description}
                  </Text>
                </VStack>
                <IconButton
                  icon={
                    <Icon
                      as={MaterialIcons}
                      name="arrow-forward-ios"
                      size={5}
                      color="coolGray.400"
                    />
                  }
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
