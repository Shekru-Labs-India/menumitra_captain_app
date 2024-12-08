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
  Divider,
  Badge,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function InventoryDetailsScreen() {
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams();

  useEffect(() => {
    fetchInventoryDetails();
  }, [id]);

  const fetchInventoryDetails = async () => {
    try {
      setLoading(true);
      const restaurantId = await AsyncStorage.getItem("restaurant_id");

      if (!restaurantId || !id) {
        throw new Error("Required data missing");
      }

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
        description: error.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const InfoRow = ({ label, value, icon }) => (
    <HStack space={2} alignItems="center">
      {icon && <MaterialIcons name={icon} size={20} color="gray" />}
      <Text color="gray.600" flex={1}>
        {label}:
      </Text>
      <Text flex={2} fontWeight="medium">
        {value || "Not specified"}
      </Text>
    </HStack>
  );

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
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
      </Box>

      <ScrollView px={4} py={4}>
        {inventory && (
          <VStack space={6}>
            {/* Basic Information */}
            <VStack space={4}>
              <HStack justifyContent="space-between" alignItems="center">
                <Heading size="md">{inventory.name}</Heading>
                <Badge colorScheme="info" rounded="md">
                  {inventory.category}
                </Badge>
              </HStack>

              <Text color="gray.600">{inventory.description}</Text>

              <HStack space={4} mt={2}>
                <Badge
                  colorScheme="emerald"
                  variant="subtle"
                  rounded="md"
                  px={3}
                  py={1}
                >
                  <HStack space={1} alignItems="center">
                    <MaterialIcons name="attach-money" size={16} color="green" />
                    <Text color="emerald.800">₹{inventory.price}</Text>
                  </HStack>
                </Badge>
                <Badge
                  colorScheme="blue"
                  variant="subtle"
                  rounded="md"
                  px={3}
                  py={1}
                >
                  <HStack space={1} alignItems="center">
                    <MaterialIcons name="inventory" size={16} color="blue" />
                    <Text color="blue.800">{inventory.quantity} units</Text>
                  </HStack>
                </Badge>
              </HStack>
            </VStack>

            <Divider />

            {/* Details Section */}
            <VStack space={3}>
              <Heading size="sm" mb={2}>
                Item Details
              </Heading>
              <InfoRow
                label="SR Number"
                value={inventory.sr_no}
                icon="confirmation-number"
              />
              <InfoRow
                label="Brand Name"
                value={inventory.brand_name}
                icon="branding-watermark"
              />
              <InfoRow label="Tax" value={inventory.tax} icon="receipt" />
              <InfoRow
                label="Payment Status"
                value={inventory.paymen_status}
                icon="payment"
              />
              <InfoRow
                label="Order ID"
                value={inventory.order_id}
                icon="shopping-cart"
              />
            </VStack>

            <Divider />

            {/* Supplier Information */}
            <VStack space={3}>
              <Heading size="sm" mb={2}>
                Supplier Information
              </Heading>
              <InfoRow
                label="Supplier ID"
                value={inventory.supplier_id}
                icon="store"
              />
              <InfoRow
                label="Stock Status"
                value={inventory.in_or_out === "in" ? "In Stock" : "Out of Stock"}
                icon="local-shipping"
              />
            </VStack>

            <Divider />

            {/* Timestamps */}
            <VStack space={3}>
              <Heading size="sm" mb={2}>
                Timestamps
              </Heading>
              <InfoRow
                label="In DateTime"
                value={
                  inventory.in_datetime
                    ? moment(inventory.in_datetime).format("DD MMM YYYY, hh:mm A")
                    : "Not available"
                }
                icon="schedule"
              />
              <InfoRow
                label="Out DateTime"
                value={
                  inventory.out_datetime
                    ? moment(inventory.out_datetime).format("DD MMM YYYY, hh:mm A")
                    : "Not available"
                }
                icon="update"
              />
            </VStack>
          </VStack>
        )}
      </ScrollView>
    </Box>
  );
} 