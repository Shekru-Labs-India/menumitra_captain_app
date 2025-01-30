import React from "react";
import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  VStack,
  IconButton,
  Text,
  HStack,
  ScrollView,
  Divider,
  Badge,
  Spinner,
  Fab,
  AlertDialog,
  Button,
  useToast,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://men4u.xyz/common_api";

export default function InventoryItemDetailsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { itemId } = useLocalSearchParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [outletId, setOutletId] = useState(null);
  const cancelRef = React.useRef(null);

  useEffect(() => {
    getStoredData();
  }, []);

  const getStoredData = async () => {
    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      if (storedOutletId) {
        setOutletId(storedOutletId);
        fetchInventoryDetails(storedOutletId, itemId);
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

  const fetchInventoryDetails = async (outId, invId) => {
    try {
      const accessToken = await AsyncStorage.getItem("access");
      const response = await fetch(`${API_BASE_URL}/inventory_view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          outlet_id: outId.toString(),
          inventory_id: invId.toString(),
        }),
      });

      const data = await response.json();
      console.log("Inventory Details Response:", data);

      if (data.st === 1 && data.data) {
        setItem({
          id: data.data.inventory_id,
          name: data.data.name,
          description: data.data.description || "No description available",
          category: data.data.category,
          quantity: data.data.quantity,
          unit_price: data.data.unit_price,
          unit_of_measure: data.data.unit_of_measure,
          reorder_level: data.data.reorder_level,
          brand_name: data.data.brand_name,
          tax_rate: data.data.tax_rate,
          in_or_out: data.data.in_or_out,
          in_date: data.data.in_date,
          out_date: data.data.out_date,
          expiration_date: data.data.expiration_date,
          supplier_name: data.data.supplier_name,
          supplier_id: data.data.supplier_id,
          createdOn: data.data.created_on,
          updatedOn: data.data.updated_on,
          createdBy: data.data.created_by,
          updatedBy: data.data.updated_by,
        });
      } else {
        toast.show({
          description: data.msg || "Failed to fetch inventory details",
          status: "error",
        });
        router.back();
      }
    } catch (error) {
      console.error("Fetch Inventory Details Error:", error);
      toast.show({
        description: "Failed to fetch inventory details",
        status: "error",
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleteOpen(false);
      const inventoryId = item?.id || item?.inventory_id;

      if (!inventoryId || !outletId) {
        toast.show({
          description: "Invalid item or outlet ID",
          status: "error",
        });
        return;
      }

      const accessToken = await AsyncStorage.getItem("access");
      const response = await fetch(`${API_BASE_URL}/inventory_delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          inventory_id: inventoryId.toString(),
        }),
      });

      const data = await response.json();
      console.log("Delete Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Item deleted successfully",
          status: "success",
          placement: "top",
          duration: 2000,
        });
        // Navigate back with refresh parameter
        router.push({
          pathname: "/screens/inventory/inventory-items",
          params: { refresh: Date.now() },
        });
      } else {
        throw new Error(data.msg || "Failed to delete item");
      }
    } catch (error) {
      console.error("Delete Error:", error);
      toast.show({
        description: error.message || "Failed to delete item",
        status: "error",
        placement: "top",
      });
    }
  };

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
        <Text mt={2}>Loading inventory details...</Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="white" safeArea>
      {/* Header with consistent styling */}
      <HStack
        px={4}
        py={3}
        alignItems="center"
        justifyContent="space-between"
        bg="white"
        shadow={2}
      >
        <IconButton
          icon={<MaterialIcons name="arrow-back" size={24} color="gray" />}
          onPress={() => router.back()}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
        />
        <Heading size="md">Item Details</Heading>
        <IconButton
          icon={<MaterialIcons name="delete" size={24} color="red.500" />}
          onPress={() => setIsDeleteOpen(true)}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
        />
      </HStack>

      {/* Content */}
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <VStack space={4} p={4}>
          {/* Basic Information Card */}
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <VStack space={2}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="xl" fontWeight="bold">
                  {item?.name}
                </Text>
                <Badge
                  colorScheme={item?.in_or_out === "in" ? "success" : "danger"}
                  rounded="md"
                >
                  {item?.in_or_out?.toUpperCase()}
                </Badge>
              </HStack>
              <Text color="coolGray.600">{item?.description}</Text>
            </VStack>
          </Box>

          {/* Product Information */}
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <Text fontSize="lg" fontWeight="semibold" mb={3}>
              Product Information
            </Text>
            <VStack space={3}>
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Category</Text>
                <Text>{item?.category}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Brand Name</Text>
                <Text>{item?.brand_name || "N/A"}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Quantity</Text>
                <Text>
                  {item?.quantity} {item?.unit_of_measure}
                </Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Reorder Level</Text>
                <Text>{item?.reorder_level}</Text>
              </HStack>
            </VStack>
          </Box>

          {/* Financial Information */}
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <Text fontSize="lg" fontWeight="semibold" mb={3}>
              Financial Information
            </Text>
            <VStack space={3}>
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Unit Price</Text>
                <Text>₹{item?.unit_price || "0"}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Tax Rate</Text>
                <Text>{item?.tax_rate || "0"}%</Text>
              </HStack>
            </VStack>
          </Box>

          {/* Supplier Information */}
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <Text fontSize="lg" fontWeight="semibold" mb={3}>
              Supplier Information
            </Text>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Supplier Name</Text>
              <Text>{item?.supplier_name || "N/A"}</Text>
            </HStack>
          </Box>

          {/* Time Information */}
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <Text fontSize="lg" fontWeight="semibold" mb={3}>
              Time Information
            </Text>
            <VStack space={3}>
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">In Date</Text>
                <Text>{item?.in_date || "N/A"}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Out Date</Text>
                <Text>{item?.out_date || "N/A"}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Expiration Date</Text>
                <Text>{item?.expiration_date || "N/A"}</Text>
              </HStack>
            </VStack>
          </Box>

          {/* Audit Information */}
          <Box bg="white" p={4} rounded="lg" mb={20} shadow={1}>
            <Text fontSize="lg" fontWeight="semibold" mb={3}>
              Audit Information
            </Text>
            <VStack space={3}>
              {item?.createdOn && (
                <HStack justifyContent="space-between">
                  <Text color="coolGray.600">Created On</Text>
                  <Text>{item.createdOn}</Text>
                </HStack>
              )}
              {item?.createdBy && (
                <HStack justifyContent="space-between">
                  <Text color="coolGray.600">Created By</Text>
                  <Text>{item.createdBy}</Text>
                </HStack>
              )}
              <Divider my={2} />
              {item?.updatedOn && (
                <HStack justifyContent="space-between">
                  <Text color="coolGray.600">Last Updated</Text>
                  <Text>{item.updatedOn}</Text>
                </HStack>
              )}
              {item?.updatedBy && (
                <HStack justifyContent="space-between">
                  <Text color="coolGray.600">Updated By</Text>
                  <Text>{item.updatedBy}</Text>
                </HStack>
              )}
            </VStack>
          </Box>
        </VStack>
      </ScrollView>

      {/* FAB */}
      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        colorScheme="blue"
        icon={<MaterialIcons name="edit" size={24} color="white" />}
        onPress={() => {
          const inventoryId = item?.id || item?.inventory_id;
          if (!inventoryId) {
            toast.show({
              description: "Invalid item ID",
              status: "error",
            });
            return;
          }
          router.push({
            pathname: "/screens/inventory/edit-inventory-item",
            params: { itemId: inventoryId.toString() },
          });
        }}
        position="absolute"
        bottom={4}
        right={4}
      />

      {/* Delete Dialog */}
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>Delete Item</AlertDialog.Header>
          <AlertDialog.Body>
            Are you sure you want to delete this item? This action cannot be
            undone.
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button.Group space={2}>
              <Button
                variant="outline"
                colorScheme="coolGray"
                onPress={() => setIsDeleteOpen(false)}
                ref={cancelRef}
              >
                Cancel
              </Button>
              <Button colorScheme="danger" onPress={handleDelete}>
                Delete
              </Button>
            </Button.Group>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </Box>
  );
}
