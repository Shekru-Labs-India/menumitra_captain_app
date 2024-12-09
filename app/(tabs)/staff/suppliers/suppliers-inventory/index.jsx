import React, { useState, useEffect } from "react";
import {
  Box,
  FlatList,
  Heading,
  VStack,
  IconButton,
  Text,
  HStack,
  useToast,
  Fab,
  Spinner,
  Badge,
  Input,
  Select,
  Pressable,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function SupplierInventoryScreen() {
  const { supplierId } = useLocalSearchParams();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (supplierId) {
      fetchSupplierDetails();
    }
    fetchInventory();
  }, [supplierId]);

  useFocusEffect(
    React.useCallback(() => {
      const params = router.params;
      if (params?.shouldRefresh) {
        fetchInventory();
        router.setParams({ shouldRefresh: undefined });
      }
    }, [router.params])
  );

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const restaurantId = await AsyncStorage.getItem("restaurant_id");
      console.log("Fetching inventory for restaurant:", restaurantId);

      if (!restaurantId) {
        throw new Error("Restaurant ID not found");
      }

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier_inventory/listview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: parseInt(restaurantId),
          }),
        }
      );

      const data = await response.json();
      console.log("Inventory API Response:", data);

      if (data.st === 1 && Array.isArray(data.data)) {
        const formattedInventory = data.data.map((item) => ({
          inventoryId: parseInt(item.supplier_inventory_id),
          supplierId: parseInt(item.supplier_id),
          name: item.name || "Unnamed Item",
          category: item.category || "Uncategorized",
          price: parseFloat(item.price || 0).toFixed(2),
          quantity: parseInt(item.quantity || 0),
        }));

        console.log("Formatted Inventory:", formattedInventory);
        setInventory(formattedInventory);
      } else {
        throw new Error(data.msg || "Failed to load inventory");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.show({
        description: error.message || "Failed to fetch inventory",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierDetails = async () => {
    try {
      const restaurantId = await AsyncStorage.getItem("restaurant_id");
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier/view`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplier_id: parseInt(supplierId),
            restaurant_id: parseInt(restaurantId),
          }),
        }
      );

      const data = await response.json();
      if (data.st === 1 && data.data) {
        setSupplierName(data.data.name);
      }
    } catch (error) {
      console.error("Error fetching supplier details:", error);
    }
  };

  // Filter inventory based on search and category
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || item.category === filterCategory;
    const matchesSupplier =
      !supplierId || item.supplierId === parseInt(supplierId);
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  // Get unique categories for filter
  const categories = [...new Set(inventory.map((item) => item.category))];

  const renderInventoryItem = ({ item }) => (
    <Pressable
      onPress={() =>
        router.push(`/staff/suppliers/suppliers-inventory/${item.inventoryId}`)
      }
    >
      <Box
        bg="white"
        rounded="lg"
        shadow={1}
        mb={3}
        mx={1}
        p={4}
        borderWidth={1}
        borderColor="coolGray.200"
      >
        <VStack space={2}>
          <HStack justifyContent="space-between" alignItems="center">
            <Heading size="sm">{item.name}</Heading>
            <Badge colorScheme="info" rounded="md">
              {item.category}
            </Badge>
          </HStack>

          <HStack space={4} alignItems="center">
            <HStack space={2} alignItems="center">
              <MaterialIcons name="attach-money" size={20} color="gray" />
              <Text>₹{item.price}</Text>
            </HStack>

            <HStack space={2} alignItems="center">
              <MaterialIcons name="inventory" size={20} color="gray" />
              <Text>{item.quantity} units</Text>
            </HStack>
          </HStack>

          <HStack space={4} alignItems="center">
            <HStack space={2} alignItems="center">
              <MaterialIcons name="store" size={16} color="gray" />
              <Text fontSize="sm" color="coolGray.600">
                Supplier ID: {item.supplierId}
              </Text>
            </HStack>
            <HStack space={2} alignItems="center">
              <MaterialIcons name="tag" size={16} color="gray" />
              <Text fontSize="sm" color="coolGray.600">
                Inventory ID: {item.inventoryId}
              </Text>
            </HStack>
          </HStack>
        </VStack>
      </Box>
    </Pressable>
  );

  return (
    <Box
      flex={1}
      bg="coolGray.100"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      {/* Header */}
      <Box px={4} py={3} bg="white" shadow={2}>
        <HStack alignItems="center" space={4}>
          <IconButton
            icon={<MaterialIcons name="arrow-back" size={24} color="black" />}
            onPress={() => router.back()}
          />
          <Heading size="lg">Supplier Inventory</Heading>
        </HStack>
      </Box>

      {/* Search and Filter */}
      <HStack
        space={2}
        px={4}
        py={2}
        bg="white"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
      >
        <Input
          flex={1}
          placeholder="Search inventory..."
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
        <Select
          w="120"
          selectedValue={filterCategory}
          onValueChange={setFilterCategory}
          placeholder="Category"
        >
          <Select.Item label="All" value="" />
          {categories.map((category) => (
            <Select.Item key={category} label={category} value={category} />
          ))}
        </Select>
      </HStack>

      {loading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" />
        </Box>
      ) : (
        <FlatList
          data={filteredInventory}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item.inventoryId.toString()}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Box flex={1} justifyContent="center" alignItems="center" py={10}>
              <MaterialIcons name="inventory" size={48} color="gray" />
              <Text color="coolGray.500" mt={2}>
                No inventory items found
              </Text>
            </Box>
          }
        />
      )}

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<MaterialIcons name="add" size={24} color="white" />}
        onPress={() =>
          router.push({
            pathname: "/staff/suppliers/suppliers-inventory/add",
            params: {
              supplierId,
              supplierName,
            },
          })
        }
        position="absolute"
        bottom={4}
        right={4}
      />
    </Box>
  );
}
