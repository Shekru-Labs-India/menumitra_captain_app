import { useState, useEffect, useCallback } from "react";
import {
  Box,
  FlatList,
  HStack,
  VStack,
  Text,
  Pressable,
  Badge,
  Fab,
  useToast,
  Spinner,
  Input,
  Icon,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../components/Header";
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";
import BottomNavigation from "../../components/BottomNavigation";

export default function InventoryItemsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useLocalSearchParams();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [outletId, setOutletId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurantName, setRestaurantName] = useState("");

  useEffect(() => {
    getStoredData();
  }, [refresh]);

  // Get restaurant name from AsyncStorage
  const getRestaurantName = useCallback(async () => {
    try {
      const name = await AsyncStorage.getItem("outlet_name");
      if (name) {
        setRestaurantName(name);
      }
    } catch (error) {
      console.error("Error getting restaurant name:", error);
    }
  }, []);

  // Call getRestaurantName when component mounts
  useEffect(() => {
    getRestaurantName();
  }, [getRestaurantName]);

  // Add search filter effect
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(
        (item) =>
          (item.name?.toLowerCase() || "").includes(
            searchQuery.toLowerCase()
          ) ||
          (item.brand_name?.toLowerCase() || "").includes(
            searchQuery.toLowerCase()
          )
      );
      setFilteredItems(filtered);
    }
  }, [searchQuery, items]);

  const getStoredData = async () => {
    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      if (storedOutletId) {
        setOutletId(storedOutletId);
        fetchInventoryItems(storedOutletId);
      } else {
        toast.show({
          description: "Please login again",
          status: "error",
        });
        router.replace("/login");
      }
    } catch (error) {
      console.error("Error getting stored data:", error);
      setLoading(false);
    }
  };

  const fetchInventoryItems = async (outId) => {
    try {
      const data = await fetchWithAuth(`${getBaseUrl()}/inventory_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outId.toString(),
        }),
      });

      if (data.st === 1) {
        setItems(data.lists);
      } else {
        toast.show({
          description: data.msg || "Failed to fetch inventory items",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      toast.show({
        description: "Error fetching inventory items",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/screens/inventory/inventory-item-details",
          params: { itemId: item.inventory_id },
        })
      }
    >
      <Box 
        bg="white" 
        shadow={2}
        rounded="lg"
        mx={4}
        mb={2}
        p={3}
      >
        <VStack space={0.5}>
          <Text fontSize="md" fontWeight="semibold" color="coolGray.800">
            {item.name}
          </Text>
          <Text fontSize="sm" color="coolGray.600">
            Quantity: {item.quantity} {item.unit_of_measure}
          </Text>
          <Text fontSize="sm" color="coolGray.600">
            Brand: {item.brand_name || '-'}
          </Text>
        </VStack>
      </Box>
    </Pressable>
  );

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
        <Text mt={2}>Loading inventory items...</Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="white" safeArea>
      <Header title="Inventory Items" />

      {/* Restaurant Name Display */}
      <Box bg="white" borderBottomWidth={1} borderBottomColor="coolGray.200">
        <Pressable>
          <HStack 
            alignItems="center" 
            justifyContent="space-between" 
            bg="white"
            rounded="md" 
            p={2}
          >
            <HStack alignItems="center" space={2}>
              <Icon as={MaterialIcons} name="store" size={5} color="gray.600" />
              <Text fontWeight="medium" fontSize="md">{restaurantName || ""}</Text>
            </HStack>
          </HStack>
        </Pressable>
      </Box>

      {/* Add Search Bar */}
      <Box px={4} py={2}>
        <Input
          placeholder="Search inventory "
          value={searchQuery}
          onChangeText={handleSearch}
          width="100%"
          borderRadius="lg"
          py={3}
          px={2}
          backgroundColor="coolGray.100"
          InputLeftElement={
            <Icon
              ml={2}
              size={5}
              color="gray.400"
              as={<MaterialIcons name="search" />}
            />
          }
          InputRightElement={
            searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <Icon
                  mr={2}
                  size={5}
                  color="gray.400"
                  as={<MaterialIcons name="close" />}
                />
              </Pressable>
            ) : null
          }
        />
      </Box>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.inventory_id.toString()}
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Box flex={1} justifyContent="center" alignItems="center" mt={10}>
            <Text color="gray.500">
              {searchQuery
                ? "No items match your search"
                : "No inventory items found"}
            </Text>
          </Box>
        }
      />

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        colorScheme="green"
        icon={<MaterialIcons name="add" size={24} color="white" />}
        onPress={() => router.push("/screens/inventory/add-inventory-item")}
        position="absolute"
        bottom={20}
        right={4}
      />
      
      {/* Use the shared BottomNavigation component */}
      <BottomNavigation />
    </Box>
  );
}
