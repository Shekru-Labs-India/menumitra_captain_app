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
  const [outletId, setOutletId] = useState(null);
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

  // Add this function to flatten the date-grouped orders
  const flattenOrders = (ordersData) => {
    if (!ordersData) return [];

    return Object.entries(ordersData).flatMap(([date, orders]) =>
      orders.map((order) => ({
        ...order,
        date, // Add the date to each order
      }))
    );
  };

  const fetchOrders = async () => {
    if (!outletId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/captain_order/listview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          order_status: orderStatus === "all" ? "" : orderStatus,
        }),
      });

      const data = await response.json();
      console.log("Orders Response:", data);

      if (data.st === 1 && data.lists) {
        const allOrders = Object.entries(data.lists).reduce(
          (acc, [date, orders]) => {
            const ordersWithDate = orders.map((order) => ({
              ...order,
              date: date,
            }));
            return [...acc, ...ordersWithDate];
          },
          []
        );

        console.log("Processed Orders:", allOrders);
        setOrders(allOrders);
      } else {
        console.log("No orders found or error:", data.msg);
        setOrders([]);
      }
    } catch (error) {
      console.error("Fetch Orders Error:", error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get restaurant_id from AsyncStorage
  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        if (storedOutletId) {
          setOutletId(storedOutletId);
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
      if (outletId) {
        console.log("Fetching orders with status:", orderStatus);
        fetchOrders();
      }
    }, [outletId, orderStatus])
  );

  // Filter and sort orders
  const filteredOrders = React.useMemo(() => {
    return orders
      .filter((order) => {
        // Status filter
        if (orderStatus !== "all" && order.order_status !== orderStatus) {
          return false;
        }

        // Search filter
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          return (
            order.order_number?.toLowerCase().includes(searchLower) ||
            order.table_number?.toString().includes(searchLower) ||
            order.order_type?.toLowerCase().includes(searchLower) ||
            order.order_status?.toLowerCase().includes(searchLower)
          );
        }

        return true;
      })
      .sort((a, b) => {
        // Sort logic
        switch (sortBy) {
          case "date":
            const dateA = new Date(`${a.date} ${a.time}`);
            const dateB = new Date(`${b.date} ${b.time}`);
            return isAscending ? dateA - dateB : dateB - dateA;

          case "amount":
            const amountA = parseFloat(a.grand_total) || 0;
            const amountB = parseFloat(b.grand_total) || 0;
            return isAscending ? amountA - amountB : amountB - amountA;

          default:
            return 0;
        }
      });
  }, [orders, orderStatus, searchQuery, sortBy, isAscending]);

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
          <Select.Item label="Cooking" value="cooking" />
          <Select.Item label="Paid" value="paid" />
          <Select.Item label="Served" value="served" />
          <Select.Item label="Placed" value="placed" />
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
            >
              <Box bg="white" rounded="lg" shadow={1} m={2} p={3} flex={1}>
                <VStack space={2}>
                  <HStack justifyContent="space-between" alignItems="center">
                    <VStack>
                      <Text fontSize="md" fontWeight="bold">
                        #{item.order_number}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {item.date} {item.time}
                      </Text>
                    </VStack>
                    <Badge
                      colorScheme={
                        item.order_status === "cooking"
                          ? "orange"
                          : item.order_status === "paid"
                          ? "green"
                          : item.order_status === "served"
                          ? "blue"
                          : item.order_status === "placed"
                          ? "purple"
                          : item.order_status === "cancelled"
                          ? "red"
                          : "gray"
                      }
                    >
                      {item.order_status?.toUpperCase()}
                    </Badge>
                  </HStack>

                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="sm" color="gray.600">
                      Table {item.table_number}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {item.order_type}
                    </Text>
                  </HStack>

                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="sm" color="gray.600">
                      Items: {item.menu_count || 0}
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color="green.600">
                      ₹{item.grand_total?.toFixed(2) || 0}
                    </Text>
                  </HStack>
                </VStack>
              </Box>
            </Pressable>
          )}
          keyExtractor={(item) => item.order_id?.toString()}
          contentContainerStyle={{ padding: 2 }}
          ListEmptyComponent={() => (
            <Center flex={1} py={10}>
              <Text color="gray.500">No orders found</Text>
            </Center>
          )}
        />
      )}
    </Box>
  );
}
