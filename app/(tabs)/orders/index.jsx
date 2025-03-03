import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { fetchWithAuth } from "../../../utils/apiInterceptor";

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
  parcel: "purple",
  "drive-through": "orange",
  counter: "pink",
  DEFAULT: "coolGray",
};

const ORDER_TYPE_ICONS = {
  "dine-in": "restaurant",
  parcel: "takeout-dining",
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
        case "parcel":
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
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = useCallback(() => {
    const essentialData = {
      orderId: order.order_id,
      orderNumber: order.order_number,
      orderStatus: order.order_status,
      orderType: order.order_type,
      tableNumber: order.table_number,
      sectionName: order.section_name,
      totalAmount: order.grand_total,
      date: order.date,
      time: order.time,
    };
    onPress(essentialData);
  }, [order, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
    >
      <Box
        bg="white"
        shadow={isPressed ? 4 : 2}
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
        style={{
          transform: [{ scale: isPressed ? 0.98 : 1 }],
          transition: "all 0.2s",
        }}
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

// Define formatDate as a utility function outside the component
const formatDateString = (inputDate) => {
  try {
    if (!inputDate) return "";

    const date = new Date(inputDate);
    if (isNaN(date.getTime())) {
      // If it's already in the API format (e.g. "06 Feb 2024"), return as is
      if (typeof inputDate === "string") {
        return inputDate;
      }
      return "";
    }

    // Format to match API format exactly: "DD MMM YYYY"
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "long" }).slice(0, 3);
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
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
  const [orderTimers, setOrderTimers] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [date, setDate] = useState(() => {
    const today = new Date();
    return formatDateString(today);
  });

  const [showPicker, setShowPicker] = useState(false);

  const onDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      setPickerDate(selectedDate);
      const formattedDate = formatDateString(selectedDate);
      console.log("Selected and formatted date:", formattedDate);
      setDate(formattedDate);
      fetchOrders(true);
    }
  };

  const handleOpenPicker = () => {
    try {
      const [day, month, year] = date.split(" ");
      const monthIndex = new Date(`${month} 1, 2000`).getMonth();
      const dateObj = new Date(year, monthIndex, parseInt(day));

      if (!isNaN(dateObj.getTime())) {
        setPickerDate(dateObj);
      }
    } catch (error) {
      console.error("Error parsing date:", error);
    }
    setShowPicker(true);
  };

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
    console.log("Fetching orders for date:", date); // Debug log
    if (!isSilentRefresh) setIsLoading(true);

    try {
      const restaurantId = await AsyncStorage.getItem("outlet_id");

      const data = await fetchWithAuth(`${getBaseUrl()}/order_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: restaurantId,
        }),
      });

      if (data.st === 1 && data.lists) {
        // Store all orders but filter display based on selected date
        setOrders(data.lists);

        // Filter orders for timers based on selected date
        const currentDateOrders = data.lists.find(
          (section) => section.date === date
        );

        const newTimers = {};
        if (currentDateOrders) {
          currentDateOrders.data.forEach((order) => {
            if (order.order_status?.toLowerCase() === "placed") {
              newTimers[order.order_number] = calculateOrderTimer(
                order.datetime
              );
            }
          });
        }
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

    const refreshInterval = setInterval(() => {
      console.log("Auto-refreshing orders for date:", date); // Debug log
      fetchOrders(true);
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, [date]); // Keep date in dependencies to re-fetch when date changes

  const handleTimerEnd = useCallback(async (orderId) => {
    try {
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

      fetchOrders(true);
    } catch (error) {
      console.error("Error handling timer end:", error);
    }
  }, []);

  // Update the filtered orders calculation
  const filteredOrders = useMemo(() => {
    if (!orders || !orders.length) return [];

    // First filter by selected date
    const dateSection = orders.find((section) => section.date === date);
    if (!dateSection) return [];

    // Create a section with the selected date
    return [
      {
        date: date,
        data: dateSection.data
          .filter((order) => {
            // Then apply status filter
            if (orderStatus !== "all") {
              return (
                order.order_status?.toLowerCase() === orderStatus.toLowerCase()
              );
            }
            return true;
          })
          .filter((order) => {
            // Then apply order type filter
            if (orderType !== "all") {
              return (
                order.order_type?.toLowerCase() === orderType.toLowerCase()
              );
            }
            return true;
          })
          .filter((order) => {
            // Then apply search filter
            if (searchQuery) {
              return order.order_number
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            }
            return true;
          }),
      },
    ];
  }, [orders, date, orderStatus, orderType, searchQuery]);

  const handleDateChange = (event, date) => {
    if (date) {
      const formattedDate = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      setDate(formattedDate);
    }
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
  };

  const handleOrderPress = useCallback(
    (orderData) => {
      router.push({
        pathname: "/orders/order-details",
        params: {
          id: orderData.orderNumber,
          order_id: orderData.orderId.toString(),
          initialData: JSON.stringify(orderData),
        },
      });
    },
    [router]
  );

  const renderOrderItem = useCallback(
    ({ item }) => (
      <OrderCard
        order={item}
        onPress={handleOrderPress}
        onTimerEnd={handleTimerEnd}
      />
    ),
    [handleOrderPress, handleTimerEnd]
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
        tableNumber: "1",
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

      <HStack
        px={4}
        py={3}
        space={3}
        alignItems="center"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
      >
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
      </HStack>

      <HStack px={4} py={2} space={3}>
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
          <Select.Item label="Parcel" value="parcel" />
          <Select.Item label="Drive Through" value="drive-through" />
          <Select.Item label="Counter" value="counter" />
        </Select>

        <Pressable
          flex={1}
          h="36px"
          borderWidth={1}
          borderColor="coolGray.300"
          borderRadius="md"
          justifyContent="center"
          onPress={handleOpenPicker}
        >
          <HStack px={2} alignItems="center" space={1}>
            <MaterialIcons
              name="calendar-today"
              size={16}
              color="coolGray.600"
            />
            <Text fontSize="sm" color="coolGray.600">
              {date}
            </Text>
          </HStack>
        </Pressable>
      </HStack>

      {showPicker && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      <SectionList
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchOrders}
            colors={["#0891b2"]}
            tintColor="#0891b2"
          />
        }
        sections={filteredOrders}
        keyExtractor={(item) => item.order_id?.toString()}
        renderItem={renderOrderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={
          <EmptyStateAnimation
            orderStatus={orderStatus}
            orderType={orderType}
          />
        }
        windowSize={5}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
      />
    </Box>
  );
};

export default OrdersScreen;
