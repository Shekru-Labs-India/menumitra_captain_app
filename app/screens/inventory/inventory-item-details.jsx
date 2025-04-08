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
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";

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
      const data = await fetchWithAuth(`${getBaseUrl()}/inventory_view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outId.toString(),
          inventory_id: invId.toString(),
        }),
      });

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
      const userId = await AsyncStorage.getItem("user_id");

      if (!inventoryId || !outletId) {
        toast.show({
          description: "Invalid item or outlet ID",
          status: "error",
        });
        return;
      }

      if (!userId) {
        toast.show({
          description: "User ID not found. Please login again.",
          status: "error",
        });
        return;
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/inventory_delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          inventory_id: inventoryId.toString(),
          user_id: userId.toString(),
        }),
      });

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
    <Box flex={1} bg="#f5f5f5" safeArea>
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
          icon={<MaterialIcons name="arrow-back" size={24} color="black" />}
          onPress={() => router.back()}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
        />
        <Heading size="md">Inventory Details</Heading>
        <IconButton
          icon={<MaterialIcons name="delete" size={24} color="black" />}
          onPress={() => setIsDeleteOpen(true)}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
        />
      </HStack>

      {/* Content */}
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        {/* Basic Information Section */}
        <Box bg="white" m={4} rounded="lg" shadow={1} p={4}>
          <Text fontSize="xl" color="#38bdf8" fontWeight="bold" mb={2}>
            Basic Information
          </Text>
          <Divider mb={4} />
          
          <VStack space={6}>
            <HStack justifyContent="space-between">
              <VStack space={1}>
                <Text fontSize="xl" fontWeight="bold">
                  {item?.name || "Chips"}
                </Text>
                <Text color="gray.500">Item Name</Text>
              </VStack>
              <VStack space={1} alignItems="flex-end">
                <Text fontSize="xl" fontWeight="bold">
                  {item?.category || "Furniture"}
                </Text>
                <Text color="gray.500">Category</Text>
              </VStack>
            </HStack>

            <HStack justifyContent="space-between">
              <VStack space={1}>
                <Text fontSize="xl" fontWeight="bold">
                  {item?.quantity || "10"} {item?.unit_of_measure || "Dhd"}
                </Text>
                <Text color="gray.500">Quantity</Text>
              </VStack>
              <VStack space={1} alignItems="flex-end">
                <Text fontSize="xl" fontWeight="bold">
                  ₹{item?.unit_price || "644.00"}
                </Text>
                <Text color="gray.500">Unit Price</Text>
              </VStack>
            </HStack>

            <HStack justifyContent="space-between">
              <VStack space={1}>
                <Text fontSize="xl" fontWeight="bold">
                  {item?.reorder_level || "Not Available"}
                </Text>
                <Text color="gray.500">Reorder Level</Text>
              </VStack>
              <VStack space={1} alignItems="flex-end">
                <Text fontSize="xl" fontWeight="bold" color={item?.in_or_out === "in" ? "green.500" : "blue.500"}>
                  {item?.in_or_out?.toUpperCase() || "OUT"}
                </Text>
                <Text color="gray.500">Status</Text>
              </VStack>
            </HStack>
          </VStack>
        </Box>

        {/* Additional Details Section */}
        <Box bg="white" mx={4} mb={6} rounded="lg" shadow={1} p={4}>
          <Text fontSize="xl" color="#38bdf8" fontWeight="bold" mb={2}>
            Additional Details
          </Text>
          <Divider mb={4} />
          
          <VStack space={6}>
            <HStack justifyContent="space-between">
              <VStack space={1}>
                <Text fontSize="xl" fontWeight="bold">
                  {item?.tax_rate || "464.00"}%
                </Text>
                <Text color="gray.500">Tax Rate</Text>
              </VStack>
              <VStack space={1} alignItems="flex-end">
                <Text fontSize="xl" fontWeight="bold">
                  {item?.brand_name || "Not Available"}
                </Text>
                <Text color="gray.500">Brand Name</Text>
              </VStack>
            </HStack>

            <HStack justifyContent="space-between">
              <VStack space={1}>
                <Text fontSize="xl" fontWeight="bold">
                  {item?.supplier_name || "Balaji"}
                </Text>
                <Text color="gray.500">Supplier Name</Text>
              </VStack>
              <VStack space={1} alignItems="flex-end">
                <Text fontSize="xl" fontWeight="bold">
                  {item?.expiration_date || "Not Available"}
                </Text>
                <Text color="gray.500">Expiration Date</Text>
              </VStack>
            </HStack>

            <HStack justifyContent="space-between">
              <VStack space={1}>
                <Text fontSize="xl" fontWeight="bold">
                  {item?.in_date || "03 Apr 2025"}
                </Text>
                <Text color="gray.500">In Date</Text>
              </VStack>
              <VStack space={1} alignItems="flex-end">
                <Text fontSize="xl" fontWeight="bold">
                  {item?.out_date || "N/A"}
                </Text>
                <Text color="gray.500">Out Date</Text>
              </VStack>
            </HStack>

            <HStack justifyContent="space-between">
              <VStack space={1}>
                <Text fontSize="xl" fontWeight="bold">
                  {item?.createdBy || "captain"}
                </Text>
                <Text color="gray.500">Created By</Text>
              </VStack>
              <VStack space={1} alignItems="flex-end">
                <Text fontSize="xl" fontWeight="bold">
                  {item?.updatedBy || "owner"}
                </Text>
                <Text color="gray.500">Updated By</Text>
              </VStack>
            </HStack>

            <VStack space={2}>
              <Box>
                <Text color="gray.500" mb={1}>Created On</Text>
                <Text fontSize="md" fontWeight="bold" isTruncated numberOfLines={2}>
                  {item?.createdOn || "03 Apr 2025 01:04:08 PM"}
                </Text>
              </Box>
              
              <Box mt={2}>
                <Text color="gray.500" mb={1}>Updated On</Text>
                <Text fontSize="md" fontWeight="bold" isTruncated numberOfLines={2}>
                  {item?.updatedOn && item?.updatedOn !== item?.createdOn 
                    ? item.updatedOn 
                    : "Not updated yet"}
                </Text>
              </Box>
            </VStack>

            <HStack justifyContent="flex-start">
              <VStack space={1}>
                <Text fontSize="xl" fontWeight="bold">
                  {item?.description || "Bdbdvhb"}
                </Text>
                <Text color="gray.500">Description</Text>
              </VStack>
            </HStack>
          </VStack>
        </Box>
      </ScrollView>

      {/* FAB */}
      <Fab
        renderInPortal={false}
        shadow={2}
        size="lg"
        bg="#38bdf8"
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
