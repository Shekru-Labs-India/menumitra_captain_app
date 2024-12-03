import React, { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
  ScrollView,
  Icon,
  Heading,
  IconButton,
} from "native-base";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function OrdersScreen() {
  const router = useRouter();
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  // Mock data for orders grouped by date
  const ordersByDate = {
    "03 Dec 2024": [
      {
        id: "945917",
        hotelName: "VIRAJ HOTEL",
        location: "PUNE",
        time: "01:21 PM",
        type: "Parcel",
        menuCount: "1 Menu",
        amount: 308.88,
        originalAmount: 343.2,
        status: "Completed",
        paymentMode: "Card",
        additionalInfo: "Garden",
      },
    ],
    "19 Nov 2024": [
      {
        id: "880391",
        hotelName: "VIRAJ HOTEL",
        location: "PUNE",
        time: "08:06 PM",
        type: "Parcel",
        menuCount: "1 Menu",
        amount: 330,
        originalAmount: 366.67,
        status: "Completed",
        paymentMode: "Card",
        additionalInfo: "Garden",
      },
    ],
    "16 Nov 2024": [
      {
        id: "667851",
        hotelName: "VIRAJ HOTEL",
        location: "PUNE",
        time: "12:44 AM",
        type: "Dine In",
        menuCount: "7 Menu",
        amount: 1671.24,
        originalAmount: 1740.88,
        status: "Completed",
        paymentMode: "Card",
        additionalInfo: "Garden",
      },
    ],
  };

  const toggleDateExpand = (date) => {
    const newExpandedDates = new Set(expandedDates);
    if (newExpandedDates.has(date)) {
      newExpandedDates.delete(date);
      // Collapse all orders under this date
      const newExpandedOrders = new Set(expandedOrders);
      ordersByDate[date].forEach((order) => {
        newExpandedOrders.delete(order.id);
      });
      setExpandedOrders(newExpandedOrders);
    } else {
      newExpandedDates.add(date);
    }
    setExpandedDates(newExpandedDates);
  };

  const toggleOrderExpand = (orderId) => {
    const newExpandedOrders = new Set(expandedOrders);
    if (newExpandedOrders.has(orderId)) {
      newExpandedOrders.delete(orderId);
    } else {
      newExpandedOrders.add(orderId);
    }
    setExpandedOrders(newExpandedOrders);
  };

  const expandAll = () => {
    const allDates = new Set(Object.keys(ordersByDate));
    const allOrders = new Set();
    Object.values(ordersByDate).forEach((orders) => {
      orders.forEach((order) => allOrders.add(order.id));
    });
    setExpandedDates(allDates);
    setExpandedOrders(allOrders);
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
    setExpandedOrders(new Set());
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "green.500";
      case "pending":
        return "orange.500";
      default:
        return "gray.500";
    }
  };

  const isAllExpanded = () => {
    return Object.keys(ordersByDate).length === expandedDates.size;
  };

  return (
    <Box flex={1} bg="gray.50" safeArea>
      <VStack space={4} flex={1}>
        {/* Header */}
        <Box
          px={4}
          py={3}
          bg="white"
          shadow={2}
          mb={1}
          borderBottomWidth={1}
          borderBottomColor="gray.100"
        >
          <HStack alignItems="center" justifyContent="space-between">
            <IconButton
              icon={
                <Icon
                  as={Ionicons}
                  name="arrow-back"
                  size={6}
                  color="gray.800"
                />
              }
              onPress={() => router.back()}
              variant="ghost"
              _pressed={{ bg: "gray.100" }}
              position="absolute"
              left={0}
              zIndex={1}
            />
            <Heading size="lg" flex={1} textAlign="center">
              Orders
            </Heading>
          </HStack>
        </Box>

        <Box alignItems="flex-end" px={4}>
          <Pressable onPress={isAllExpanded() ? collapseAll : expandAll}>
            <Text
              color={isAllExpanded() ? "gray.500" : "gray.500"}
              fontSize="sm"
            >
              {isAllExpanded() ? "Collapse All" : "Expand All"}
            </Text>
          </Pressable>
        </Box>
        {/* Order List */}
        <ScrollView flex={1}>
          <VStack space={2} px={4}>
            {Object.entries(ordersByDate).map(([date, orders]) => (
              <Box key={date}>
                <Pressable onPress={() => toggleDateExpand(date)}>
                  <HStack
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                  >
                    <Text fontSize="md" fontWeight="semibold">
                      {date}
                    </Text>
                    <HStack space={2} alignItems="center">
                      <Icon
                        as={Ionicons}
                        name={
                          expandedDates.has(date)
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={5}
                        color="gray.400"
                      />
                    </HStack>
                  </HStack>
                </Pressable>

                {expandedDates.has(date) && (
                  <VStack space={2} mt={2}>
                    {orders.map((order) => (
                      <Pressable
                        key={order.id}
                        onPress={() => {
                          try {
                            router.push("/order-details");
                          } catch (error) {
                            console.error("Navigation error:", error);
                          }
                        }}
                      >
                        <Box
                          bg="white"
                          shadow="2"
                          borderWidth={1}
                          borderColor="gray.100"
                          rounded="xl"
                          mb={2}
                          p={3}
                          overflow="hidden"
                          style={{
                            shadowColor: "#000",
                            shadowOffset: {
                              width: 0,
                              height: 1,
                            },
                            shadowOpacity: 0.18,
                            shadowRadius: 1.0,
                            elevation: 1,
                          }}
                        >
                          <VStack space={1.5}>
                            {/* Order ID and Time */}
                            <HStack
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <HStack space={1} alignItems="center">
                                <Text fontSize="sm" color="gray.500">
                                  #
                                </Text>
                                <Text fontSize="sm" fontWeight="semibold">
                                  {order.id}
                                </Text>
                              </HStack>
                              <Text fontSize="xs" color="gray.500">
                                {order.time}
                              </Text>
                            </HStack>

                            {/* Hotel Info with Location Count */}
                            <HStack
                              space={1}
                              alignItems="flex-start"
                              justifyContent="space-between"
                            >
                              <HStack space={1} alignItems="flex-start">
                                <Icon
                                  as={Ionicons}
                                  name="home-outline"
                                  size={4}
                                  color="gray.600"
                                  mt={1}
                                />
                                <VStack space={0}>
                                  <Text fontSize="sm" fontWeight="semibold">
                                    {order.hotelName}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {order.location}
                                  </Text>
                                </VStack>
                              </HStack>
                              <Text fontSize="xs" color="gray.500">
                                1
                              </Text>
                            </HStack>

                            {/* Order Type and Garden Info Row */}
                            <HStack
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <HStack space={2} alignItems="center">
                                <Icon
                                  as={Ionicons}
                                  name={
                                    order.type.toLowerCase() === "dine in"
                                      ? "restaurant-outline"
                                      : "bicycle-outline"
                                  }
                                  size={3.5}
                                  color="gray.500"
                                />
                                <Text fontSize="xs" color="gray.600">
                                  {order.type}
                                </Text>
                              </HStack>
                              <HStack space={1} alignItems="center">
                                <Icon
                                  as={Ionicons}
                                  name="leaf-outline"
                                  size={3.5}
                                  color="gray.500"
                                />
                                <Text fontSize="xs" color="gray.600">
                                  {order.additionalInfo}
                                </Text>
                              </HStack>
                            </HStack>

                            {/* Menu Count and Price Row */}
                            <HStack
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <HStack space={2} alignItems="center">
                                <Icon
                                  as={Ionicons}
                                  name="receipt-outline"
                                  size={3.5}
                                  color="gray.500"
                                />
                                <Text fontSize="xs" color="gray.600">
                                  {order.menuCount}
                                </Text>
                              </HStack>
                              <HStack alignItems="center" space={1}>
                                <Text
                                  fontSize="sm"
                                  fontWeight="semibold"
                                  color="blue.500"
                                >
                                  ₹{order.amount}
                                </Text>
                                <Text
                                  fontSize="xs"
                                  color="gray.400"
                                  textDecorationLine="line-through"
                                >
                                  ₹{order.originalAmount}
                                </Text>
                              </HStack>
                            </HStack>

                            {/* Status and Payment Row */}
                            <HStack
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Text
                                fontSize="xs"
                                color={getStatusColor(order.status)}
                              >
                                {order.status}
                              </Text>
                              <Box
                                bg="gray.50"
                                px={2}
                                py={0.5}
                                rounded="full"
                                borderWidth={1}
                                borderColor="gray.100"
                              >
                                <Text fontSize="2xs" color="gray.600">
                                  {order.paymentMode}
                                </Text>
                              </Box>
                            </HStack>
                          </VStack>
                        </Box>
                      </Pressable>
                    ))}
                  </VStack>
                )}
              </Box>
            ))}
          </VStack>
        </ScrollView>
      </VStack>
    </Box>
  );
}
