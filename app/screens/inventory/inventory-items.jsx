import { useState, useEffect } from "react";
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
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../components/Header";
import { getBaseUrl } from "../../../config/api.config";

export default function InventoryItemsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useLocalSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [outletId, setOutletId] = useState(null);

  useEffect(() => {
    getStoredData();
  }, [refresh]); // Refresh when the refresh parameter changes

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
      const accessToken = await AsyncStorage.getItem("access");
      const response = await fetch(`${getBaseUrl()}/inventory_listview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          outlet_id: outId.toString(),
        }),
      });

      const data = await response.json();
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

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/screens/inventory/inventory-item-details",
          params: { itemId: item.inventory_id },
        })
      }
    >
      <Box bg="white" rounded="lg" shadow={1} mb={3} mx={4} p={4}>
        <VStack space={2}>
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontSize="lg" fontWeight="bold" color="coolGray.800">
              {item.name}
            </Text>
            <Badge
              colorScheme={item.in_or_out === "in" ? "success" : "danger"}
              rounded="md"
            >
              {item.in_or_out?.toUpperCase()}
            </Badge>
          </HStack>

          <HStack space={4} alignItems="center">
            <VStack flex={1}>
              <Text fontSize="sm" color="coolGray.600">
                Quantity
              </Text>
              <Text fontSize="md" fontWeight="semibold">
                {item.quantity} {item.unit_of_measure}
              </Text>
            </VStack>

            <VStack flex={1}>
              <Text fontSize="sm" color="coolGray.600">
                Brand
              </Text>
              <Text fontSize="md" fontWeight="semibold">
                {item.brand_name}
              </Text>
            </VStack>
          </HStack>
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

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.inventory_id.toString()}
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
      />

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        colorScheme="green"
        icon={<MaterialIcons name="add" size={24} color="white" />}
        onPress={() => router.push("/screens/inventory/add-inventory-item")}
        position="absolute"
        bottom={4}
        right={4}
      />
    </Box>
  );
}
