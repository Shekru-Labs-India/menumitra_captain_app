import React, { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
  ScrollView,
  Heading,
  IconButton,
  Button,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
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

  const expandAll = () => {
    const allDates = new Set(Object.keys(ordersByDate));
    setExpandedDates(allDates);
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
    setExpandedOrders(new Set());
  };

  const toggleDateExpand = (date) => {
    const newExpandedDates = new Set(expandedDates);
    if (newExpandedDates.has(date)) {
      newExpandedDates.delete(date);
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

  const isAllExpanded = () => {
    return Object.keys(ordersByDate).length === expandedDates.size;
  };

  return (
    <Box flex={1} bg="gray.50" safeArea>
      <VStack space={4} flex={1}>
        {/* Header */}
        <Box px={4} py={3} bg="white" shadow={2} mb={1}>
          <HStack alignItems="center" justifyContent="space-between">
            <IconButton
              icon={
                <MaterialIcons name="arrow-back" size={24} color="#333333" />
              }
              onPress={() => router.back()}
              variant="ghost"
              _pressed={{ bg: "gray.100" }}
              position="absolute"
              left={0}
              zIndex={1}
            />
            <Heading size="md" flex={1} textAlign="center">
              Orders
            </Heading>
          </HStack>
        </Box>

        <Box alignItems="flex-end" px={4}>
          <Pressable onPress={isAllExpanded() ? collapseAll : expandAll}>
            <Text color="gray.500" fontSize="sm">
              {isAllExpanded() ? "Collapse All" : "Expand All"}
            </Text>
          </Pressable>
        </Box>

        {/* Order List */}
        <ScrollView flex={1}>
          <VStack space={3} px={3} py={2}>
            {Object.entries(ordersByDate).map(([date, orders]) => (
              <Box key={date} mb={3}>
                <Pressable onPress={() => toggleDateExpand(date)}>
                  <HStack
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                    px={3}
                    py={2}
                    bg="gray.100"
                    rounded="md"
                  >
                    <Text fontSize="sm" fontWeight="semibold">
                      {date}
                    </Text>
                    <MaterialIcons
                      name={
                        expandedDates.has(date) ? "expand-less" : "expand-more"
                      }
                      size={18}
                      color="#A0AEC0"
                    />
                  </HStack>
                </Pressable>

                {expandedDates.has(date) && (
                  <VStack space={2}>
                    {orders.map((order) => (
                      <Pressable
                        key={order.id}
                        onPress={() => {
                          router.push({
                            pathname: "/orders/order-details",
                            params: { id: order.id },
                          });
                        }}
                      >
                        <Box
                          bg="white"
                          shadow={1}
                          rounded="xl"
                          p={3}
                          borderWidth={1}
                          borderColor="gray.100"
                        >
                          <VStack space={2}>
                            {/* Order ID and Time */}
                            <HStack
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <HStack space={1} alignItems="center">
                                <Text
                                  fontSize="lg"
                                  fontWeight="bold"
                                  color="black"
                                >
                                  #{order.id}
                                </Text>
                              </HStack>
                              <Text fontSize="sm" color="gray.400">
                                {order.time}
                              </Text>
                            </HStack>

                            {/* Hotel Name */}
                            <HStack space={2} alignItems="center">
                              <MaterialIcons
                                name="store"
                                size={18}
                                color="gray.700"
                              />
                              <Text
                                fontSize="md"
                                fontWeight="semibold"
                                color="gray.700"
                              >
                                {order.hotelName}
                              </Text>
                            </HStack>

                            {/* Order Type and Location */}
                            <HStack
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <HStack space={4} alignItems="center">
                                <HStack space={1} alignItems="center">
                                  <MaterialIcons
                                    name={
                                      order.type.toLowerCase() === "dine in"
                                        ? "restaurant"
                                        : "local-shipping"
                                    }
                                    size={16}
                                    color="gray.500"
                                  />
                                  <Text fontSize="sm" color="gray.500">
                                    {order.type}
                                  </Text>
                                </HStack>
                                <HStack space={1} alignItems="center">
                                  <MaterialIcons
                                    name="room"
                                    size={16}
                                    color="gray.500"
                                  />
                                  <Text fontSize="sm" color="gray.500">
                                    {order.additionalInfo}
                                  </Text>
                                </HStack>
                              </HStack>
                            </HStack>

                            {/* Menu Count and Price */}
                            <HStack
                              justifyContent="space-between"
                              alignItems="center"
                              mt={1}
                            >
                              <HStack space={1} alignItems="center">
                                <MaterialIcons
                                  name="assignment"
                                  size={16}
                                  color="gray.500"
                                />
                                <Text fontSize="sm" color="gray.500">
                                  {order.menuCount}
                                </Text>
                              </HStack>
                              <HStack alignItems="center" space={2}>
                                <Text
                                  fontSize="md"
                                  fontWeight="bold"
                                  color="blue.500"
                                >
                                  ₹{order.amount}
                                </Text>
                                <Text
                                  fontSize="sm"
                                  color="gray.400"
                                  textDecorationLine="line-through"
                                >
                                  ₹{order.originalAmount}
                                </Text>
                              </HStack>
                            </HStack>

                            {/* Status and Payment */}
                            <HStack
                              justifyContent="space-between"
                              alignItems="center"
                              mt={1}
                            >
                              <Text
                                fontSize="sm"
                                fontWeight="medium"
                                color={
                                  order.status.toLowerCase() === "completed"
                                    ? "green.500"
                                    : "orange.500"
                                }
                              >
                                {order.status}
                              </Text>
                              <Box
                                bg="gray.50"
                                px={2}
                                py={1}
                                rounded="full"
                                borderWidth={1}
                                borderColor="gray.200"
                              >
                                <HStack space={1} alignItems="center">
                                  <MaterialIcons
                                    name={
                                      order.paymentMode.toLowerCase() === "card"
                                        ? "credit-card"
                                        : "attach-money"
                                    }
                                    size={14}
                                    color="gray.600"
                                  />
                                  <Text fontSize="xs" color="gray.600">
                                    {order.paymentMode}
                                  </Text>
                                </HStack>
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
