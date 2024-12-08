import React, { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
  ScrollView,
  Heading,
  IconButton,
  Input,
  Select,
  Spinner,
  useToast,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function OrdersScreen() {
  const router = useRouter();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [viewType, setViewType] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [isAscending, setIsAscending] = useState(true);
  const [orderStatus, setOrderStatus] = useState("ongoing");

  // Add sample data when API returns empty
  const sampleOrders = [
    {
      order_id: 1978,
      order_number: "902061",
      table_number: "1",
      order_type: "Parcel",
      order_status: "ongoing",
      restaurant_name: "AK BIRYANI",
      total_bill: 80.0,
      date_time: "08:27 PM",
      menu_details: [
        {
          menu_name: "Medu vada",
          price: 80,
          quantity: 1,
        },
      ],
    },
    {
      order_id: 1973,
      order_number: "806183",
      table_number: "1",
      order_type: "Dine In",
      order_status: "completed",
      restaurant_name: "AK BIRYANI",
      total_bill: 1430.0,
      date_time: "05:05 PM",
      menu_details: [
        {
          menu_name: "Jalebi",
          price: 200,
          quantity: 2,
        },
        {
          menu_name: "Idali",
          price: 40,
          quantity: 2,
        },
      ],
    },
  ];

  // Get current date in required format (DD MMM YYYY)
  const getCurrentDate = () => {
    const date = new Date();
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/ /g, " ");
  };

  const fetchOrders = async () => {
    if (!restaurantId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/captain_order/listview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_id: parseInt(restaurantId),
          order_status: orderStatus,
          date: getCurrentDate(),
        }),
      });

      const data = await response.json();
      console.log("Orders Response:", data);

      if (data.st === 1) {
        // Use sample data if API returns empty list
        setOrders(data.lists?.length > 0 ? data.lists : sampleOrders);
      } else {
        // Use sample data for testing
        setOrders(sampleOrders);
        toast.show({
          description: "Using sample data for testing",
          status: "info",
        });
      }
    } catch (error) {
      console.error("Fetch Orders Error:", error);
      // Use sample data on error
      setOrders(sampleOrders);
      toast.show({
        description: "Using sample data for testing",
        status: "info",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get restaurant_id from AsyncStorage
  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
        if (storedRestaurantId) {
          setRestaurantId(parseInt(storedRestaurantId));
        }
      } catch (error) {
        console.error("Error getting stored data:", error);
      }
    };

    getStoredData();
  }, []);

  // Refresh orders when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (restaurantId) {
        fetchOrders();
      }
    }, [restaurantId, orderStatus])
  );

  // Filter and sort orders
  const filteredOrders = orders
    .filter((order) => {
      return (
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.restaurant_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        order.order_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison = new Date(b.date_time) - new Date(a.date_time);
          break;
        case "amount":
          comparison = a.total_bill - b.total_bill;
          break;
        case "status":
          comparison = a.order_status.localeCompare(b.order_status);
          break;
      }
      return isAscending ? comparison : -comparison;
    });

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
        <Text mt={2}>Loading orders...</Text>
      </Box>
    );
  }

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

        {/* Filters */}
        <HStack px={4} py={2} space={2} alignItems="center">
          <Input
            flex={1}
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            InputLeftElement={
              <MaterialIcons
                name="search"
                size={20}
                color="gray"
                style={{ marginLeft: 8 }}
              />
            }
          />
          <IconButton
            icon={
              <MaterialIcons
                name={viewType === "grid" ? "view-list" : "grid-view"}
                size={24}
                color="coolGray.600"
              />
            }
            onPress={() => setViewType(viewType === "grid" ? "list" : "grid")}
          />
          <Select
            w="110"
            selectedValue={sortBy}
            onValueChange={setSortBy}
            placeholder="Sort by"
          >
            <Select.Item label="Date" value="date" />
            <Select.Item label="Amount" value="amount" />
            <Select.Item label="Status" value="status" />
          </Select>
          <IconButton
            icon={
              <MaterialIcons
                name={isAscending ? "arrow-upward" : "arrow-downward"}
                size={24}
                color="coolGray.600"
              />
            }
            onPress={() => setIsAscending(!isAscending)}
          />
        </HStack>

        {/* Orders List/Grid */}
        <ScrollView flex={1}>
          {viewType === "list" ? (
            <VStack space={3} px={4}>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <Pressable
                    key={order.order_id}
                    onPress={() => {
                      router.push({
                        pathname: "/orders/order-details",
                        params: { id: order.order_id },
                      });
                    }}
                  >
                    <Box bg="white" rounded="lg" shadow={2} p={4}>
                      <VStack space={2}>
                        <HStack
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Text fontSize="lg" fontWeight="bold">
                            #{order.order_number}
                          </Text>
                          <Text color="gray.500">{order.date_time}</Text>
                        </HStack>

                        <HStack
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Text fontSize="md" color="gray.700">
                            {order.restaurant_name}
                          </Text>
                          <Text
                            fontSize="md"
                            fontWeight="bold"
                            color="blue.500"
                          >
                            ₹{order.total_bill}
                          </Text>
                        </HStack>

                        <HStack
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <HStack space={2} alignItems="center">
                            <MaterialIcons
                              name={
                                order.order_type.toLowerCase() === "dine in"
                                  ? "restaurant"
                                  : "local-shipping"
                              }
                              size={16}
                              color="gray"
                            />
                            <Text color="gray.600">{order.order_type}</Text>
                          </HStack>
                          <Text
                            fontSize="sm"
                            color={
                              order.order_status === "completed"
                                ? "green.500"
                                : "orange.500"
                            }
                          >
                            {order.order_status}
                          </Text>
                        </HStack>

                        {/* Menu Items Summary */}
                        <Text fontSize="sm" color="gray.500">
                          {order.menu_details.length} items
                        </Text>
                      </VStack>
                    </Box>
                  </Pressable>
                ))
              ) : (
                <Box
                  flex={1}
                  justifyContent="center"
                  alignItems="center"
                  py={10}
                >
                  <Text color="gray.500">No orders found</Text>
                </Box>
              )}
            </VStack>
          ) : (
            <Box px={4} py={2}>
              <HStack flexWrap="wrap" justifyContent="space-between">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <Pressable
                      key={order.order_id}
                      width="48%"
                      mb={4}
                      onPress={() => {
                        router.push({
                          pathname: "/orders/order-details",
                          params: { id: order.order_id },
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
                          <HStack
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text fontSize="sm" fontWeight="bold">
                              #{order.order_number}
                            </Text>
                            <Text fontSize="xs" color="gray.400">
                              {order.date_time}
                            </Text>
                          </HStack>

                          <Text
                            fontSize="sm"
                            fontWeight="medium"
                            color="gray.700"
                          >
                            {order.restaurant_name}
                          </Text>

                          <HStack
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text fontSize="sm" color="gray.500">
                              {order.order_type}
                            </Text>
                            <Text
                              fontSize="sm"
                              fontWeight="bold"
                              color="blue.500"
                            >
                              ₹{order.total_bill}
                            </Text>
                          </HStack>

                          <HStack
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text
                              fontSize="xs"
                              fontWeight="medium"
                              color={
                                order.order_status === "completed"
                                  ? "green.500"
                                  : "orange.500"
                              }
                            >
                              {order.order_status}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {order.menu_details.length} items
                            </Text>
                          </HStack>
                        </VStack>
                      </Box>
                    </Pressable>
                  ))
                ) : (
                  <Box
                    flex={1}
                    justifyContent="center"
                    alignItems="center"
                    py={10}
                  >
                    <Text color="gray.500">No orders found</Text>
                  </Box>
                )}
              </HStack>
            </Box>
          )}
        </ScrollView>
      </VStack>
    </Box>
  );
}
