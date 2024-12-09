import { useState, useEffect } from "react";
import {
  Box,
  ScrollView,
  Heading,
  VStack,
  IconButton,
  Text,
  HStack,
  useToast,
  Spinner,
  Badge,
  Divider,
  AlertDialog,
  Fab,
  Button,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function InventoryDetailsScreen() {
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    fetchInventoryDetails();
  }, [id]);

  const fetchInventoryDetails = async () => {
    try {
      const restaurantId = await AsyncStorage.getItem("restaurant_id");

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier_inventory/view`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplier_inventory_id: parseInt(id),
            restaurant_id: parseInt(restaurantId),
          }),
        }
      );

      const data = await response.json();
      console.log("Inventory Details Response:", data);

      if (data.st === 1 && data.data) {
        setInventory(data.data);
      } else {
        throw new Error(data.msg || "Failed to fetch inventory details");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.show({
        description: error.message || "Failed to fetch inventory details",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const restaurantId = await AsyncStorage.getItem("restaurant_id");

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier_inventory/delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplier_inventory_id: parseInt(id),
            restaurant_id: parseInt(restaurantId),
          }),
        }
      );

      const data = await response.json();

      if (data.st === 1) {
        toast.show({
          description: data.msg || "Inventory deleted successfully",
          status: "success",
        });
        router.back({
          params: { shouldRefresh: true },
        });
      } else {
        throw new Error(data.msg || "Failed to delete inventory");
      }
    } catch (error) {
      console.error("Delete Error:", error);
      toast.show({
        description: error.message || "Failed to delete inventory",
        status: "error",
      });
    }
  };

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  if (!inventory) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Text>Inventory item not found</Text>
      </Box>
    );
  }

  return (
    <Box
      flex={1}
      bg="white"
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
          <Heading size="lg">Inventory Details</Heading>
        </HStack>
        <IconButton
          position="absolute"
          right={2}
          top={2}
          icon={<MaterialIcons name="delete" size={24} color="red.500" />}
          onPress={() => setIsDeleteOpen(true)}
        />
      </Box>

      <ScrollView px={4} py={4}>
        <VStack space={4}>
          {/* Basic Information */}
          <VStack space={3}>
            <Heading size="md">Basic Information</Heading>
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontWeight="bold" fontSize="lg">
                {inventory.name}
              </Text>
              <Badge colorScheme="info" rounded="md">
                {inventory.category}
              </Badge>
            </HStack>
            <Text color="coolGray.600">{inventory.description}</Text>
          </VStack>

          <Divider />

          {/* Product Details */}
          <VStack space={3}>
            <Heading size="md">Product Details</Heading>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Serial Number</Text>
              <Text fontWeight="semibold">{inventory.sr_no}</Text>
            </HStack>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Brand</Text>
              <Text fontWeight="semibold">{inventory.brand_name}</Text>
            </HStack>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Tax</Text>
              <Text fontWeight="semibold">{inventory.tax}</Text>
            </HStack>
          </VStack>

          <Divider />

          {/* Stock Information */}
          <VStack space={3}>
            <Heading size="md">Stock Information</Heading>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Quantity</Text>
              <Text fontWeight="semibold">{inventory.quantity} units</Text>
            </HStack>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Price</Text>
              <Text fontWeight="semibold">₹{inventory.price}</Text>
            </HStack>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Status</Text>
              <Badge
                colorScheme={
                  inventory.in_or_out === "in" ? "success" : "warning"
                }
              >
                {inventory.in_or_out.toUpperCase()}
              </Badge>
            </HStack>
          </VStack>

          <Divider />

          {/* Order Information */}
          <VStack space={3}>
            <Heading size="md">Order Information</Heading>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Order ID</Text>
              <Text fontWeight="semibold">{inventory.order_id}</Text>
            </HStack>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Payment Status</Text>
              <Badge
                colorScheme={
                  inventory.paymen_status === "Paid" ? "success" : "warning"
                }
              >
                {inventory.paymen_status}
              </Badge>
            </HStack>
          </VStack>

          <Divider />

          {/* Timestamps */}
          <VStack space={3}>
            <Heading size="md">Timestamps</Heading>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">In DateTime</Text>
              <Text fontWeight="semibold">{inventory.in_datetime}</Text>
            </HStack>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Out DateTime</Text>
              <Text fontWeight="semibold">{inventory.out_datetime}</Text>
            </HStack>
          </VStack>

          <Divider />

          {/* IDs */}
          <VStack space={3}>
            <Heading size="md">Reference Information</Heading>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Inventory ID</Text>
              <Text fontWeight="semibold">
                {inventory.supplier_inventory_id}
              </Text>
            </HStack>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Supplier ID</Text>
              <Text fontWeight="semibold">{inventory.supplier_id}</Text>
            </HStack>
          </VStack>
        </VStack>
      </ScrollView>

      {/* Add Delete Alert Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        closeOnOverlayClick={true}
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>Delete Inventory</AlertDialog.Header>
          <AlertDialog.Body>
            Are you sure you want to delete this inventory item? This action
            cannot be undone.
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <HStack space={2} width="full" justifyContent="space-between">
              <Button
                variant="outline"
                colorScheme="coolGray"
                onPress={() => setIsDeleteOpen(false)}
                flex={1}
              >
                Cancel
              </Button>
              <Button colorScheme="danger" onPress={handleDelete} flex={1}>
                Delete
              </Button>
            </HStack>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>

      {/* Add Edit FAB */}
      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<MaterialIcons name="edit" size={24} color="white" />}
        onPress={() =>
          router.push(`/staff/suppliers/suppliers-inventory/edit/${id}`)
        }
        position="absolute"
        bottom={4}
        right={4}
      />
    </Box>
  );
}
