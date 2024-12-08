import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  VStack,
  IconButton,
  Text,
  FlatList,
  HStack,
  Badge,
  Spinner,
  useToast,
  Input,
  Select,
  SimpleGrid,
  Pressable,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function InventoryItemsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState(null);

  // Search, Sort, and View states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [viewType, setViewType] = useState("list"); // 'list' or 'grid'

  const { refresh } = useLocalSearchParams();

  useEffect(() => {
    getStoredData();
  }, [refresh]);

  const getStoredData = async () => {
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
      if (storedRestaurantId) {
        setRestaurantId(parseInt(storedRestaurantId));
        fetchInventoryItems(parseInt(storedRestaurantId));
      } else {
        toast.show({
          description: "Please login again",
          status: "error",
        });
        router.replace("/login");
      }
    } catch (error) {
      console.error("Error getting stored data:", error);
    }
  };

  const fetchInventoryItems = async (restId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/inventory_listview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restId,
          }),
        }
      );

      const data = await response.json();
      console.log("Inventory Response:", data);

      if (data.st === 1) {
        // Map API data to include all fields
        const mappedItems = data.lists.map((item) => ({
          id: item.inventory_id,
          name: item.name,
          supplierId: "", // Keeping existing fields with empty values
          description: "",
          category: item.type,
          price: "",
          quantity: item.quantity,
          serialNo: "",
          status: "in",
          brandName: "",
          tax: "",
          paymentStatus: "pending",
          orderId: "",
          restaurant_id: item.restaurant_id,
          inventory_id: item.inventory_id,
          type: item.type,
        }));
        setInventoryItems(mappedItems);
      } else {
        toast.show({
          description: data.msg || "Failed to fetch inventory items",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Fetch Inventory Error:", error);
      toast.show({
        description: "Failed to fetch inventory items",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Search function
  const filteredItems = inventoryItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort function
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "quantity":
        return b.quantity - a.quantity;
      case "type":
        return a.type.localeCompare(b.type);
      default:
        return 0;
    }
  });

  const handleItemPress = (item) => {
    router.push({
      pathname: "/(tabs)/staff/inventory-item-details",
      params: { itemId: item.inventory_id },
    });
  };

  const renderListItem = ({ item }) => (
    <Pressable onPress={() => handleItemPress(item)}>
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
        <HStack space={3} alignItems="center" justifyContent="space-between">
          <VStack flex={1} space={2}>
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontSize="lg" fontWeight="bold">
                {item.name}
              </Text>
              <Badge colorScheme="blue" rounded="full" variant="subtle">
                {item.type}
              </Badge>
            </HStack>

            <HStack space={4} alignItems="center">
              <HStack space={1} alignItems="center">
                <MaterialIcons name="inventory" size={16} color="gray.500" />
                <Text fontSize="sm" color="gray.500">
                  ID: #{item.inventory_id}
                </Text>
              </HStack>
              <HStack space={1} alignItems="center">
                <MaterialIcons name="layers" size={16} color="gray.500" />
                <Text fontSize="sm" color="gray.500">
                  Qty: {item.quantity}
                </Text>
              </HStack>
            </HStack>
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );

  const renderGridItem = ({ item }) => (
    <Pressable flex={1} m={1} onPress={() => handleItemPress(item)}>
      <Box
        bg="white"
        rounded="lg"
        shadow={1}
        p={4}
        borderWidth={1}
        borderColor="coolGray.200"
      >
        <VStack space={2} alignItems="center">
          <Box bg="blue.100" p={2} rounded="full" mb={2}>
            <MaterialIcons name="inventory" size={24} color="blue.500" />
          </Box>
          <Text fontSize="md" fontWeight="bold" textAlign="center">
            {item.name}
          </Text>
          <Badge colorScheme="blue" rounded="full">
            {item.type}
          </Badge>
          <Text fontSize="sm" color="gray.500">
            Qty: {item.quantity}
          </Text>
          <Text fontSize="xs" color="gray.400">
            ID: #{item.inventory_id}
          </Text>
        </VStack>
      </Box>
    </Pressable>
  );

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
        <Text mt={2}>Loading inventory items...</Text>
      </Box>
    );
  }

  return (
    <Box
      flex={1}
      bg="gray.100"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      {/* Header */}
      <Box px={4} py={3} bg="white" shadow={2}>
        <HStack alignItems="center" justifyContent="space-between">
          <IconButton
            icon={
              <MaterialIcons name="arrow-back" size={24} color="coolGray.600" />
            }
            onPress={() => router.back()}
            variant="ghost"
          />
          <Heading size="md" flex={1} textAlign="center">
            Inventory Items
          </Heading>
          <IconButton
            icon={<MaterialIcons name="add" size={24} color="coolGray.600" />}
            onPress={() => router.push("/(tabs)/staff/add-inventory-item")}
            variant="ghost"
          />
        </HStack>
      </Box>

      {/* Search and View Toggle Bar */}
      <HStack
        px={4}
        py={3}
        bg="white"
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
      >
        <Input
          placeholder="Search inventory items..."
          flex={1}
          size="sm"
          mr={3}
          value={searchQuery}
          onChangeText={setSearchQuery}
          InputLeftElement={
            <MaterialIcons
              name="search"
              size={20}
              color="gray"
              style={{ marginLeft: 8 }}
            />
          }
        />
        <HStack space={2} alignItems="center">
          <Select
            selectedValue={sortBy}
            minWidth={115}
            size="sm"
            onValueChange={setSortBy}
            _selectedItem={{
              bg: "coolGray.100",
            }}
          >
            <Select.Item label="Sort by Name" value="name" />
            <Select.Item label="Sort by Quantity" value="quantity" />
            <Select.Item label="Sort by Type" value="type" />
          </Select>
          <IconButton
            icon={
              <MaterialIcons
                name={viewType === "list" ? "grid-view" : "view-list"}
                size={24}
                color="coolGray.600"
              />
            }
            variant="ghost"
            onPress={() => setViewType(viewType === "list" ? "grid" : "list")}
          />
        </HStack>
      </HStack>

      {viewType === "list" ? (
        <FlatList
          key="list"
          data={sortedItems}
          renderItem={renderListItem}
          keyExtractor={(item) => item.inventory_id.toString()}
          contentContainerStyle={{ paddingVertical: 16 }}
          ListEmptyComponent={
            <Box flex={1} justifyContent="center" alignItems="center" mt={10}>
              <Text color="gray.500">No inventory items found</Text>
            </Box>
          }
        />
      ) : (
        <FlatList
          key="grid"
          data={sortedItems}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.inventory_id.toString()}
          numColumns={2}
          contentContainerStyle={{ padding: 8 }}
          ListEmptyComponent={
            <Box flex={1} justifyContent="center" alignItems="center" mt={10}>
              <Text color="gray.500">No inventory items found</Text>
            </Box>
          }
          columnWrapperStyle={{ justifyContent: "space-between" }}
        />
      )}
    </Box>
  );
}
