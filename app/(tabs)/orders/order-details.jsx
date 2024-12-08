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
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);

  // Update sample order details to match API structure exactly
  const sampleOrderDetails = {
    order_details: {
      order_id: 1978,
      order_number: "902061",
      table_number: "1",
      order_status: "ongoing",
      menu_count: 1,
      total_bill: 80.0,
      service_charges_percent: 1.0,
      service_charges_amount: 0.8,
      gst_percent: 1.0,
      gst_amount: 0.8,
      discount_percent: 0.0,
      discount_amount: 0.0,
      grand_total: 81.6,
      datetime: "06-Dec-2024 08:27:09 PM",
    },
    menu_details: [
      {
        menu_id: 116,
        menu_name: "Medu Vada",
        price: 80,
        quantity: 1,
        offer: 0,
        menu_sub_total: 80.0,
      },
    ],
    invoice_url: null,
  };

  const fetchOrderDetails = async () => {
    try {
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
      console.log("Order Details Response:", data);

      if (data.st === 1 && data.lists) {
        setOrderDetails(data.lists);
      } else {
        // Use sample data for testing
        setOrderDetails(sampleOrderDetails);
        toast.show({
          description: "Using sample data for testing",
          status: "info",
        });
      }
    } catch (error) {
      console.error("Fetch Order Details Error:", error);
      // Use sample data on error
      setOrderDetails(sampleOrderDetails);
      toast.show({
        description: "Using sample data for testing",
        status: "info",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  if (!orderDetails) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Text>Order not found</Text>
      </Box>
    );
  }

  const { order_details, menu_details, invoice_url } = orderDetails;

  return (
    <Box flex={1} bg="gray.50" safeArea position="relative">
      <Box px={4} py={3} bg="white" shadow={2} mb={1}>
        <HStack alignItems="center" justifyContent="space-between">
          <IconButton
            icon={
              <MaterialIcons name="arrow-back" size={24} color="gray.800" />
            }
            onPress={() => router.back()}
            variant="ghost"
            _pressed={{ bg: "gray.100" }}
            position="absolute"
            left={0}
            zIndex={1}
          />
          <Heading size="md" flex={1} textAlign="center">
            Order Details
          </Heading>
        </HStack>
      </Box>

      <ScrollView flex={1} px={4}>
        {/* Order Status and Date */}
        <HStack justifyContent="space-between" alignItems="center" mt={3}>
          <Text fontSize="lg" fontWeight="semibold">
            {order_details.order_status.charAt(0).toUpperCase() +
              order_details.order_status.slice(1)}{" "}
            order
          </Text>
          <Text fontSize="sm" color="gray.500">
            {order_details.datetime.split(" ")[0]}
          </Text>
        </HStack>

        {/* Order Basic Info Card */}
        <Box bg="white" p={4} rounded="lg" shadow={1} mb={4}>
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontSize="lg" fontWeight="bold">
              #{order_details.order_number}
            </Text>
            <Text fontSize="sm" color="gray.500">
              {order_details.datetime.split(" ")[1]}{" "}
              {order_details.datetime.split(" ")[2]}
            </Text>
          </HStack>

          {/* Table Number */}
          <HStack justifyContent="space-between" alignItems="center" mt={2}>
            <HStack space={2} alignItems="center">
              <MaterialIcons
                name="table-restaurant"
                size={16}
                color="gray.600"
              />
              <Text fontSize="md" fontWeight="semibold">
                Table {order_details.table_number}
              </Text>
            </HStack>
          </HStack>

          {/* Menu Count and Total */}
          <HStack justifyContent="space-between" alignItems="center" mt={2}>
            <HStack space={2} alignItems="center">
              <MaterialIcons name="receipt" size={14} color="gray.600" />
              <Text fontSize="md" fontWeight="semibold">
                {order_details.menu_count}{" "}
                {order_details.menu_count > 1 ? "Items" : "Item"}
              </Text>
            </HStack>
            <Text fontSize="md" fontWeight="semibold" color="blue.500">
              ₹{order_details.total_bill.toFixed(2)}
            </Text>
          </HStack>
        </Box>
        {/* Menu Items */}
        {menu_details.map((item) => (
          <Box
            key={item.menu_id}
            bg="white"
            rounded="lg"
            shadow={1}
            mb={4}
            p={4}
          >
            <VStack space={2}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="md" fontWeight="semibold">
                  {item.menu_name}
                </Text>
                {/* Always show offer badge, 0% if no offer */}
                <Box
                  bg={item.offer > 0 ? "red.500" : "gray.200"}
                  px={2}
                  py={1}
                  rounded="full"
                >
                  <Text
                    fontSize="xs"
                    color={item.offer > 0 ? "white" : "gray.600"}
                  >
                    {item.offer}% Off
                  </Text>
                </Box>
              </HStack>

              <HStack justifyContent="space-between" alignItems="center">
                <HStack space={2} alignItems="center">
                  <Text fontSize="md" fontWeight="semibold" color="blue.500">
                    ₹{item.price.toFixed(2)}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    x{item.quantity}
                  </Text>
                </HStack>
                <Text fontSize="md" color="gray.600">
                  ₹{item.menu_sub_total.toFixed(2)}
                </Text>
              </HStack>
            </VStack>
          </Box>
        ))}

        {/* Price Breakdown */}
        <Box bg="white" p={4} rounded="lg" shadow={1} mb={4}>
          <VStack space={2}>
            <HStack justifyContent="space-between">
              <Text fontSize="sm" color="gray.500">
                Total Bill
              </Text>
              <Text fontSize="sm">₹{order_details.total_bill.toFixed(2)}</Text>
            </HStack>

            {/* Always show service charges */}
            <HStack justifyContent="space-between">
              <Text fontSize="sm" color="gray.500">
                Service Charges ({order_details.service_charges_percent}%)
              </Text>
              <Text fontSize="sm">
                ₹{order_details.service_charges_amount.toFixed(2)}
              </Text>
            </HStack>

            {/* Always show GST */}
            <HStack justifyContent="space-between">
              <Text fontSize="sm" color="gray.500">
                GST ({order_details.gst_percent}%)
              </Text>
              <Text fontSize="sm">₹{order_details.gst_amount.toFixed(2)}</Text>
            </HStack>

            {/* Always show discount */}
            <HStack justifyContent="space-between">
              <Text fontSize="sm" color="gray.500">
                Discount ({order_details.discount_percent}%)
              </Text>
              <Text
                fontSize="sm"
                color={
                  order_details.discount_amount > 0 ? "red.500" : "gray.500"
                }
              >
                {order_details.discount_amount > 0 ? "-" : ""}₹
                {order_details.discount_amount.toFixed(2)}
              </Text>
            </HStack>

            <HStack
              justifyContent="space-between"
              mt={2}
              pt={2}
              borderTopWidth={1}
              borderTopColor="gray.100"
            >
              <Text fontSize="md" fontWeight="semibold">
                Grand Total
              </Text>
              <Text fontSize="md" fontWeight="semibold" color="blue.500">
                ₹{order_details.grand_total.toFixed(2)}
              </Text>
            </HStack>
          </VStack>
        </Box>

        {/* Invoice Button */}
        <HStack justifyContent="flex-end" px={4} py={2} mb={4}>
          <Pressable
            flexDirection="row"
            alignItems="center"
            bg={invoice_url ? "blue.500" : "gray.200"}
            px={4}
            py={2}
            rounded="full"
            opacity={invoice_url ? 1 : 0.6}
            disabled={!invoice_url}
          >
            <MaterialIcons
              name="file-download"
              size={16}
              color={invoice_url ? "white" : "gray.500"}
            />
            <Text
              fontSize="sm"
              color={invoice_url ? "white" : "gray.500"}
              ml={2}
            >
              {invoice_url ? "Download Invoice" : "No Invoice Available"}
            </Text>
          </Pressable>
        </HStack>
      </ScrollView>
    </Box>
  );
}
