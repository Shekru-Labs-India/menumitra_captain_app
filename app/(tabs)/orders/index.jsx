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
  parsel: "purple",
  "drive-through": "orange",
  counter: "pink",
  DEFAULT: "coolGray",
};

const ORDER_TYPE_ICONS = {
  "dine-in": "restaurant",
  parsel: "takeout-dining",
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

// Add EmptyStateAnimation component
const EmptyStateAnimation = ({ orderStatus, orderType }) => {
  const getEmptyStateMessage = () => {
    if (orderStatus !== "all") {
      switch (orderStatus) {
        case "placed":
          return "No Placed Orders";
        case "cooking":
          return "No Orders in Cooking";
        case "served":
          return "No Served Orders";
        case "paid":
          return "No Paid Orders";
        case "cancelled":
          return "No Cancelled Orders";
        default:
          return "No Orders Found";
      }
    } else if (orderType !== "all") {
      switch (orderType) {
        case "dine-in":
          return "No Dine-in Orders";
        case "parsel":
          return "No Parcel Orders";
        case "drive-through":
          return "No Drive Through Orders";
        case "counter":
          return "No Counter Orders";
        default:
          return "No Orders Found";
      }
    }
    return "No Orders Found";
  };

  return (
    <Center flex={1} px={4}>
      <Icon
        as={MaterialIcons}
        name="receipt-long"
        size="6xl"
        color="gray.400"
      />
      <Text fontSize="xl" fontWeight="600" color="gray.600" mt={4}>
        {getEmptyStateMessage()}
      </Text>
      <Text fontSize="sm" color="gray.400" mt={3}>
        {orderStatus !== "all" || orderType !== "all"
          ? "Try adjusting your filters"
          : "Check back later for new orders"}
      </Text>
    </Center>
  );
};

export default function OrdersScreen() {
  const router = useRouter();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [outletId, setOutletId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [orderStatus, setOrderStatus] = useState("all");
  const [isAscending, setIsAscending] = useState(false);
  const [orderType, setOrderType] = useState("all");

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
        // Status filter - show all if "all" is selected
        const statusMatch =
          orderStatus === "all" ||
          order.order_status?.toLowerCase() === orderStatus.toLowerCase();

        // Type filter - show all if "all" is selected
        const typeMatch =
          orderType === "all" ||
          order.order_type?.toLowerCase() === orderType.toLowerCase();

        // Search filter - enhanced table number search
        const searchLower = searchQuery.toLowerCase().trim();

        // Improved table number search logic
        const tableSearch = (tableNum) => {
          const searchTerms = [
            tableNum.toString(), // exact number
            `table ${tableNum}`, // "table 2"
            `table no ${tableNum}`, // "table no 2"
            `table number ${tableNum}`, // "table number 2"
            `t${tableNum}`, // "t2"
            `${tableNum}`, // just number
          ].map((term) => term.toLowerCase());

          return searchTerms.some((term) => term.includes(searchLower));
        };

        const hasMatchingTable =
          order.table_number &&
          (Array.isArray(order.table_number)
            ? order.table_number.some((table) => tableSearch(table))
            : tableSearch(order.table_number));

        const searchMatch =
          !searchQuery ||
          order.order_number?.toLowerCase().includes(searchLower) ||
          hasMatchingTable;

        return statusMatch && typeMatch && searchMatch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "date":
            // Parse date in DD MMM YYYY format and time in HH:mm format
            const parseDateTime = (dateStr, timeStr) => {
              const [day, month, year] = dateStr.split(" ");
              const months = {
                Jan: 0,
                Feb: 1,
                Mar: 2,
                Apr: 3,
                May: 4,
                Jun: 5,
                Jul: 6,
                Aug: 7,
                Sep: 8,
                Oct: 9,
                Nov: 10,
                Dec: 11,
              };

              // Parse time (handles both 12h and 24h formats)
              let [hours, minutes] = timeStr.split(":");
              minutes = minutes.replace(/\s*(am|pm)/i, ""); // Remove AM/PM
              hours = parseInt(hours);

              // Adjust hours for PM
              if (timeStr.toLowerCase().includes("pm") && hours !== 12) {
                hours += 12;
              }
              // Adjust hours for AM
              if (timeStr.toLowerCase().includes("am") && hours === 12) {
                hours = 0;
              }

              return new Date(
                parseInt(year),
                months[month],
                parseInt(day),
                hours,
                parseInt(minutes)
              );
            };

            const dateA = parseDateTime(a.date, a.time);
            const dateB = parseDateTime(b.date, b.time);
            return isAscending ? dateA - dateB : dateB - dateA;

          case "amount":
            return isAscending
              ? a.grand_total - b.grand_total
              : b.grand_total - a.grand_total;
          default:
            return 0;
        }
      });
  }, [orders, orderStatus, orderType, searchQuery, sortBy, isAscending]);

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
          selectedValue={orderStatus}
          onValueChange={setOrderStatus}
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

        {/* Order Type Filter */}
        <Select
          flex={1}
          selectedValue={orderType}
          onValueChange={setOrderType}
          _selectedItem={{
            bg: "coolGray.100",
            endIcon: (
              <MaterialIcons name="check" size={20} color="coolGray.600" />
            ),
          }}
        >
          <Select.Item label="All Types" value="all" />
          <Select.Item label="Dine-in" value="dine-in" />
          <Select.Item label="Parcel" value="parsel" />
          <Select.Item label="Drive Through" value="drive-through" />
          <Select.Item label="Counter" value="counter" />
        </Select>

        {/* Sort By Filter */}
        <Select
          flex={1}
          selectedValue={sortBy}
          onValueChange={setSortBy}
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
        <EmptyStateAnimation orderStatus={orderStatus} orderType={orderType} />
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
