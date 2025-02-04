import React, { useState, useEffect, useCallback } from "react";
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
  SectionList,
  Button,
  View,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { RefreshControl } from "react-native";
import Header from "../../components/Header";
import { NotificationService } from "../../../services/NotificationService";
import { getBaseUrl } from "../../../config/api.config";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";

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

// Add this shared timer utility function at the top level
const calculateOrderTimer = (orderTime) => {
  try {
    if (!orderTime) return 0;

    // Parse the time string (format: "31 Jan 2025 07:54:48 PM")
    const [date, month, year, time, period] = orderTime.split(" ");
    const [hours, minutes, seconds] = time.split(":");

    // Convert to 24-hour format
    let hour24 = parseInt(hours);
    if (period === "PM" && hour24 !== 12) hour24 += 12;
    if (period === "AM" && hour24 === 12) hour24 = 0;

    // Create date objects
    const orderDate = new Date();
    orderDate.setHours(hour24);
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

// Update OrderTimer component
const OrderTimer = ({ orderTime, onEnd, orderId }) => {
  const [remainingTime, setRemainingTime] = useState(() =>
    calculateOrderTimer(orderTime)
  );

  useEffect(() => {
    if (remainingTime <= 0) {
      onEnd && onEnd(orderId);
      return;
    }

    const timer = setInterval(() => {
      const newTime = calculateOrderTimer(orderTime);
      setRemainingTime(newTime);

      if (newTime <= 0) {
        clearInterval(timer);
        onEnd && onEnd(orderId);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [orderTime, orderId, onEnd]);

  if (remainingTime <= 0) return null;

  return (
    <HStack bg="red.50" px={2} py={1} rounded="full" alignItems="center" ml={2}>
      <Icon as={MaterialIcons} name="timer" size="xs" color="red.500" mr={1} />
      <Text
        fontSize="xs"
        color={remainingTime <= 30 ? "red.600" : "red.500"}
        fontWeight="medium"
      >
        {remainingTime} seconds
      </Text>
    </HStack>
  );
};

const OrderCard = ({ order, onPress, onTimerEnd }) => {
  return (
    <Pressable onPress={() => onPress(order)}>
      <Box
        bg="white"
        shadow={2}
        rounded="lg"
        m={2}
        p={4}
        borderLeftWidth={4}
        borderLeftColor={
          order.order_status === "cooking"
            ? `${ORDER_STATUS_COLORS.COOKING}.500`
            : order.order_status === "paid"
            ? `${ORDER_STATUS_COLORS.PAID}.500`
            : order.order_status === "served"
            ? `${ORDER_STATUS_COLORS.SERVED}.500`
            : order.order_status === "placed"
            ? `${ORDER_STATUS_COLORS.PLACED}.500`
            : order.order_status === "cancelled"
            ? `${ORDER_STATUS_COLORS.CANCELLED}.500`
            : `${ORDER_STATUS_COLORS.DEFAULT}.500`
        }
      >
        <HStack justifyContent="space-between" alignItems="center" mb={3}>
          <HStack space={2} alignItems="center">
            <Text fontSize="md" fontWeight="bold">
              #{order.order_number}
            </Text>
            {order.order_status?.toLowerCase() === "placed" && (
              <OrderTimer
                orderTime={order.time}
                onEnd={onTimerEnd}
                orderId={order.order_id}
              />
            )}
          </HStack>
          <Badge
            colorScheme={
              order.order_status === "cooking"
                ? ORDER_STATUS_COLORS.COOKING
                : order.order_status === "paid"
                ? ORDER_STATUS_COLORS.PAID
                : order.order_status === "served"
                ? ORDER_STATUS_COLORS.SERVED
                : order.order_status === "placed"
                ? ORDER_STATUS_COLORS.PLACED
                : order.order_status === "cancelled"
                ? ORDER_STATUS_COLORS.CANCELLED
                : ORDER_STATUS_COLORS.DEFAULT
            }
            rounded="sm"
            variant="solid"
          >
            {order.order_status?.toUpperCase()}
          </Badge>
        </HStack>

        {/* Date and Time */}
        <Text fontSize="sm" color="gray.500" mb={2}>
          {order.date} • {order.time}
        </Text>

        {/* Order Details */}
        <VStack space={2}>
          {/* Show table and section only for dine-in orders */}
          {order.order_type?.toLowerCase() === "dine-in" && (
            <>
              <HStack justifyContent="space-between">
                <Text fontSize="sm" color="gray.600">
                  Table No:
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {Array.isArray(order.table_number)
                    ? order.table_number.join(", ")
                    : order.table_number}
                </Text>
              </HStack>

              <HStack justifyContent="space-between">
                <Text fontSize="sm" color="gray.600">
                  Section:
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {order.section_name}
                </Text>
              </HStack>
            </>
          )}

          {/* Order Type and Items Count */}
          <HStack justifyContent="space-between" alignItems="center">
            <Badge
              colorScheme={
                ORDER_TYPE_COLORS[order.order_type?.toLowerCase()] ||
                ORDER_TYPE_COLORS.DEFAULT
              }
              variant="subtle"
              rounded="sm"
            >
              <HStack space={1} alignItems="center">
                <Icon
                  as={MaterialIcons}
                  name={
                    ORDER_TYPE_ICONS[order.order_type?.toLowerCase()] ||
                    ORDER_TYPE_ICONS.DEFAULT
                  }
                  size="xs"
                />
                <Text fontSize="xs">{order.order_type}</Text>
              </HStack>
            </Badge>

            <Badge colorScheme="info" rounded="full" variant="subtle">
              <HStack alignItems="center" space={1}>
                <Text fontSize="xs">{order.menu_count || 0} Items</Text>
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
            <Text fontSize="md">₹{order.total_bill_amount || 0}</Text>
            <Text fontSize="xs" color="gray.500">
              Bill Amount
            </Text>
          </VStack>
          <VStack alignItems="center">
            <Text fontSize="md" color="green.600">
              -₹{order.discount_amount || 0}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Discount
            </Text>
          </VStack>
          <VStack alignItems="flex-end">
            <Text fontSize="md" fontWeight="bold" color="primary.600">
              ₹{order.grand_total?.toFixed(2) || 0}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Total Amount
            </Text>
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
};

const OrdersScreen = () => {
  const router = useRouter();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [orderStatus, setOrderStatus] = useState("all");
  const [isAscending, setIsAscending] = useState(false);
  const [orderType, setOrderType] = useState("all");
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [orderTimers, setOrderTimers] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case "cooking":
        return "warning";
      case "served":
        return "success";
      case "cancelled":
        return "error";
      case "paid":
        return "info";
      default:
        return "gray";
    }
  };

  const fetchOrders = async (isSilentRefresh = false) => {
    if (!isSilentRefresh) setIsLoading(true);

    try {
      const restaurantId = await AsyncStorage.getItem("outlet_id");
      const accessToken = await AsyncStorage.getItem("access");

      const response = await fetch(`${getBaseUrl()}/order_listview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          outlet_id: restaurantId || "1",
        }),
      });

      const data = await response.json();
      console.log("Orders response:", data);

      if (data.st === 1 && data.lists) {
        setOrders(data.lists);

        // Initialize timers for placed orders
        const newTimers = {};
        data.lists.forEach((section) => {
          section.data.forEach((order) => {
            if (order.order_status?.toLowerCase() === "placed") {
              newTimers[order.order_number] = calculateOrderTimer(
                order.datetime
              );
            }
          });
        });
        setOrderTimers(newTimers);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Auto-refresh orders when timer ends or every minute
  useEffect(() => {
    fetchOrders(); // Initial fetch

    // Refresh every minute
    const refreshInterval = setInterval(() => {
      fetchOrders(true); // Silent refresh
    }, 60000); // 60 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  // Add a function to handle timer end
  const handleTimerEnd = useCallback(async (orderId) => {
    try {
      // Update the order status in the local state
      setOrders((prevOrders) =>
        prevOrders.map((dateGroup) => ({
          ...dateGroup,
          data: dateGroup.data.map((order) =>
            order.order_id === orderId
              ? { ...order, order_status: "cooking" }
              : order
          ),
        }))
      );

      // Fetch fresh data from server
      fetchOrders(true);
    } catch (error) {
      console.error("Error handling timer end:", error);
    }
  }, []);

  // Filter and sort orders whenever the dependencies change
  useEffect(() => {
    if (!orders.length) return;

    let result = [...orders];

    // Apply filters to each section's data
    result = orders.map((section) => ({
      date: section.date,
      data: section.data.filter((order) => {
        // Status filter
        const statusMatch =
          orderStatus === "all" ||
          order.order_status?.toLowerCase() === orderStatus.toLowerCase();

        // Type filter
        const typeMatch =
          orderType === "all" ||
          order.order_type?.toLowerCase() === orderType.toLowerCase();

        // Search filter
        const searchLower = searchQuery.toLowerCase().trim();
        const searchMatch =
          !searchQuery ||
          order.order_number?.toLowerCase().includes(searchLower) ||
          (Array.isArray(order.table_number) &&
            order.table_number.some(
              (table) =>
                table.toString().toLowerCase().includes(searchLower) ||
                `table ${table}`.toLowerCase().includes(searchLower) ||
                `t${table}`.toLowerCase().includes(searchLower)
            ));

        return statusMatch && typeMatch && searchMatch;
      }),
    }));

    // Sort the data within each section
    result = result.map((section) => ({
      date: section.date,
      data: section.data.sort((a, b) => {
        if (sortBy === "date") {
          const timeA = new Date(`${section.date} ${a.time}`);
          const timeB = new Date(`${section.date} ${b.time}`);
          return isAscending ? timeA - timeB : timeB - timeA;
        } else if (sortBy === "amount") {
          const amountA = parseFloat(a.grand_total) || 0;
          const amountB = parseFloat(b.grand_total) || 0;
          return isAscending ? amountA - amountB : amountB - amountA;
        }
        return 0;
      }),
    }));

    // Remove empty sections
    result = result.filter((section) => section.data.length > 0);

    setFilteredOrders(result);
  }, [orders, orderStatus, orderType, searchQuery, sortBy, isAscending]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const renderOrderItem = ({ item }) => (
    <OrderCard
      order={item}
      onPress={() => {
        router.push({
          pathname: "/orders/order-details",
          params: { id: item.order_number },
        });
      }}
      onTimerEnd={handleTimerEnd}
    />
  );

  const renderSectionHeader = ({ section }) => (
    <Box bg="gray.100" px={4} py={2} mb={3}>
      <Text fontSize="md" fontWeight="semibold">
        {section.date}
      </Text>
    </Box>
  );

  const handleCallWaiter = async () => {
    try {
      const result = await NotificationService.callWaiter({
        tableNumber: "1", // Default table number
      });

      if (result.success) {
        toast.show({
          description: "Waiter has been notified",
          status: "success",
          duration: 3000,
        });
      } else {
        toast.show({
          description: result.message || "Failed to call waiter",
          status: "error",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Call waiter error:", error);
      toast.show({
        description: "Failed to call waiter",
        status: "error",
        duration: 3000,
      });
    }
  };

  if (isLoading) {
    return (
      <Center flex={1}>
        <Spinner size="lg" />
      </Center>
    );
  }

  return (
    <Box flex={1} bg="gray.50" safeArea>
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

        {/* Date Picker */}
        <Pressable
          flex={1}
          h="36px"
          borderWidth={1}
          borderColor="coolGray.300"
          borderRadius="md"
          justifyContent="center"
          onPress={() => {
            if (Platform.OS === "android") {
              // Show date picker for Android
              setShowDatePicker(true);
            }
          }}
        >
          <HStack px={2} alignItems="center" space={1}>
            <MaterialIcons
              name="calendar-today"
              size={16}
              color="coolGray.600"
            />
            <Text fontSize="sm" color="coolGray.600">
              Select Date
            </Text>
          </HStack>
        </Pressable>
      </HStack>

      {/* Render DateTimePicker when showDatePicker is true */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false); // Hide date picker
            if (event.type !== "dismissed" && selectedDate) {
              const formattedDate = selectedDate.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              const dateOrders = orders.filter(
                (order) => order.date === formattedDate
              );
              setFilteredOrders(dateOrders);
            }
          }}
        />
      )}

      {/* Orders List */}
      <SectionList
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0891b2"]} // This matches your app's primary color
            tintColor="#0891b2"
          />
        }
        sections={filteredOrders}
        keyExtractor={(item) => item.order_id?.toString()}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => {
              router.push({
                pathname: "/orders/order-details",
                params: { id: item.order_number },
              });
            }}
            onTimerEnd={handleTimerEnd}
          />
        )}
        renderSectionHeader={({ section }) => (
          <Box bg="gray.100" px={4} py={2}>
            <Text fontWeight="600">{section.date}</Text>
          </Box>
        )}
        ListEmptyComponent={
          <EmptyStateAnimation
            orderStatus={orderStatus}
            orderType={orderType}
          />
        }
      />
    </Box>
  );
};

export default OrdersScreen;
