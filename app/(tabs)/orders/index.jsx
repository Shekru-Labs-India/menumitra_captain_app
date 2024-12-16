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
  Center,
  FlatList,
  Badge,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import Header from "../../components/Header";

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
  const [orderStatus, setOrderStatus] = useState("all");
  const [isAscending, setIsAscending] = useState(false);

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
      // Make multiple API calls when status is "all"
      if (orderStatus === "all") {
        const statuses = ["ongoing", "completed", "cancelled"];
        const allOrdersPromises = statuses.map((status) =>
          fetch(`${API_BASE_URL}/captain_order/listview`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              restaurant_id: parseInt(restaurantId),
              order_status: status,
              date: getCurrentDate(),
            }),
          }).then((res) => res.json())
        );

        const responses = await Promise.all(allOrdersPromises);
        const allOrders = responses.reduce((acc, data) => {
          if (data.st === 1 && data.lists) {
            return [...acc, ...data.lists];
          }
          return acc;
        }, []);

        setOrders(allOrders);
      } else {
        // Single API call for specific status
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
          setOrders(data.lists || []);
        } else {
          setOrders([]);
          toast.show({
            description: data.msg || "Failed to fetch orders",
            status: "error",
          });
        }
      }
    } catch (error) {
      console.error("Fetch Orders Error:", error);
      setOrders([]);
      toast.show({
        description: "Error fetching orders",
        status: "error",
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
      if (orderStatus !== "all") {
        return order.order_status === orderStatus;
      }
      return true;
    })
    .filter((order) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        order.order_number.toLowerCase().includes(searchLower) ||
        order.restaurant_name.toLowerCase().includes(searchLower) ||
        order.order_type.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          const timeA = new Date(`${getCurrentDate()} ${a.date_time}`);
          const timeB = new Date(`${getCurrentDate()} ${b.date_time}`);
          comparison = timeB - timeA;
          break;
        case "amount":
          comparison = b.total_bill - a.total_bill;
          break;
        default:
          const defaultTimeA = new Date(`${getCurrentDate()} ${a.date_time}`);
          const defaultTimeB = new Date(`${getCurrentDate()} ${b.date_time}`);
          comparison = defaultTimeB - defaultTimeA;
      }
      return isAscending ? -comparison : comparison;
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
    <Box flex={1} bg="white" safeArea>
      <Header title="Orders" />

      {/* Search and Filters Row */}
      <HStack
        px={4}
        py={3}
        space={3}
        alignItems="center"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
      >
        {/* Search Bar */}
        <Input
          flex={1}
          h="36px"
          w="80%"
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          borderRadius="md"
          fontSize="sm"
          InputLeftElement={
            <Box pl={3}>
              <MaterialIcons name="search" size={20} color="coolGray.400" />
            </Box>
          }
        />

        {/* Grid/List View Toggle */}
        <IconButton
          variant="outline"
          borderColor="coolGray.300"
          icon={
            <MaterialIcons
              name={viewType === "grid" ? "view-list" : "grid-view"}
              size={22}
              color="coolGray.500"
            />
          }
          onPress={() => setViewType(viewType === "grid" ? "list" : "grid")}
        />

        {/* Sort Direction Toggle */}
        <IconButton
          variant="outline"
          borderColor="coolGray.300"
          icon={
            <MaterialIcons
              name={isAscending ? "arrow-upward" : "arrow-downward"}
              size={22}
              color="coolGray.500"
            />
          }
          onPress={() => setIsAscending(!isAscending)}
        />
      </HStack>

      {/* Filters Row */}
      <HStack px={4} py={2} space={3}>
        {/* Status Filter */}
        <Select
          flex={1}
          h="36px"
          borderRadius="md"
          selectedValue={orderStatus}
          onValueChange={(value) => setOrderStatus(value)}
          _selectedItem={{
            bg: "coolGray.100",
            endIcon: (
              <MaterialIcons name="check" size={20} color="coolGray.600" />
            ),
          }}
        >
          <Select.Item label="All Status" value="all" />
          <Select.Item label="Ongoing" value="ongoing" />
          <Select.Item label="Completed" value="completed" />
          <Select.Item label="Cancelled" value="cancelled" />
        </Select>

        {/* Sort By Filter */}
        <Select
          flex={1}
          h="36px"
          borderRadius="md"
          selectedValue={sortBy}
          onValueChange={(value) => setSortBy(value)}
          _selectedItem={{
            bg: "coolGray.100",
            endIcon: (
              <MaterialIcons name="check" size={20} color="coolGray.600" />
            ),
          }}
        >
          <Select.Item label="Date" value="date" />
          <Select.Item label="Amount" value="amount" />
        </Select>
      </HStack>

      {/* Orders List/Grid */}
      {isLoading ? (
        <Center flex={1}>
          <Spinner size="lg" />
          <Text mt={2}>Loading orders...</Text>
        </Center>
      ) : filteredOrders.length === 0 ? (
        <Center flex={1}>
          <MaterialIcons name="receipt-long" size={48} color="coolGray.300" />
          <Text mt={2} color="coolGray.600">
            No orders found
          </Text>
        </Center>
      ) : (
        <FlatList
          data={filteredOrders}
          key={viewType}
          numColumns={viewType === "grid" ? 2 : 1}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                router.push({
                  pathname: "/orders/order-details",
                  params: { id: item.order_number },
                });
              }}
              flex={viewType === "grid" ? 1 : undefined}
            >
              <Box bg="white" rounded="lg" shadow={1} m={2} p={3} flex={1}>
                <VStack space={2}>
                  {/* Order Header */}
                  <VStack space={2}>
                    {/* Order Number and Badge in same row */}
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text
                        fontSize={viewType === "grid" ? "sm" : "lg"}
                        fontWeight="bold"
                        numberOfLines={1}
                        flex={1}
                      >
                        #{item.order_number}
                      </Text>
                      <Badge
                        colorScheme={
                          item.order_status === "ongoing"
                            ? "orange"
                            : item.order_status === "completed"
                            ? "green"
                            : "red"
                        }
                        rounded="sm"
                      >
                        {item.order_status.toUpperCase()}
                      </Badge>
                    </HStack>

                    {/* Restaurant Name */}
                    <Text fontSize="xs" color="coolGray.600" numberOfLines={1}>
                      {item.restaurant_name}
                    </Text>
                  </VStack>

                  {/* Rest of the code remains the same */}
                  <HStack
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <HStack space={1} alignItems="center" flex={1}>
                      <MaterialIcons
                        name={
                          item.order_type === "Dine In"
                            ? "restaurant"
                            : "delivery-dining"
                        }
                        size={14}
                        color="coolGray.500"
                      />
                      <Text
                        fontSize="xs"
                        color="coolGray.600"
                        numberOfLines={1}
                        flex={1}
                      >
                        {item.order_type}{" "}
                        {item.table_number && `• Table ${item.table_number}`}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="coolGray.500" numberOfLines={1}>
                      {item.date_time}
                    </Text>
                  </HStack>

                  {/* Menu Items section remains the same */}
                  <VStack space={1}>
                    <Text fontSize="xs" color="coolGray.600" numberOfLines={1}>
                      {item.menu_details.length} items
                    </Text>
                    {viewType === "list" &&
                      item.menu_details.map((menu, index) => (
                        <HStack key={index} justifyContent="space-between">
                          <Text fontSize="xs" flex={1} numberOfLines={1}>
                            {menu.quantity}x {menu.menu_name}
                          </Text>
                          <Text fontSize="xs">
                            ₹{menu.price * menu.quantity}
                          </Text>
                        </HStack>
                      ))}
                  </VStack>

                  {/* Total section remains the same */}
                  <HStack
                    justifyContent="space-between"
                    pt={2}
                    borderTopWidth={1}
                    borderTopColor="coolGray.100"
                  >
                    <Text
                      fontSize={viewType === "grid" ? "xs" : "sm"}
                      fontWeight="bold"
                    >
                      Total
                    </Text>
                    <Text
                      fontSize={viewType === "grid" ? "xs" : "sm"}
                      fontWeight="bold"
                      color="blue.500"
                    >
                      ₹{item.total_bill}
                    </Text>
                  </HStack>
                </VStack>
              </Box>
            </Pressable>
          )}
          keyExtractor={(item) => item.order_id.toString()}
          contentContainerStyle={{ padding: 2 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Box>
  );
}
