import React, { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  Pressable,
  Image,
  Heading,
  Button,
  IconButton,
  Spinner,
  useToast,
  Badge,
  FlatList,
  Center,
  Linking,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://men4u.xyz/captain_api";

const formatTime = (dateTimeString) => {
  const timePart = dateTimeString.split(" ")[1];
  const amPm = dateTimeString.split(" ")[2];
  const timeWithoutSeconds = timePart.split(":").slice(0, 2).join(":");
  return `${timeWithoutSeconds} ${amPm}`;
};

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [invoiceUrl, setInvoiceUrl] = useState(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!id) {
        console.error("No order number provided");
        return;
      }

      try {
        console.log("Fetching order details for:", id);

        const response = await fetch(`${API_BASE_URL}/captain_order/view`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_number: id,
          }),
        });

        const data = await response.json();
        console.log("API Response:", data);

        if (data.st === 1 && data.lists) {
          setOrderDetails(data.lists.order_details);
          setMenuItems(data.lists.menu_details || []);
          setInvoiceUrl(data.lists.invoice_url);
          setIsLoading(false);
        } else {
          throw new Error(data.msg || "Failed to fetch order details");
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
        toast.show({
          description: error.message || "Error loading order details",
          status: "error",
        });
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  if (isLoading) {
    return (
      <Box flex={1} bg="white" safeArea>
        <Header title="Order Details" showBack />
        <Center flex={1}>
          <Spinner size="lg" />
          <Text mt={2}>Loading order details...</Text>
        </Center>
      </Box>
    );
  }

  if (!orderDetails) {
    return (
      <Box flex={1} bg="white" safeArea>
        <Header title="Order Details" showBack />
        <Center flex={1}>
          <Text>Order not found</Text>
        </Center>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="white" safeArea>
      <Header title="Order Details" showBack />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Summary Card */}
        <Box m={4} p={4} bg="white" rounded="lg" shadow={1}>
          <VStack space={3}>
            <HStack justifyContent="space-between" alignItems="center">
              <VStack>
                <Heading size="md">Order #{orderDetails.order_number}</Heading>
                <Text fontSize="sm" color="coolGray.600">
                  {orderDetails.datetime}
                </Text>
              </VStack>
              <Badge
                px={3}
                py={1}
                rounded="full"
                colorScheme={
                  orderDetails.order_status === "ongoing"
                    ? "orange"
                    : orderDetails.order_status === "paid"
                    ? "green"
                    : "red"
                }
              >
                {orderDetails.order_status?.toUpperCase()}
              </Badge>
            </HStack>

            <HStack space={4} alignItems="center">
              <HStack space={2} alignItems="center">
                <MaterialIcons name="table-restaurant" size={20} color="gray" />
                <Text fontSize="md">Table {orderDetails.table_number}</Text>
              </HStack>
            </HStack>
          </VStack>
        </Box>

        {/* Menu Items Card */}
        <Box mx={4} mb={4} p={4} bg="white" rounded="lg" shadow={1}>
          <Heading size="sm" mb={4}>
            Order Items
          </Heading>
          <VStack space={4}>
            {menuItems.map((item, index) => (
              <Box
                key={index}
                borderBottomWidth={index !== menuItems.length - 1 ? 1 : 0}
                borderColor="coolGray.200"
                pb={index !== menuItems.length - 1 ? 4 : 0}
              >
                <HStack justifyContent="space-between" alignItems="flex-start">
                  <VStack flex={1} space={1}>
                    <Text fontSize="md" fontWeight="bold">
                      {item.menu_name}
                    </Text>
                    <HStack space={2} alignItems="center">
                      <Text color="coolGray.600">Qty: {item.quantity}</Text>
                      {item.offer > 0 && (
                        <Badge
                          colorScheme="red"
                          variant="subtle"
                          rounded="full"
                          px={3}
                          minW={16}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text fontSize="xs" fontWeight="medium">
                            {item.offer}% OFF
                          </Text>
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                  <VStack alignItems="flex-end" space={1}>
                    <Text fontSize="md" fontWeight="semibold">
                      ₹{item.menu_sub_total}
                    </Text>
                    <Text fontSize="sm" color="coolGray.600">
                      @₹{item.price}
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* Bill Details Card */}
        <Box mx={4} mb={4} p={4} bg="white" rounded="lg" shadow={1}>
          <Heading size="sm" mb={4}>
            Bill Details
          </Heading>
          <VStack space={3}>
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Item Total</Text>
              <Text>₹{orderDetails.total_bill_amount}</Text>
            </HStack>

            <HStack justifyContent="space-between">
              <Text color="coolGray.600">
                Service Charge ({orderDetails.service_charges_percent}%)
              </Text>
              <Text>₹{orderDetails.service_charges_amount}</Text>
            </HStack>

            <HStack justifyContent="space-between">
              <Text color="coolGray.600">
                GST ({orderDetails.gst_percent}%)
              </Text>
              <Text>₹{orderDetails.gst_amount}</Text>
            </HStack>

            {orderDetails.discount_amount > 0 && (
              <HStack justifyContent="space-between">
                <Text color="green.600">
                  Discount ({orderDetails.discount_percent}%)
                </Text>
                <Text color="green.600">-₹{orderDetails.discount_amount}</Text>
              </HStack>
            )}

            <HStack
              justifyContent="space-between"
              pt={2}
              borderTopWidth={1}
              borderColor="coolGray.200"
            >
              <Text fontWeight="bold">Grand Total</Text>
              <Text fontWeight="bold" fontSize="lg">
                ₹{orderDetails.grand_total}
              </Text>
            </HStack>
          </VStack>
        </Box>

        {/* Invoice Button */}
        {invoiceUrl && (
          <Pressable onPress={() => Linking.openURL(invoiceUrl)} mx={4} mb={4}>
            <Box
              bg="blue.50"
              p={4}
              rounded="lg"
              borderWidth={1}
              borderColor="blue.200"
            >
              <HStack space={2} alignItems="center" justifyContent="center">
                <MaterialIcons name="receipt" size={24} color="#3182CE" />
                <Text color="blue.600" fontWeight="semibold">
                  View Invoice
                </Text>
              </HStack>
            </Box>
          </Pressable>
        )}
      </ScrollView>
    </Box>
  );
}
