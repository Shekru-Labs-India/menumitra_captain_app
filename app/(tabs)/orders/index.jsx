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
  Icon,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import Header from "../../components/Header";

const API_BASE_URL = "https://men4u.xyz/captain_api";

const ORDER_STATUS_COLORS = {
  COMPLETED: "green",
  CANCELLED: "red",
  COOKING: "orange",
  PLACED: "purple",
  PAID: "blue",
  SERVED: "teal",
  DEFAULT: "gray",
};

const ORDER_TYPE_COLORS = {
  "dine-in": "blue",
  "take-away": "purple",
  delivery: "green",
  "drive-through": "orange",
  counter: "pink",
  DEFAULT: "coolGray",
};

const ORDER_TYPE_ICONS = {
  "dine-in": "restaurant",
  "take-away": "takeout-dining",
  delivery: "delivery-dining",
  "drive-through": "drive-eta",
  counter: "point-of-sale",
  DEFAULT: "receipt-long",
};

const PAYMENT_METHOD_ICONS = {
  cash: "payments",
  card: "credit-card",
  upi: "account-balance",
  wallet: "account-balance-wallet",
  DEFAULT: "payment",
};

export default function OrdersScreen() {
  const router = useRouter();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [outletId, setOutletId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [orderStatus, setOrderStatus] = useState("cooking");
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
          order_status: "cooking",
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

        {/* Only Sort Direction Toggle */}
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

      {/* Orders List */}
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
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                router.push({
                  pathname: "/orders/order-details",
                  params: { id: item.order_number },
                });
              }}
            >
              <Box
                bg="white"
                shadow={2}
                rounded="lg"
                m={2}
                p={4}
                borderLeftWidth={4}
                borderLeftColor={
                  item.order_status === "cooking"
                    ? `${ORDER_STATUS_COLORS.COOKING}.500`
                    : item.order_status === "paid"
                    ? `${ORDER_STATUS_COLORS.PAID}.500`
                    : item.order_status === "served"
                    ? `${ORDER_STATUS_COLORS.SERVED}.500`
                    : item.order_status === "placed"
                    ? `${ORDER_STATUS_COLORS.PLACED}.500`
                    : item.order_status === "cancelled"
                    ? `${ORDER_STATUS_COLORS.CANCELLED}.500`
                    : `${ORDER_STATUS_COLORS.DEFAULT}.500`
                }
              >
                {/* Header with Order Number and Status */}
                <HStack
                  justifyContent="space-between"
                  alignItems="center"
                  mb={3}
                >
                  <Text fontSize="lg" fontWeight="bold">
                    #{item.order_number}
                  </Text>
                  <Badge
                    colorScheme={
                      item.order_status === "cooking"
                        ? ORDER_STATUS_COLORS.COOKING
                        : item.order_status === "paid"
                        ? ORDER_STATUS_COLORS.PAID
                        : item.order_status === "served"
                        ? ORDER_STATUS_COLORS.SERVED
                        : item.order_status === "placed"
                        ? ORDER_STATUS_COLORS.PLACED
                        : item.order_status === "cancelled"
                        ? ORDER_STATUS_COLORS.CANCELLED
                        : ORDER_STATUS_COLORS.DEFAULT
                    }
                    rounded="sm"
                    variant="solid"
                  >
                    {item.order_status?.toUpperCase()}
                  </Badge>
                </HStack>

                {/* Date and Time */}
                <Text fontSize="sm" color="gray.500" mb={2}>
                  {item.date} • {item.time}
                </Text>

                {/* Order Details */}
                <VStack space={2}>
                  {/* Show table and section only for dine-in orders */}
                  {item.order_type?.toLowerCase() === "dine-in" && (
                    <>
                      <HStack justifyContent="space-between">
                        <Text fontSize="sm" color="gray.600">
                          Table No:
                        </Text>
                        <Text fontSize="sm" fontWeight="medium">
                          {Array.isArray(item.table_number)
                            ? item.table_number.join(", ")
                            : item.table_number}
                        </Text>
                      </HStack>

                      <HStack justifyContent="space-between">
                        <Text fontSize="sm" color="gray.600">
                          Section:
                        </Text>
                        <Text fontSize="sm" fontWeight="medium">
                          {item.section_name}
                        </Text>
                      </HStack>
                    </>
                  )}

                  {/* Order Type and Items Count */}
                  <HStack justifyContent="space-between" alignItems="center">
                    <Badge
                      colorScheme={
                        ORDER_TYPE_COLORS[item.order_type?.toLowerCase()] ||
                        "coolGray"
                      }
                      variant="subtle"
                      rounded="sm"
                    >
                      <HStack space={1} alignItems="center">
                        <Icon
                          as={MaterialIcons}
                          name={
                            ORDER_TYPE_ICONS[item.order_type?.toLowerCase()] ||
                            ORDER_TYPE_ICONS.DEFAULT
                          }
                          size="xs"
                        />
                        <Text fontSize="xs">{item.order_type}</Text>
                      </HStack>
                    </Badge>

                    <Badge colorScheme="info" rounded="full" variant="subtle">
                      <HStack alignItems="center" space={1}>
                        <Text fontSize="xs">{item.menu_count || 0} Items</Text>
                      </HStack>
                    </Badge>
                  </HStack>
                </VStack>

                {/* Price Details */}
                <HStack
                  justifyContent="space-between"
                  mt={3}
                  pt={3}
                  borderTopWidth={1}
                  borderTopColor="gray.200"
                >
                  <VStack>
                    <Text fontSize="md">
                      ₹{item.total_bill_amount || item.sub_total || 0}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Bill Amount
                    </Text>
                  </VStack>
                  <VStack alignItems="center">
                    <Text fontSize="md" color="green.600">
                      -₹{item.discount_amount || 0}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Discount
                    </Text>
                  </VStack>
                  <VStack alignItems="flex-end">
                    <Text fontSize="md" fontWeight="bold" color="primary.600">
                      ₹{item.grand_total?.toFixed(2) || 0}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Total Amount
                    </Text>
                  </VStack>
                </HStack>
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
