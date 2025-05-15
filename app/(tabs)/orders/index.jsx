import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  Menu,
  Modal,
  Spacer,
  Divider,
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
  // Use force update trick to ensure component re-renders every second
  const [, forceUpdate] = useState(0);
  const remainingTimeRef = useRef(calculateOrderTimer(orderTime));

  useEffect(() => {
    // Initial calculation
    remainingTimeRef.current = calculateOrderTimer(orderTime);

    // Set up timer that updates every 100ms for smoother countdown
    const timer = setInterval(() => {
      const newTime = calculateOrderTimer(orderTime);

      // Only trigger end function when time actually reaches zero
      if (newTime <= 0 && remainingTimeRef.current > 0) {
        clearInterval(timer);
        onEnd && onEnd(orderId);
      }

      // Update the ref
      remainingTimeRef.current = newTime;

      // Force component to re-render
      forceUpdate((prev) => prev + 1);
    }, 100); // Update 10 times per second for smooth countdown

    return () => clearInterval(timer);
  }, [orderTime, orderId, onEnd]);

  if (remainingTimeRef.current <= 0) return null;

  return (
    <Badge
      bg={remainingTimeRef.current <= 30 ? "red.500" : "orange.500"}
      rounded="full"
      px={2}
      py={0.5}
      mt={2}
      alignSelf="flex-start"
      variant="solid"
    >
      <HStack space={1} alignItems="center">
        <Icon as={MaterialIcons} name="timer" size="xs" color="white" />
        <Text fontSize="xs" color="white" fontWeight="bold">
          {remainingTimeRef.current}s
        </Text>
      </HStack>
    </Badge>
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
        borderLeftWidth={5}
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
        <HStack justifyContent="space-between" alignItems="center" mb={2}>
          <HStack alignItems="center" space={2}>
            <Text fontSize="lg" fontWeight="bold">
              #{order.order_number}
            </Text>

            {/* Timer Badge for Placed Orders */}
            {order.order_status?.toLowerCase() === "placed" && (
              <OrderTimer
                orderTime={order.datetime || order.time}
                onEnd={() => onTimerEnd && onTimerEnd(order.order_id)}
                orderId={order.order_id}
              />
            )}
          </HStack>

          <HStack space={1} alignItems="center">
            {order.order_status === "paid" && order.payment_method && (
              <HStack space={1} alignItems="center" mr={1}>
                <Icon
                  as={MaterialIcons}
                  name={
                    PAYMENT_METHOD_ICONS[order.payment_method?.toLowerCase()] ||
                    PAYMENT_METHOD_ICONS.DEFAULT
                  }
                  size="sm"
                  color="coolGray.600"
                />
                <Text
                  fontSize="xs"
                  textTransform="uppercase"
                  color="coolGray.600"
                  fontWeight="medium"
                >
                  {order.payment_method}
                </Text>
              </HStack>
            )}

            <Badge
              bg={
                order.order_status === "cooking"
                  ? "orange.500"
                  : order.order_status === "paid"
                  ? "blue.500"
                  : order.order_status === "served"
                  ? "teal.500"
                  : order.order_status === "placed"
                  ? "purple.500"
                  : order.order_status === "cancelled"
                  ? "red.500"
                  : "gray.500"
              }
              rounded="sm"
              px={2}
              py={0.5}
            >
              <Text color="white" fontSize="xs" fontWeight="bold">
                {order.order_status?.toUpperCase()}
              </Text>
            </Badge>
          </HStack>
        </HStack>

        {/* Date and Time */}
        <Text fontSize="sm" color="gray.500" mb={3}>
          {order.date} {order.time}
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

          {/* Order Type Badge */}
          <HStack pt={2}>
            <Badge
              bg="coolGray.100"
              _text={{
                color: "coolGray.800",
              }}
              rounded="sm"
              variant="subtle"
            >
              <HStack space={1} alignItems="center">
                <Icon
                  as={MaterialIcons}
                  name={
                    ORDER_TYPE_ICONS[order.order_type?.toLowerCase()] ||
                    ORDER_TYPE_ICONS.DEFAULT
                  }
                  size="xs"
                  color="coolGray.500"
                />
                <Text fontSize="xs">{order.order_type}</Text>
              </HStack>
            </Badge>

            <Spacer />

            <Badge colorScheme="coolGray" rounded="sm" variant="subtle">
              <Text fontSize="xs">{order.menu_count || 0} Items</Text>
            </Badge>
          </HStack>
        </VStack>

        {/* Price Details */}
        <HStack
          justifyContent="space-between"
          mt={4}
          pt={3}
          borderTopWidth={1}
          borderTopColor="gray.200"
        >
          {order.is_paid === "complementary" && (
            <Box bg="#f3e8ff" px={2} py={1} rounded="md">
              <Text color="#8b5cf6" fontSize="sm" fontWeight="medium">
                Complementary
              </Text>
            </Box>
          )}
          <VStack alignItems="flex-end">
            <Text fontSize="md" fontWeight="bold" color="primary.600">
              ₹{Number(order.final_grand_total || 0).toFixed(2)}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Grand Total
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

// Add these helper functions at the top level
const getDateRange = (filter) => {
  const today = new Date();
  const todayStr = formatDateString(today);
  
  switch (filter) {
    case "today":
      return {
        start: todayStr,
        end: todayStr,
        label: "Today"
      };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDateString(yesterday);
      return {
        start: yesterdayStr,
        end: yesterdayStr,
        label: "Yesterday"
      };
    }
    case "thisWeek": {
      // Get start of current week (Sunday)
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        start: formatDateString(startOfWeek),
        end: todayStr,
        label: "This Week"
      };
    }
    case "lastWeek": {
      // Last week: from last Sunday to last Saturday
      const endOfLastWeek = new Date(today);
      endOfLastWeek.setDate(today.getDate() - today.getDay() - 1);
      const startOfLastWeek = new Date(endOfLastWeek);
      startOfLastWeek.setDate(endOfLastWeek.getDate() - 6);
      return {
        start: formatDateString(startOfLastWeek),
        end: formatDateString(endOfLastWeek),
        label: "Last Week"
      };
    }
    case "thisMonth": {
      // This month: from 1st of current month to today
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: formatDateString(startOfMonth),
        end: todayStr,
        label: "This Month"
      };
    }
    case "lastMonth": {
      // Last month: from 1st to last day of previous month
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        start: formatDateString(startOfLastMonth),
        end: formatDateString(endOfLastMonth),
        label: "Last Month"
      };
    }
    case "custom":
      return {
        start: "",
        end: "",
        label: "Custom Date"
      };
    default:
      return {
        start: todayStr,
        end: todayStr,
        label: "Today"
      };
  }
};

// Add this function after the getDateRange function
const sortOrders = (orders, sortKey, ascending) => {
  if (!orders || orders.length === 0) return orders;

  // Create a deep copy of the orders to avoid mutating the original
  const sortedOrders = JSON.parse(JSON.stringify(orders));

  // Sort each date group's data array
  return sortedOrders.map((dateGroup) => {
    const sortedData = [...dateGroup.data].sort((a, b) => {
      switch (sortKey) {
        case "order_number":
          // Sort by order number (numeric)
          return ascending
            ? parseInt(a.order_number) - parseInt(b.order_number)
            : parseInt(b.order_number) - parseInt(a.order_number);

        case "time":
          // Sort by time
          return ascending
            ? new Date(a.datetime || a.time) - new Date(b.datetime || b.time)
            : new Date(b.datetime || b.time) - new Date(a.datetime || a.time);

        case "amount":
          // Sort by total amount
          const aAmount = Number(a.total_bill_amount || 0);
          const bAmount = Number(b.total_bill_amount || 0);
          return ascending ? aAmount - bAmount : bAmount - aAmount;

        case "status":
          // Sort by status (alphabetical)
          const statusOrder = {
            placed: 1,
            cooking: 2,
            served: 3,
            paid: 4,
            cancelled: 5,
          };
          const aStatus = statusOrder[a.order_status?.toLowerCase()] || 99;
          const bStatus = statusOrder[b.order_status?.toLowerCase()] || 99;
          return ascending ? aStatus - bStatus : bStatus - aStatus;

        default:
          // Default sort by order number
          return ascending
            ? parseInt(a.order_number) - parseInt(b.order_number)
            : parseInt(b.order_number) - parseInt(a.order_number);
      }
    });

    return { ...dateGroup, data: sortedData };
  });
};

const OrdersScreen = () => {
  const router = useRouter();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("time");
  const [isAscending, setIsAscending] = useState(false);
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderType, setOrderType] = useState("all");
  const [orderTimers, setOrderTimers] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [outletName, setOutletName] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return formatDateString(today);
  });

  const [showPicker, setShowPicker] = useState(false);
  const [dateFilter, setDateFilter] = useState("today");
  const [dateRange, setDateRange] = useState(getDateRange("today"));
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isTodayActive, setIsTodayActive] = useState(true);

  const [dateFilterType, setDateFilterType] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(),
    endDate: new Date(),
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isDateFilterModalVisible, setIsDateFilterModalVisible] = useState(false);

  const handleDatePickerChange = (event, selectedDate) => {
    setShowDatePicker(false);

    if (selectedDate) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (selectedDate > today) {
        toast.show({
          description: "Cannot select future dates",
          status: "warning",
          duration: 3000,
        });
        return;
      }

      // Set the start date
      setStartDate(selectedDate);
      const formattedStartDate = formatDateString(selectedDate);
      setDateRange({
        ...dateRange,
        start: formattedStartDate,
      });

      // Open the date picker modal again
      setTimeout(() => {
        setShowPicker(true);
      }, 0);
    }
  };

  const handleEndDatePickerChange = (event, selectedDate) => {
    setShowEndDatePicker(false);

    if (selectedDate) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (selectedDate > today) {
        toast.show({
          description: "Cannot select future dates",
          status: "warning",
          duration: 3000,
        });
        setTimeout(() => {
          setShowEndDatePicker(true);
        }, 50);
        return;
      }

      // Ensure end date is not before start date
      if (selectedDate < startDate) {
        toast.show({
          description: "End date cannot be before start date",
          status: "warning",
          duration: 3000,
        });
        setTimeout(() => {
          setShowEndDatePicker(true);
        }, 50);
        return;
      }

      // Set the end date
      setEndDate(selectedDate);
      const formattedEndDate = formatDateString(selectedDate);
      setDateRange({
        ...dateRange,
        end: formattedEndDate,
      });

      // Open the date picker modal again
      setTimeout(() => {
        setShowPicker(true);
      }, 0);
    }
  };

  // Function to set date filter and update UI state
  const handleDateFilterChange = (filter) => {
    setDateFilter(filter);
    setIsTodayActive(filter === "today");
    
    if (filter === "custom") {
      setShowPicker(true);
    } else {
      // Get the date range for this filter using the updated logic
      const newRange = getDateRange(filter);
      setDateRange(newRange);
      setDate(filter === "today" ? formatDateString(new Date()) : newRange.end);
      fetchOrders(true);
    }
  };

  // Add useEffect to handle date range changes with silent refresh
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      // Use silent refresh when date range changes to improve UI responsiveness
      fetchOrders(true);
    }
  }, [dateRange]);

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

  // Add isDateInRange function to check if a date is within the selected range
  const isDateInRange = (dateString, startDateString, endDateString) => {
    if (!dateString || !startDateString || !endDateString) return false;

    try {
      // Parse input dates using consistent approach
      const parseDate = (dateStr) => {
        const [day, month, year] = dateStr.split(" ");
        const monthIndex = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ].indexOf(month);
        
        if (monthIndex === -1) return null;
        return new Date(parseInt(year), monthIndex, parseInt(day));
      };
      
      const date = parseDate(dateString);
      const startDate = parseDate(startDateString);
      const endDate = parseDate(endDateString);
      
      if (!date || !startDate || !endDate) return false;
      
      // Set hours consistently to remove time component influence
      // Use beginning of day for order date and start date
      date.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      // Use end of day for end date
      endDate.setHours(23, 59, 59, 999);
      
      return date >= startDate && date <= endDate;
    } catch (error) {
      console.error("Error checking date range:", error);
      return false;
    }
  };

  // Add this getFilteredOrders function to match the OrderList.js approach
  const getFilteredOrders = useCallback(() => {
    if (!orders || !orders.length) return [];

    let relevantSections = [];
    
    // First, identify the relevant date sections based on date filter
    if (dateFilterType === "customRange" && dateRange.start && dateRange.end) {
      // For custom date range, filter all sections within the range
      relevantSections = orders
        .filter((section) =>
          isDateInRange(section.date, dateRange.start, dateRange.end)
        );
    } else if (dateFilterType !== "today") {
      // Handle other date filters
      const range = getDateRange(dateFilterType);
      
      // Filter orders based on the date range
      relevantSections = orders
        .filter((section) =>
          isDateInRange(section.date, range.start, range.end)
        );
    } else {
      // For today, find the matching section
      const dateSection = orders.find((section) => section.date === date);
      if (dateSection) {
        relevantSections = [dateSection];
      }
    }

    // Then, apply other filters (status, type, search) to the data within selected date sections
    const filteredSections = relevantSections.map((section) => ({
      ...section,
      data: section.data
        .filter((order) => {
          // Apply status filter
          if (orderStatus !== "all") {
            return (
              order.order_status?.toLowerCase() ===
              orderStatus.toLowerCase()
            );
          }
          return true;
        })
        .filter((order) => {
          // Apply order type filter
          if (orderType !== "all") {
            return (
              order.order_type?.toLowerCase() === orderType.toLowerCase()
            );
          }
          return true;
        })
        .filter((order) => {
          // Apply search filter
          if (searchQuery) {
            return order.order_number
              .toLowerCase()
              .includes(searchQuery.toLowerCase());
          }
          return true;
        }),
    }));

    // Apply sorting to all filtered sections
    return sortOrders(filteredSections, sortBy, isAscending);
  }, [
    orders,
    date,
    orderStatus,
    orderType,
    searchQuery,
    sortBy,
    isAscending,
    dateFilterType,
    dateRange,
  ]);

  // Replace the existing filteredOrders with a memoized version using the new function
  const filteredOrders = useMemo(() => getFilteredOrders(), [getFilteredOrders]);

  // Update fetchOrders to only trigger loading states for initial or manual refreshes
  const fetchOrders = async (isSilentRefresh = false) => {
    console.log("Fetching orders for date range:", dateRange); // Debug log
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
        // Store all orders without filtering them initially
        setOrders(data.lists);

        // Setup order timers for placed orders
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
      if (!isSilentRefresh) {
        toast.show({
          description: "Failed to fetch orders",
          status: "error",
          duration: 3000,
        });
      }
    } finally {
      if (!isSilentRefresh) setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Add this new function to get outlet name
  const getOutletName = async () => {
    try {
      const name = await AsyncStorage.getItem("outlet_name");
      setOutletName(name || "");
    } catch (error) {
      console.error("Error getting outlet name:", error);
      setOutletName("");
    }
  };

  // Update useEffect to avoid redundant API calls
  useEffect(() => {
    // Only validate dateRange here, no need to call fetchOrders
    if (dateRange.start && dateRange.end) {
      const startDate = parseDateFromFormat(dateRange.start);
      const endDate = parseDateFromFormat(dateRange.end);
      
      if (startDate > endDate) {
        toast.show({
          description: "Start date cannot be after end date",
          status: "warning",
          duration: 3000,
        });
        
        // Reset to today if invalid range
        handleDateFilterTypeChange("today");
      }
    }
  }, [dateRange]);

  // Simplify initial fetch useEffect to just get all orders once
  useEffect(() => {
    getOutletName();
    fetchOrders();

    // Only set up auto-refresh if needed
    const refreshInterval = setInterval(() => {
      console.log("Auto-refreshing orders...");
      fetchOrders(true); // Use silent refresh for automatic updates
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, []); // Empty dependency array to only run on mount

  // Add local state update for timer end to avoid full refresh
  const handleTimerEnd = useCallback(
    async (orderId) => {
      try {
        // Update local state first for immediate UI feedback
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

        // Show toast notification
        toast.show({
          description: "Order status automatically changed to Cooking",
          status: "info",
          duration: 3000,
        });

        // Make API call to update status on server
        const restaurantId = await AsyncStorage.getItem("outlet_id");
        const targetOrder = orders
          .flatMap((group) => group.data)
          .find((order) => order.order_id === orderId);

        if (targetOrder) {
          try {
            await fetchWithAuth(`${getBaseUrl()}/update_order_status`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                outlet_id: restaurantId,
                order_id: orderId,
                order_number: targetOrder.order_number,
                order_status: "cooking",
              }),
            });
            console.log("Order status updated to cooking via API");
          } catch (apiError) {
            console.error("API update failed, will refresh to sync:", apiError);
          }
        }

        // Perform a silent refresh to sync with server
        fetchOrders(true);
      } catch (error) {
        console.error("Error handling timer end:", error);
      }
    },
    [orders, toast]
  );

  // Add this function to the OrdersScreen component
  const toggleSortDirection = () => {
    setIsAscending(!isAscending);
  };

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

  // Add the missing modal render functions
  const renderOrderTypeModal = () => {
    return (
      <Modal
        isOpen={showOrderTypeModal}
        onClose={() => setShowOrderTypeModal(false)}
      >
        <Modal.Content>
          <Modal.CloseButton />
          <Modal.Header>Select Order Type</Modal.Header>
          <Modal.Body p={0}>
            <VStack divider={<Divider />} width="100%">
              <Pressable
                onPress={() => {
                  setOrderType("all");
                  setShowOrderTypeModal(false);
                  // Use silent refresh
                  fetchOrders(true);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <Text>All Types</Text>
                  {orderType === "all" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOrderType("dine-in");
                  setShowOrderTypeModal(false);
                  // Use silent refresh
                  fetchOrders(true);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Icon
                      as={MaterialIcons}
                      name={ORDER_TYPE_ICONS["dine-in"]}
                      size="sm"
                      color="coolGray.600"
                    />
                    <Text>Dine-in</Text>
                  </HStack>
                  {orderType === "dine-in" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOrderType("parcel");
                  setShowOrderTypeModal(false);
                  // Use silent refresh
                  fetchOrders(true);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Icon
                      as={MaterialIcons}
                      name={ORDER_TYPE_ICONS["parcel"]}
                      size="sm"
                      color="coolGray.600"
                    />
                    <Text>Parcel</Text>
                  </HStack>
                  {orderType === "parcel" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOrderType("delivery");
                  setShowOrderTypeModal(false);
                  // Use silent refresh
                  fetchOrders(true);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Icon
                      as={MaterialIcons}
                      name={ORDER_TYPE_ICONS["delivery"] || "delivery-dining"}
                      size="sm"
                      color="coolGray.600"
                    />
                    <Text>Delivery</Text>
                  </HStack>
                  {orderType === "delivery" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOrderType("drive-through");
                  setShowOrderTypeModal(false);
                  // Use silent refresh
                  fetchOrders(true);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Icon
                      as={MaterialIcons}
                      name={ORDER_TYPE_ICONS["drive-through"]}
                      size="sm"
                      color="coolGray.600"
                    />
                    <Text>Drive-through</Text>
                  </HStack>
                  {orderType === "drive-through" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOrderType("counter");
                  setShowOrderTypeModal(false);
                  // Use silent refresh
                  fetchOrders(true);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Icon
                      as={MaterialIcons}
                      name={ORDER_TYPE_ICONS["counter"]}
                      size="sm"
                      color="coolGray.600"
                    />
                    <Text>Counter</Text>
                  </HStack>
                  {orderType === "counter" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    );
  };

  const renderStatusModal = () => {
    return (
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)}>
        <Modal.Content>
          <Modal.CloseButton />
          <Modal.Header>Select Order Status</Modal.Header>
          <Modal.Body p={0}>
            <VStack divider={<Divider />} width="100%">
              <Pressable
                onPress={() => {
                  setOrderStatus("all");
                  setShowStatusModal(false);
                  // Use silent refresh
                  fetchOrders(true);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <Text>All</Text>
                  {orderStatus === "all" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOrderStatus("placed");
                  setShowStatusModal(false);
                  // Use silent refresh
                  fetchOrders(true);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Badge
                      bg={`${ORDER_STATUS_COLORS.PLACED}.500`}
                      rounded="full"
                      size="xs"
                    />
                    <Text>Placed</Text>
                  </HStack>
                  {orderStatus === "placed" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOrderStatus("cooking");
                  setShowStatusModal(false);
                  // Use silent refresh
                  fetchOrders(true);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Badge
                      bg={`${ORDER_STATUS_COLORS.COOKING}.500`}
                      rounded="full"
                      size="xs"
                    />
                    <Text>Cooking</Text>
                  </HStack>
                  {orderStatus === "cooking" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOrderStatus("served");
                  setShowStatusModal(false);
                  // Use silent refresh
                  fetchOrders(true);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Badge
                      bg={`${ORDER_STATUS_COLORS.SERVED}.500`}
                      rounded="full"
                      size="xs"
                    />
                    <Text>Served</Text>
                  </HStack>
                  {orderStatus === "served" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOrderStatus("paid");
                  setShowStatusModal(false);
                  // Use silent refresh
                  fetchOrders(true);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Badge
                      bg={`${ORDER_STATUS_COLORS.PAID}.500`}
                      rounded="full"
                      size="xs"
                    />
                    <Text>Paid</Text>
                  </HStack>
                  {orderStatus === "paid" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOrderStatus("cancelled");
                  setShowStatusModal(false);
                  // Use silent refresh
                  fetchOrders(true);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Badge
                      bg={`${ORDER_STATUS_COLORS.CANCELLED}.500`}
                      rounded="full"
                      size="xs"
                    />
                    <Text>Cancelled</Text>
                  </HStack>
                  {orderStatus === "cancelled" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    );
  };

  const formatDate = (inputDate) => {
    try {
      if (!inputDate) return "";

      const date = new Date(inputDate);
      if (isNaN(date.getTime())) {
        if (typeof inputDate === "string") {
          return inputDate;
        }
        return "";
      }

      // Format to match API format exactly: "DD MMM YYYY"
      const day = String(date.getDate()).padStart(2, "0");
      const month = date.toLocaleString("en-US", { month: "short" });
      const year = date.getFullYear();

      return `${day} ${month} ${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  // Helper to parse dates from "DD MMM YYYY" format
  const parseDateFromFormat = (dateStr) => {
    if (!dateStr) return new Date();
    
    try {
      const parts = dateStr.split(' ');
      if (parts.length !== 3) return new Date();
      
      const day = parseInt(parts[0], 10);
      const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const month = monthMap[parts[1]];
      const year = parseInt(parts[2], 10);
      
      return new Date(year, month, day);
    } catch (error) {
      console.error("Error parsing date:", error);
      return new Date();
    }
  };

  const getDateRangeFilter = (filterType) => {
    const today = new Date();
    const todayStr = formatDate(today);
    
    switch (filterType) {
      case 'today': {
        return { startDate: todayStr, endDate: todayStr };
      }
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDate(yesterday);
        return { startDate: yesterdayStr, endDate: yesterdayStr };
      }
      case 'thisWeek': {
        const startOfWeek = new Date(today);
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        startOfWeek.setDate(diff);
        return { startDate: formatDate(startOfWeek), endDate: todayStr };
      }
      case 'lastWeek': {
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7 - lastWeekStart.getDay() + 1);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
        return { startDate: formatDate(lastWeekStart), endDate: formatDate(lastWeekEnd) };
      }
      case 'thisMonth': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: formatDate(startOfMonth), endDate: todayStr };
      }
      case 'lastMonth': {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return { 
          startDate: formatDate(startOfLastMonth), 
          endDate: formatDate(endOfLastMonth) 
        };
      }
      case 'customRange': {
        return { 
          startDate: formatDate(customDateRange.startDate), 
          endDate: formatDate(customDateRange.endDate) 
        };
      }
      default:
        return { startDate: todayStr, endDate: todayStr };
    }
  };

  // Update handleDateFilterTypeChange to avoid triggering API calls
  const handleDateFilterTypeChange = (type) => {
    setDateFilterType(type);
    
    if (type === 'today') {
      // If 'today' is selected, update UI to show today is active
      setIsTodayActive(true);
    } else {
      setIsTodayActive(false);
    }
    
    // Clear custom date range when selecting a predefined filter
    if (type !== 'customRange') {
      setCustomDateRange({
        startDate: new Date(),
        endDate: new Date(),
      });
      
      // Get the date range for this filter using the updated logic
      const newRange = getDateRange(type);
      setDateRange(newRange);
      
      // Update date display if needed
      if (type === "today") {
        setDate(formatDateString(new Date()));
      }
    }
    
    // No need to call fetchOrders here - filtering will happen locally with our memoized filteredOrders
  };

  // Update the date picker handlers to not trigger API calls
  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    
    if (selectedDate) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (selectedDate > today) {
        toast.show({
          description: "Cannot select future dates",
          status: "warning",
          duration: 3000,
        });
        return;
      }

      // Set the start date
      setCustomDateRange(prev => ({...prev, startDate: selectedDate}));
      
      // After selecting start date, open end date picker
      setTimeout(() => {
        setShowEndDatePicker(true);
      }, 300);
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    
    if (selectedDate) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (selectedDate > today) {
        toast.show({
          description: "Cannot select future dates",
          status: "warning",
          duration: 3000,
        });
        return;
      }

      // Ensure end date is not before start date
      if (selectedDate < customDateRange.startDate) {
        toast.show({
          description: "End date cannot be before start date",
          status: "warning",
          duration: 3000,
        });
        return;
      }

      // Set the end date
      setCustomDateRange(prev => ({...prev, endDate: selectedDate}));
      
      // Open the date filter modal after both dates are selected
      setTimeout(() => {
        setIsDateFilterModalVisible(true);
      }, 300);
    }
  };

  // Update the Modal button handler for custom date range
  const handleApplyCustomDateRange = () => {
    setIsDateFilterModalVisible(false);
    
    if (!customDateRange.startDate || !customDateRange.endDate) {
      toast.show({
        description: "Please select both start and end dates",
        status: "warning",
        duration: 3000,
      });
      return;
    }
    
    // Set the date filter type to custom range
    setDateFilterType("customRange");
    
    // Set the date range with formatted dates
    setDateRange({
      start: formatDateString(customDateRange.startDate),
      end: formatDateString(customDateRange.endDate),
      label: "Custom Date"
    });
    
    // Show success toast
    toast.show({
      description: `Showing orders from ${formatDateString(customDateRange.startDate)} to ${formatDateString(customDateRange.endDate)}`,
      status: "success",
      duration: 3000,
    });

    // No need to fetch orders - filtering happens locally with our memoized filteredOrders
  };

  // Add useEffect to handle date range changes with silent refresh
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      // Use silent refresh when date range changes to improve UI responsiveness
      fetchOrders(true);
    }
  }, [dateRange]);

  if (isLoading) {
    return (
      <Center flex={1}>
        <Spinner size="lg" />
      </Center>
    );
  }

  return (
    <Box flex={1} bg="gray.50" safeArea>
      <Header title="My Orders" />

      {/* Restaurant Name Display */}
      <Box bg="white" borderBottomWidth={1} borderBottomColor="coolGray.200">
        <Pressable>
          <HStack
            alignItems="center"
            justifyContent="space-between"
            bg="white"
            rounded="md"
            p={2}
          >
            <HStack alignItems="center" space={2}>
              <Icon
                as={MaterialIcons}
                name="store"
                size={5}
                color="gray.600"
              />
              <Text fontWeight="medium" fontSize="md">
                {outletName || ""}
              </Text>
            </HStack>
          </HStack>
        </Pressable>
      </Box>

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
          h="40px"
          placeholder="Search"
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

      <HStack px={4} py={3} space={2} alignItems="center">
        <Pressable
          onPress={() => setShowStatusModal(true)}
          h="40px"
          px={2}
          bg="white"
          borderWidth={1}
          borderColor="coolGray.300"
          borderRadius="md"
          justifyContent="center"
          alignItems="center"
          w="100px"
        >
          <HStack alignItems="center" space={1}>
            <Text fontSize="sm" color="coolGray.700">
              {orderStatus === "all"
                ? "All"
                : orderStatus === "placed"
                ? "Placed"
                : orderStatus === "cooking"
                ? "Cooking"
                : orderStatus === "served"
                ? "Served"
                : orderStatus === "paid"
                ? "Paid"
                : orderStatus === "cancelled"
                ? "Cancelled"
                : "All"}
            </Text>
            <Icon
              as={MaterialIcons}
              name="arrow-drop-down"
              size="sm"
              color="coolGray.600"
            />
          </HStack>
        </Pressable>

        <Pressable
          onPress={() => setShowOrderTypeModal(true)}
          h="40px"
          px={2}
          bg="white"
          borderWidth={1}
          borderColor="coolGray.300"
          borderRadius="md"
          justifyContent="center"
          alignItems="center"
          w="100px"
        >
          <HStack alignItems="center" space={1}>
            <Text fontSize="sm" color="coolGray.700">
              {orderType === "all"
                ? "All"
                : orderType === "dine-in"
                ? "Dine"
                : orderType === "parcel"
                ? "Parcel"
                : orderType === "drive-through"
                ? "Drive"
                : orderType === "counter"
                ? "Counter"
                : "All"}
            </Text>
            <Icon
              as={MaterialIcons}
              name="arrow-drop-down"
              size="sm"
              color="coolGray.600"
            />
          </HStack>
        </Pressable>

        <Pressable
          onPress={() => handleDateFilterTypeChange('today')}
          h="40px"
          px={3}
          bg={dateFilterType === 'today' ? "primary.500" : "white"}
          borderWidth={1}
          borderColor={dateFilterType === 'today' ? "primary.500" : "coolGray.300"}
          rounded="md"
          justifyContent="center"
          alignItems="center"
        >
          <Text
            fontSize="sm"
            color={dateFilterType === 'today' ? "white" : "coolGray.700"}
            fontWeight="medium"
          >
            Today
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setIsDateFilterModalVisible(true)}
          h="40px"
          px={2}
          bg="white"
          borderWidth={1}
          borderColor="coolGray.300"
          borderRadius="md"
          justifyContent="center"
          alignItems="center"
          flex={1}
        >
          <HStack
            alignItems="center"
            space={1}
            justifyContent="space-between"
            width="100%"
          >
            <Text fontSize="sm" color="coolGray.700">
              {dateFilterType === 'today'
                ? 'Date Filter'
                : dateFilterType === 'yesterday'
                ? 'Yesterday'
                : dateFilterType === 'thisWeek'
                ? 'This Week'
                : dateFilterType === 'lastWeek'
                ? 'Last Week'
                : dateFilterType === 'thisMonth'
                ? 'This Month'
                : dateFilterType === 'lastMonth'
                ? 'Last Month'
                : dateFilterType === 'customRange' && dateRange.start && dateRange.end
                ? 'Custom Range'
                : 'Date Filter'}
            </Text>
            <Icon
              as={MaterialIcons}
              name="arrow-drop-down"
              size="sm"
              color="coolGray.600"
            />
          </HStack>
        </Pressable>
      </HStack>

      <Box px={4} py={3}>
        <HStack alignItems="center" mb={2}>
          <Text fontSize="md" fontWeight="semibold" color="coolGray.800">
            {dateFilterType === "customRange" && dateRange.start && dateRange.end
              ? `${dateRange.start} to ${dateRange.end}`
              : date}
          </Text>

          {dateFilterType === "customRange" && dateRange.start && dateRange.end && (
            <Pressable
              ml={2}
              onPress={() => {
                handleDateFilterTypeChange("today");
                const today = new Date();
                setDate(formatDateString(today));
                fetchOrders(true);
              }}
            >
              <Icon
                as={MaterialIcons}
                name="close"
                size="sm"
                color="coolGray.500"
              />
            </Pressable>
          )}
        </HStack>

        <Text fontSize="sm" fontWeight="medium" color="coolGray.700" mb={2}>
          Total: {filteredOrders.reduce(
            (total, dateGroup) => total + dateGroup.data.length,
            0
          )}
        </Text>

        {/* Status badges - Single row */}
        <HStack space={2} mb={2} flexWrap="wrap">
          <Badge bg="coolGray.100" rounded="md" px={2} py={1}>
            <Text fontSize="xs" color="coolGray.800">Total: {filteredOrders.reduce(
              (total, dateGroup) => total + dateGroup.data.length,
              0
            )}</Text>
          </Badge>
          
          <Badge bg="orange.100" rounded="md" px={2} py={1}>
            <Text fontSize="xs" color="orange.800">Cooking: {filteredOrders.reduce(
              (total, dateGroup) => total + dateGroup.data.filter(
                (order) => order.order_status?.toLowerCase() === "cooking"
              ).length, 0)}
            </Text>
          </Badge>
          
          <Badge bg="blue.100" rounded="md" px={2} py={1}>
            <Text fontSize="xs" color="blue.800">Paid: {filteredOrders.reduce(
              (total, dateGroup) => total + dateGroup.data.filter(
                (order) => order.order_status?.toLowerCase() === "paid"
              ).length, 0)}
            </Text>
          </Badge>
          
          <Badge bg="indigo.100" rounded="md" px={2} py={1}>
            <Text fontSize="xs" color="indigo.800">Dine-in: {filteredOrders.reduce(
              (total, dateGroup) => total + dateGroup.data.filter(
                (order) => order.order_type?.toLowerCase() === "dine-in"
              ).length, 0)}
            </Text>
          </Badge>
          
          <Badge bg="coolGray.100" rounded="md" px={2} py={1}>
            <Text fontSize="xs" color="coolGray.800">Counter: {filteredOrders.reduce(
              (total, dateGroup) => total + dateGroup.data.filter(
                (order) => order.order_type?.toLowerCase() === "counter"
              ).length, 0)}
            </Text>
          </Badge>
        </HStack>
      </Box>

      {/* Date Picker */}
      {showPicker && (
        <Modal
          isOpen={showPicker}
          onClose={() => setShowPicker(false)}
          size="md"
        >
          <Modal.Content>
            <Modal.CloseButton />
            <Modal.Header>Select Date Range</Modal.Header>
            <Modal.Body p={0}>
              <VStack divider={<Divider />} width="100%">
                <Pressable
                  onPress={() => {
                    handleDateFilterTypeChange("yesterday");
                    setShowPicker(false);
                  }}
                  py={3}
                  px={4}
                >
                  <HStack alignItems="center" justifyContent="space-between">
                    <Text>Yesterday</Text>
                    {dateFilterType === "yesterday" && (
                      <Icon
                        as={MaterialIcons}
                        name="check"
                        size="sm"
                        color="primary.500"
                      />
                    )}
                  </HStack>
                </Pressable>

                <Pressable
                  onPress={() => {
                    handleDateFilterTypeChange("thisWeek");
                    setShowPicker(false);
                  }}
                  py={3}
                  px={4}
                >
                  <HStack alignItems="center" justifyContent="space-between">
                    <Text>This Week</Text>
                    {dateFilterType === "thisWeek" && (
                      <Icon
                        as={MaterialIcons}
                        name="check"
                        size="sm"
                        color="primary.500"
                      />
                    )}
                  </HStack>
                </Pressable>

                <Pressable
                  onPress={() => {
                    handleDateFilterTypeChange("lastWeek");
                    setShowPicker(false);
                  }}
                  py={3}
                  px={4}
                >
                  <HStack alignItems="center" justifyContent="space-between">
                    <Text>Last Week</Text>
                    {dateFilterType === "lastWeek" && (
                      <Icon
                        as={MaterialIcons}
                        name="check"
                        size="sm"
                        color="primary.500"
                      />
                    )}
                  </HStack>
                </Pressable>

                <Pressable
                  onPress={() => {
                    handleDateFilterTypeChange("thisMonth");
                    setShowPicker(false);
                  }}
                  py={3}
                  px={4}
                >
                  <HStack alignItems="center" justifyContent="space-between">
                    <Text>This Month</Text>
                    {dateFilterType === "thisMonth" && (
                      <Icon
                        as={MaterialIcons}
                        name="check"
                        size="sm"
                        color="primary.500"
                      />
                    )}
                  </HStack>
                </Pressable>

                <Pressable
                  onPress={() => {
                    handleDateFilterTypeChange("lastMonth");
                    setShowPicker(false);
                  }}
                  py={3}
                  px={4}
                >
                  <HStack alignItems="center" justifyContent="space-between">
                    <Text>Last Month</Text>
                    {dateFilterType === "lastMonth" && (
                      <Icon
                        as={MaterialIcons}
                        name="check"
                        size="sm"
                        color="primary.500"
                      />
                    )}
                  </HStack>
                </Pressable>
              </VStack>

              <Divider my={2} />

              {/* Custom Date Range Section */}
              <VStack p={4} space={3}>
                <Text fontSize="md" fontWeight="medium" color="coolGray.700">
                  Custom Date Range
                </Text>

                {/* Start Date Section */}
                <Pressable
                  onPress={() => {
                    setShowStartDatePicker(true);
                  }}
                >
                  <Box borderWidth={1} borderColor="coolGray.200" rounded="md">
                    <Text fontSize="sm" color="coolGray.600" px={4} pt={2}>
                      Start Date:
                    </Text>
                    <Text fontSize="md" px={4} pb={2} color="coolGray.800">
                      {customDateRange.startDate ? formatDate(customDateRange.startDate) : "Select Date"}
                    </Text>
                  </Box>
                </Pressable>

                {/* End Date Section */}
                <Pressable
                  onPress={() => {
                    if (!customDateRange.startDate) {
                      setCustomDateRange({
                        ...customDateRange,
                        startDate: formatDate(new Date()),
                      });
                    }
                    setShowEndDatePicker(true);
                  }}
                >
                  <Box borderWidth={1} borderColor="coolGray.200" rounded="md">
                    <Text fontSize="sm" color="coolGray.600" px={4} pt={2}>
                      End Date:
                    </Text>
                    <Text fontSize="md" px={4} pb={2} color="coolGray.800">
                      {customDateRange.endDate || formatDate(new Date())}
                    </Text>
                  </Box>
                </Pressable>

                <Button
                  colorScheme="blue"
                  onPress={() => {
                    setShowPicker(false);
                    
                    // If dates aren't set, use today's date
                    const start = customDateRange.startDate || formatDate(new Date());
                    const end = customDateRange.endDate || formatDate(new Date());
                    
                    setDateFilterType("customRange");
                    setCustomDateRange({
                      startDate: start,
                      endDate: end,
                    });
                    
                    // Show success toast
                    toast.show({
                      description: `Showing orders from ${start} to ${end}`,
                      status: "success",
                      duration: 3000,
                    });
                    
                    fetchOrders(true);
                  }}
                >
                  Apply Date Range
                </Button>
              </VStack>
            </Modal.Body>
          </Modal.Content>
        </Modal>
      )}

      {/* DateTimePicker components - these will appear over the modal on Android */}
      {showStartDatePicker && (
        <DateTimePicker
          value={customDateRange.startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onStartDateChange}
          maximumDate={new Date()} // No future dates
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={customDateRange.endDate || customDateRange.startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onEndDateChange}
          minimumDate={customDateRange.startDate || undefined} // No dates before start date
          maximumDate={new Date()} // No future dates
        />
      )}

      <SectionList
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchOrders(true);
            }}
            colors={["#0891b2"]}
            tintColor="#0891b2"
          />
        }
        sections={filteredOrders}
        keyExtractor={(item) => item.order_id?.toString()}
        renderItem={renderOrderItem}
        // renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={
          <EmptyStateAnimation
            orderStatus={orderStatus}
            orderType={orderType}
          />
        }
        windowSize={5}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        removeClippedSubviews={Platform.OS === "android"}
        onEndReachedThreshold={0.5}
      />

      {renderOrderTypeModal()}
      {renderStatusModal()}

      {/* Date Filter Modal */}
      <Modal
        isOpen={isDateFilterModalVisible}
        onClose={() => setIsDateFilterModalVisible(false)}
        size="md"
      >
        <Modal.Content>
          <Modal.CloseButton />
          <Modal.Header>Select Date Filter</Modal.Header>
          <Modal.Body p={0}>
            <VStack divider={<Divider />} width="100%">
              <Pressable
                onPress={() => {
                  handleDateFilterTypeChange("yesterday");
                  setIsDateFilterModalVisible(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <Text>Yesterday</Text>
                  {dateFilterType === "yesterday" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  handleDateFilterTypeChange("thisWeek");
                  setIsDateFilterModalVisible(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <Text>This Week</Text>
                  {dateFilterType === "thisWeek" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  handleDateFilterTypeChange("lastWeek");
                  setIsDateFilterModalVisible(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <Text>Last Week</Text>
                  {dateFilterType === "lastWeek" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  handleDateFilterTypeChange("thisMonth");
                  setIsDateFilterModalVisible(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <Text>This Month</Text>
                  {dateFilterType === "thisMonth" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>

              <Pressable
                onPress={() => {
                  handleDateFilterTypeChange("lastMonth");
                  setIsDateFilterModalVisible(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <Text>Last Month</Text>
                  {dateFilterType === "lastMonth" && (
                    <Icon
                      as={MaterialIcons}
                      name="check"
                      size="sm"
                      color="primary.500"
                    />
                  )}
                </HStack>
              </Pressable>
            </VStack>

            <Divider my={2} />

            {/* Custom Date Range Section */}
            <VStack p={4} space={3}>
              <Text fontSize="md" fontWeight="medium" color="coolGray.700">
                Custom Date Range
              </Text>

              {/* Start Date Section */}
              <Pressable
                onPress={() => {
                  setShowStartDatePicker(true);
                  setIsDateFilterModalVisible(false);
                }}
              >
                <Box borderWidth={1} borderColor="coolGray.200" rounded="md">
                  <Text fontSize="sm" color="coolGray.600" px={4} pt={2}>
                    Start Date:
                  </Text>
                  <Text fontSize="md" px={4} pb={2} color="coolGray.800">
                    {customDateRange.startDate ? formatDateString(customDateRange.startDate) : "Select Date"}
                  </Text>
                </Box>
              </Pressable>

              {/* End Date Section */}
              <Pressable
                onPress={() => {
                  if (!customDateRange.startDate) {
                    setCustomDateRange({
                      ...customDateRange,
                      startDate: new Date(),
                    });
                  }
                  setShowEndDatePicker(true);
                  setIsDateFilterModalVisible(false);
                }}
              >
                <Box borderWidth={1} borderColor="coolGray.200" rounded="md">
                  <Text fontSize="sm" color="coolGray.600" px={4} pt={2}>
                    End Date:
                  </Text>
                  <Text fontSize="md" px={4} pb={2} color="coolGray.800">
                    {customDateRange.endDate ? formatDateString(customDateRange.endDate) : "Select Date"}
                  </Text>
                </Box>
              </Pressable>

              <Button
                colorScheme="blue"
                onPress={handleApplyCustomDateRange}
              >
                Apply Date Range
              </Button>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </Box>
  );
};

export default OrdersScreen;
