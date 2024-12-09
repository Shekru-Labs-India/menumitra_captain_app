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
  Pressable,
  Fab,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../components/Header";

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
  const [sortOrder, setSortOrder] = useState("asc");
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
        const mappedItems = data.lists.map((item) => ({
          id: item.inventory_id,
          name: item.name,
          category: item.type, // Ensure this matches your data structure
          quantity: item.quantity,
          inventory_id: item.inventory_id,
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
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort function
  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "quantity":
        comparison = b.quantity - a.quantity;
        break;
      case "type":
        comparison = a.category.localeCompare(b.category);
        break;
      default:
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
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
                {item.category}
              </Badge>
            </HStack>

            <HStack space={4} alignItems="center">
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
      <Header title="Inventory Items" />
      {/* Search and View Toggle Bar */}
      <HStack
        px={4}
        py={2}
        alignItems="center"
        justifyContent="flex-end"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
        bg="coolGray.50"
      >
        <HStack space={2} alignItems="center">
          <Input
            w="40%"
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            InputLeftElement={
              <MaterialIcons
                name="search"
                size={24}
                color="gray.400"
                style={{ marginLeft: 8 }}
              />
            }
          />
          <IconButton
            icon={
              <MaterialIcons
                name={viewType === "list" ? "grid-view" : "view-list"}
                size={24}
                color="coolGray.600"
              />
            }
            onPress={() => setViewType(viewType === "list" ? "grid" : "list")}
          />
          <Select
            w="110"
            selectedValue={sortBy}
            onValueChange={setSortBy}
            placeholder="Sort by"
            _selectedItem={{
              endIcon: <MaterialIcons name="check" size={4} />,
            }}
            defaultValue=""
            alignSelf="center"
          >
            <Select.Item label="Name" value="name" />
            <Select.Item label="Quantity" value="quantity" />
            <Select.Item label="Type" value="type" />
          </Select>
          <IconButton
            icon={
              <MaterialIcons
                name={sortOrder === "asc" ? "arrow-upward" : "arrow-downward"}
                size={24}
                color="coolGray.600"
              />
            }
            onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          />
        </HStack>
      </HStack>

      <FlatList
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

      {/* Floating Action Button */}
      <Fab
        renderInPortal={false}
        colorScheme="green"
        icon={<MaterialIcons name="add" size={24} color="white" />}
        onPress={() => router.push("/(tabs)/staff/add-inventory-item")}
        placement="bottom-right"
      />
    </Box>
  );
}
