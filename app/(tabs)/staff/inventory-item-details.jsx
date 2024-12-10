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

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function InventoryItemDetailsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { itemId } = useLocalSearchParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [restaurantId, setRestaurantId] = useState(null);
  const cancelRef = React.useRef(null);

  useEffect(() => {
    getStoredData();
  }, []);

  const getStoredData = async () => {
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
      if (storedRestaurantId) {
        setRestaurantId(parseInt(storedRestaurantId));
        fetchInventoryDetails(parseInt(storedRestaurantId), itemId);
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

  const fetchInventoryDetails = async (restId, invId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/inventory_view`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restId.toString(),
            inventory_id: parseInt(invId),
          }),
        }
      );

      const data = await response.json();
      console.log("Inventory Details Response:", data);

      if (data.st === 1 && data.data) {
        setItem({
          id: data.data.inventory_id,
          name: data.data.name,
          description: data.data.description || "No description available",
          category: data.data.category_name,
          category_id: data.data.category_id,
          quantity: data.data.quantity,
          unit_price: data.data.unit_price,
          unit_of_measure: data.data.unit_of_measure,
          reorder_level: data.data.reorder_level,
          brand_name: data.data.brand_name,
          tax_rate: data.data.tax_rate,
          in_or_out: data.data.in_or_out,
          in_date: data.data.in_date,
          expiration_date: data.data.expiration_date,
          supplier_name: data.data.supplier_name,
          supplier_id: data.data.supplier_id,
          restaurant_id: data.data.restaurant_id,
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

      if (!inventoryId || !restaurantId) {
        toast.show({
          description: "Invalid item or restaurant ID",
          status: "error",
        });
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/inventory_delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restaurantId.toString(),
            inventory_id: parseInt(inventoryId),
          }),
        }
      );

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
          pathname: "/(tabs)/staff/inventory-items",
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

  const DetailRow = ({ label, value, badge, badgeColor }) => (
    <HStack space={2} justifyContent="space-between" alignItems="center">
      <Text fontSize="sm" color="coolGray.500" flex={1}>
        {label}
      </Text>
      {badge ? (
        <Badge colorScheme={badgeColor} rounded="md" variant="subtle">
          {value}
        </Badge>
      ) : (
        <Text fontSize="sm" fontWeight="medium" flex={1} textAlign="right">
          {value}
        </Text>
      )}
    </HStack>
  );

  const DetailSection = ({ title, children }) => (
    <VStack space={3}>
      <Text fontSize="md" fontWeight="bold" color="coolGray.700">
        {title}
      </Text>
      <VStack space={3} bg="white" p={4} rounded="lg" shadow={1}>
        {children}
      </VStack>
    </VStack>
  );

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
        <Text mt={2}>Loading inventory details...</Text>
      </Box>
    );
  }

  return (
    <Box
      flex={1}
      bg="coolGray.50"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      {/* Header */}
      <Box
        px={4}
        py={3}
        bg="white"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
      >
        <HStack alignItems="center" justifyContent="space-between">
          <IconButton
            icon={
              <MaterialIcons name="arrow-back" size={24} color="coolGray.600" />
            }
            onPress={() => router.back()}
            variant="ghost"
            _pressed={{ bg: "coolGray.100" }}
          />
          <Heading size="md" flex={1} textAlign="center">
            Item Details
          </Heading>
          <IconButton
            icon={<MaterialIcons name="delete" size={24} color="red.600" />}
            onPress={() => setIsDeleteOpen(true)}
            variant="ghost"
            _pressed={{ bg: "coolGray.100" }}
          />
        </HStack>
      </Box>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        closeOnOverlayClick={true} // Close when clicking outside
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>Delete Item</AlertDialog.Header>
          <AlertDialog.Body>
            Are you sure you want to delete this item? This action cannot be
            undone.
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button.Group space={2} justifyContent="flex-end" width="full">
              <Button
                flex={1}
                variant="outline"
                colorScheme="coolGray"
                onPress={() => setIsDeleteOpen(false)}
                ref={cancelRef}
              >
                Cancel
              </Button>
              <Button flex={1} colorScheme="danger" onPress={handleDelete}>
                Delete
              </Button>
            </Button.Group>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>

      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack space={6} p={4}>
          {/* Basic Information */}
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <VStack space={3}>
              <HStack justifyContent="space-between" alignItems="center">
                <VStack>
                  <Text fontSize="xl" fontWeight="bold" color="coolGray.800">
                    {item?.name}
                  </Text>
                  <Text fontSize="sm" color="coolGray.500">
                    ID: #{item?.id}
                  </Text>
                </VStack>
                <Badge
                  colorScheme={item?.in_or_out === "in" ? "success" : "danger"}
                  variant="subtle"
                  rounded="md"
                  px={3}
                  py={1}
                >
                  {item?.in_or_out?.toUpperCase()}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="coolGray.600">
                {item?.description}
              </Text>
            </VStack>
          </Box>

          {/* Product Details */}
          <DetailSection title="Product Information">
            <DetailRow label="Category" value={item?.category} />
            <DetailRow label="Brand Name" value={item?.brand_name || "N/A"} />
            <DetailRow label="Quantity" value={item?.quantity?.toString()} />
            <DetailRow
              label="Unit of Measure"
              value={item?.unit_of_measure || "N/A"}
            />
            <DetailRow
              label="Reorder Level"
              value={item?.reorder_level?.toString() || "N/A"}
            />
          </DetailSection>

          {/* Financial Details */}
          <DetailSection title="Financial Information">
            <DetailRow label="Unit Price" value={`₹${item?.unit_price || 0}`} />
            <DetailRow label="Tax Rate" value={`${item?.tax_rate || 0}%`} />
          </DetailSection>

          {/* Supplier Information */}
          <DetailSection title="Supplier Information">
            <DetailRow
              label="Supplier Name"
              value={item?.supplier_name || "N/A"}
            />
            <DetailRow
              label="Supplier ID"
              value={item?.supplier_id?.toString() || "N/A"}
            />
          </DetailSection>

          {/* Dates Information */}
          <DetailSection title="Time Information">
            <DetailRow label="In Date" value={item?.in_date || "N/A"} />
            <DetailRow
              label="Expiration Date"
              value={item?.expiration_date || "N/A"}
            />
          </DetailSection>

          {/* Additional Information */}
          <DetailSection title="Additional Information">
            <DetailRow
              label="Restaurant ID"
              value={item?.restaurant_id?.toString() || "N/A"}
            />
            <DetailRow
              label="Category ID"
              value={item?.category_id?.toString() || "N/A"}
            />
          </DetailSection>
        </VStack>
      </ScrollView>

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<MaterialIcons name="edit" size={24} color="white" />}
        onPress={() => {
          console.log("Current item:", item);
          const inventoryId = item?.id || item?.inventory_id;

          if (!inventoryId) {
            toast.show({
              description: "Invalid item ID",
              status: "error",
            });
            return;
          }

          console.log("Navigating to edit with ID:", inventoryId);
          router.push({
            pathname: "/(tabs)/staff/edit-inventory-item",
            params: {
              itemId: inventoryId.toString(),
            },
          });
        }}
        bg="#007AFF"
        _pressed={{
          bg: "#0056b3",
        }}
        bottom={85}
        right={6}
      />
    </Box>
  );
}
