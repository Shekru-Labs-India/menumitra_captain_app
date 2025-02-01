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
  Icon,
  Divider,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl } from "../../../config/api.config";

const formatTime = (dateTimeString) => {
  if (!dateTimeString) return "";
  const [date, time, ampm] = dateTimeString.split(" ");
  const [hours, minutes] = time.split(":").slice(0, 2); // Only take hours and minutes
  return `${date} • ${hours}:${minutes} ${ampm}`;
};

const calculateOrderTimer = (orderTime) => {
  try {
    if (!orderTime) return 0;

    // Parse the time string (format: "04:33:21 PM")
    const [time, period] = orderTime.split(" ");
    const [hours, minutes, seconds] = time.split(":");

    let hour = parseInt(hours);
    if (period === "PM" && hour !== 12) {
      hour += 12;
    } else if (period === "AM" && hour === 12) {
      hour = 0;
    }

    const orderDate = new Date();
    orderDate.setHours(hour);
    orderDate.setMinutes(parseInt(minutes));
    orderDate.setSeconds(parseInt(seconds));

    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime - orderDate) / 1000);
    return Math.max(0, 90 - elapsedSeconds);
  } catch (error) {
    console.error("Error calculating timer:", error);
    return 0;
  }
};

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [invoiceUrl, setInvoiceUrl] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!id) {
        console.error("No order number provided");
        return;
      }

      try {
        console.log("Fetching order details for:", id);
        const accessToken = await AsyncStorage.getItem("access");

        const response = await fetch(`${getBaseUrl()}/order_view`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            order_number: id,
          }),
        });

        const data = await response.json();
        console.log("Order Details Response:", data);

        if (data.st === 1 && data.lists) {
          // Fix datetime parsing based on actual format "27-Jan-2025 03:53:30 PM"
          const [date, time, period] =
            data.lists.order_details.datetime.split(" ");

          // Transform the data to match our UI structure
          const transformedOrder = {
            ...data.lists.order_details,
            menu_items: Array.isArray(data.lists.menu_details)
              ? data.lists.menu_details
              : [data.lists.menu_details], // Handle single object case
            invoice_url: data.lists.invoice_url,
            date: date,
            time: `${time} ${period}`,
            total_quantity: data.lists.menu_details?.[0]?.quantity || 0,
          };

          setOrderDetails(transformedOrder);
          setMenuItems(
            Array.isArray(data.lists.menu_details)
              ? data.lists.menu_details
              : [data.lists.menu_details]
          );
        } else {
          throw new Error(data.msg || "Failed to fetch order details");
        }
      } catch (error) {
        console.error("Fetch Order Details Error:", error);
        toast.show({
          description: "Failed to fetch order details",
          status: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      setIsLoading(true);
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      const storedUserId = await AsyncStorage.getItem("user_id");
      const accessToken = await AsyncStorage.getItem("access");

      const response = await fetch(`${getBaseUrl()}/update_order_status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          outlet_id: storedOutletId,
          order_id: orderDetails.order_id.toString(),
          order_status: newStatus,
          user_id: storedUserId,
        }),
      });

      const data = await response.json();

      if (data.st === 1) {
        toast.show({
          description: `Order ${
            newStatus === "cancelled" ? "cancelled" : "marked as " + newStatus
          } successfully`,
          status: "success",
          duration: 2000,
        });

        router.replace({
          pathname: "/(tabs)/orders",
          params: {
            refresh: Date.now().toString(),
          },
        });
      } else {
        throw new Error(
          data.msg || `Failed to update order status to ${newStatus}`
        );
      }
    } catch (error) {
      console.error("Status Update Error:", error);
      toast.show({
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const StatusActionButton = () => {
    if (!orderDetails) return null;

    switch (orderDetails.order_status?.toLowerCase()) {
      case "placed":
        return (
          <Button
            colorScheme="red"
            leftIcon={<Icon as={MaterialIcons} name="cancel" size="sm" />}
            onPress={() => handleStatusUpdate("cancelled")}
            isLoading={isLoading}
          >
            Cancel Order
          </Button>
        );
      case "cooking":
        return (
          <Button
            colorScheme="orange"
            leftIcon={<Icon as={MaterialIcons} name="room-service" size="sm" />}
            onPress={() => handleStatusUpdate("served")}
            isLoading={isLoading}
          >
            Mark as Served
          </Button>
        );
      case "served":
        return (
          <Button
            colorScheme="green"
            leftIcon={<Icon as={MaterialIcons} name="payment" size="sm" />}
            onPress={() => handleStatusUpdate("paid")}
            isLoading={isLoading}
          >
            Mark as Paid
          </Button>
        );
      default:
        return null;
    }
  };

  const handleTimerEnd = async () => {
    try {
      await handleStatusUpdate("cooking");
    } catch (error) {
      console.error("Error handling timer end:", error);
    }
  };

  useEffect(() => {
    let timerInterval;

    const initTimer = () => {
      if (orderDetails?.order_status?.toLowerCase() === "placed") {
        const remaining = calculateOrderTimer(orderDetails.time);
        setTimeRemaining(remaining);

        if (remaining > 0) {
          timerInterval = setInterval(() => {
            const newTime = calculateOrderTimer(orderDetails.time);
            setTimeRemaining(newTime);

            if (newTime <= 0) {
              clearInterval(timerInterval);
              handleTimerEnd();
            }
          }, 1000);
        } else if (remaining === 0) {
          handleTimerEnd();
        }
      }
    };

    initTimer();

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [orderDetails]);

  const renderTimer = () => {
    if (
      orderDetails?.order_status?.toLowerCase() !== "placed" ||
      timeRemaining <= 0
    ) {
      return null;
    }

    return (
      <HStack
        bg={timeRemaining <= 30 ? "red.100" : "orange.100"}
        p={2}
        rounded="md"
        alignItems="center"
        space={2}
      >
        <Icon
          as={MaterialIcons}
          name="timer"
          size={5}
          color={timeRemaining <= 30 ? "red.500" : "orange.500"}
        />
        <Text
          fontSize="lg"
          color={timeRemaining <= 30 ? "red.500" : "orange.500"}
          fontWeight="bold"
        >
          {timeRemaining} seconds
        </Text>
      </HStack>
    );
  };

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
              <VStack space={2}>
                <Heading size="md">Order #{orderDetails.order_number}</Heading>
                <Text fontSize="sm" color="coolGray.600">
                  {orderDetails.date} • {orderDetails.time}
                </Text>
                {renderTimer()}
              </VStack>
              <Badge
                px={3}
                py={1}
                rounded="full"
                colorScheme={
                  orderDetails.order_status === "cooking"
                    ? "orange"
                    : orderDetails.order_status === "paid"
                    ? "green"
                    : orderDetails.order_status === "placed"
                    ? "purple"
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
          <HStack justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="sm">
              Order Items{" "}
              <Text color="coolGray.600" fontSize="sm">
                ({menuItems.length} {menuItems.length === 1 ? "item" : "items"})
              </Text>
            </Heading>
            <Text color="coolGray.600" fontSize="sm">
              Total Qty:{" "}
              {menuItems.reduce((sum, item) => sum + Number(item.quantity), 0)}
            </Text>
          </HStack>
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
                      {item.menu_name}{" "}
                      <Text fontSize="sm" color="coolGray.600">
                        ({item.quantity})
                      </Text>
                    </Text>
                    <HStack space={2} alignItems="center">
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
                      ₹{item.price}
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
            {/* Item Total */}
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Item Total</Text>
              <Text>₹{Number(orderDetails.total_bill_amount).toFixed(2)}</Text>
            </HStack>

            {/* Discount (if applicable) */}
            {orderDetails.discount_amount > 0 && (
              <HStack justifyContent="space-between">
                <Text color="green.600">
                  Discount ({orderDetails.discount_percent}%)
                </Text>
                <Text color="green.600">
                  -₹{Number(orderDetails.discount_amount).toFixed(2)}
                </Text>
              </HStack>
            )}

            {/* Total after discount */}
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Total after discount</Text>
              <Text>
                ₹
                {Number(
                  orderDetails.total_bill_amount - orderDetails.discount_amount
                ).toFixed(2)}
              </Text>
            </HStack>

            {/* Service Charge */}
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">
                Service Charge ({orderDetails.service_charges_percent}%)
              </Text>
              <Text>
                ₹{Number(orderDetails.service_charges_amount).toFixed(2)}
              </Text>
            </HStack>

            {/* GST */}
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">
                GST ({orderDetails.gst_percent}%)
              </Text>
              <Text>₹{Number(orderDetails.gst_amount).toFixed(2)}</Text>
            </HStack>

            {/* Grand Total */}
            <HStack
              justifyContent="space-between"
              pt={2}
              borderTopWidth={1}
              borderColor="coolGray.200"
            >
              <Text fontWeight="bold">Grand Total</Text>
              <Text fontWeight="bold" fontSize="lg">
                ₹{Number(orderDetails.grand_total).toFixed(2)}
              </Text>
            </HStack>
          </VStack>
        </Box>

        {/* Status Action Button */}
        <Box px={4} pb={4}>
          <StatusActionButton />
        </Box>

        {/* Invoice Button */}
        {orderDetails.order_status === "paid" && orderDetails.invoice_url && (
          <Pressable
            onPress={() => Linking.openURL(orderDetails.invoice_url)}
            mx={4}
            mb={4}
          >
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
