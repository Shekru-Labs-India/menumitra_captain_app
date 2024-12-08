import { useState, useEffect } from "react";
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
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Platform, StatusBar } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function SupplierInventoryScreen() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    fetchInventory();
  }, []);

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
          ...item,
          supplier_inventory_id: item.supplier_inventory_id?.toString() || "",
          supplier_id: item.supplier_id?.toString() || "",
          name: item.name || "Unnamed Item",
          category: item.category || "Uncategorized",
          price: item.price?.toString() || "0",
          quantity: item.quantity?.toString() || "0",
        }));

        console.log("Formatted Inventory:", formattedInventory);
        setInventory(formattedInventory);
      } else {
        console.error("Invalid data format:", data);
        toast.show({
          description: data.msg || "Failed to load inventory",
          status: "error",
        });
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

  const renderInventoryItem = ({ item }) => (
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
          <Heading size="sm">{item.name || "Unnamed Item"}</Heading>
          <Badge colorScheme="info" rounded="md">
            {item.category || "Uncategorized"}
          </Badge>
        </HStack>

        <HStack space={4} alignItems="center">
          <HStack space={2} alignItems="center">
            <MaterialIcons name="attach-money" size={20} color="gray" />
            <Text>₹{item.price || "0"}</Text>
          </HStack>

          <HStack space={2} alignItems="center">
            <MaterialIcons name="inventory" size={20} color="gray" />
            <Text>{item.quantity || "0"} units</Text>
          </HStack>
        </HStack>

        {item.supplier_id && (
          <HStack space={2} alignItems="center">
            <MaterialIcons name="store" size={16} color="gray" />
            <Text fontSize="sm" color="coolGray.600">
              Supplier ID: {item.supplier_id}
            </Text>
          </HStack>
        )}
      </VStack>
    </Box>
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

      {loading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" />
        </Box>
      ) : (
        <FlatList
          data={inventory}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item.supplier_inventory_id.toString()}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Box flex={1} justifyContent="center" alignItems="center" py={10}>
              <Text color="coolGray.500">No inventory items found</Text>
            </Box>
          }
        />
      )}

      {/* Add Inventory FAB */}
      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<MaterialIcons name="add" size={24} color="white" />}
        onPress={() => router.push("/staff/suppliers/suppliers-inventory/add")}
      />
    </Box>
  );
}
