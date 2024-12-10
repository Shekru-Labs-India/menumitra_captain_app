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
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";

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

  const fetchOrderDetails = async () => {
    try {
      console.log("Fetching order details for order number:", id);

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
        console.error("Failed to fetch order details:", data);
        toast.show({
          description: data.msg || "Failed to fetch order details",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Fetch Order Details Error:", error);
      toast.show({
        description: "Error fetching order details",
        status: "error",
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
    <Box flex={1} bg="white" safeArea>
      <Header title="Order Details" />

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
              {formatTime(order_details.datetime)}
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
            mb={2}
            p={4}
          >
            <VStack space={3}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="md" fontWeight="semibold">
                  {item.menu_name}
                </Text>
                {item.offer > 0 && (
                  <Badge colorScheme="red" rounded="sm">
                    {item.offer}% Off
                  </Badge>
                )}
              </HStack>
              <Box h={0.5} bg="gray.200" />
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

            {order_details.service_charges_percent > 0 && (
              <HStack justifyContent="space-between">
                <Text fontSize="sm" color="gray.500">
                  Service Charges ({order_details.service_charges_percent}%)
                </Text>
                <Text fontSize="sm">
                  ₹{order_details.service_charges_amount.toFixed(2)}
                </Text>
              </HStack>
            )}

            {order_details.gst_percent > 0 && (
              <HStack justifyContent="space-between">
                <Text fontSize="sm" color="gray.500">
                  GST ({order_details.gst_percent}%)
                </Text>
                <Text fontSize="sm">
                  ₹{order_details.gst_amount.toFixed(2)}
                </Text>
              </HStack>
            )}

            {order_details.discount_amount > 0 && (
              <HStack justifyContent="space-between">
                <Text fontSize="sm" color="gray.500">
                  Discount ({order_details.discount_percent}%)
                </Text>
                <Text fontSize="sm" color="red.500">
                  -₹{order_details.discount_amount.toFixed(2)}
                </Text>
              </HStack>
            )}

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

        {/* Invoice Button - Only show if invoice_url exists */}
        {invoice_url && (
          <HStack justifyContent="flex-end" px={4} py={2} mb={4}>
            <Pressable
              flexDirection="row"
              alignItems="center"
              bg="blue.500"
              px={4}
              py={2}
              rounded="full"
            >
              <MaterialIcons name="file-download" size={16} color="white" />
              <Text fontSize="sm" color="white" ml={2}>
                Download Invoice
              </Text>
            </Pressable>
          </HStack>
        )}
      </ScrollView>
    </Box>
  );
}
