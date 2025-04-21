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
          <Text fontSize="lg" fontWeight="bold">
            #{order.order_number}
          </Text>
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
                  name={ORDER_TYPE_ICONS[order.order_type?.toLowerCase()] || ORDER_TYPE_ICONS.DEFAULT}
                  size="xs"
                  color="coolGray.500"
                />
                <Text fontSize="xs">{order.order_type}</Text>
              </HStack>
            </Badge>
            
            <Spacer />
            
            <Badge
              colorScheme="coolGray"
              rounded="sm"
              variant="subtle"
            >
              <Text fontSize="xs">{order.menu_count || 0} Items</Text>
            </Badge>
          </HStack>
        </VStack>

        {/* Price Details */}
        <HStack
          justifyContent="flex-end"
          mt={4}
          pt={3}
          borderTopWidth={1}
          borderTopColor="gray.200"
        >
          <VStack alignItems="flex-end">
            <Text fontSize="md" fontWeight="bold" color="primary.600">
              ₹{Number(order.grand_total || 0).toFixed(2)}
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
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  
  switch (filter) {
    case 'today':
      return {
        start: formatDateString(startOfDay),
        end: formatDateString(new Date()),
        label: 'Today'
      };
    case 'yesterday': {
      const yesterday = new Date(startOfDay);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: formatDateString(yesterday),
        end: formatDateString(yesterday),
        label: 'Yesterday'
      };
    }
    case 'this_week': {
      const firstDay = new Date(startOfDay);
      firstDay.setDate(firstDay.getDate() - firstDay.getDay());
      return {
        start: formatDateString(firstDay),
        end: formatDateString(new Date()),
        label: 'This Week'
      };
    }
    case 'last_week': {
      const lastWeekStart = new Date(startOfDay);
      lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
      return {
        start: formatDateString(lastWeekStart),
        end: formatDateString(lastWeekEnd),
        label: 'Last Week'
      };
    }
    case 'this_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: formatDateString(firstDay),
        end: formatDateString(new Date()),
        label: 'This Month'
      };
    }
    case 'last_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        start: formatDateString(firstDay),
        end: formatDateString(lastDay),
        label: 'Last Month'
      };
    }
    case 'custom':
      return {
        start: '',
        end: '',
        label: 'Custom Date'
      };
    default:
      return {
        start: formatDateString(new Date()),
        end: formatDateString(new Date()),
        label: 'Today'
      };
  }
};

// Add this function after the getDateRange function
const sortOrders = (orders, sortKey, ascending) => {
  if (!orders || orders.length === 0) return orders;

  // Create a deep copy of the orders to avoid mutating the original
  const sortedOrders = JSON.parse(JSON.stringify(orders));

  // Sort each date group's data array
  return sortedOrders.map(dateGroup => {
    const sortedData = [...dateGroup.data].sort((a, b) => {
      switch (sortKey) {
        case 'order_number':
          // Sort by order number (numeric)
          return ascending
            ? parseInt(a.order_number) - parseInt(b.order_number)
            : parseInt(b.order_number) - parseInt(a.order_number);
        
        case 'time':
          // Sort by time
          return ascending
            ? new Date(a.datetime || a.time) - new Date(b.datetime || b.time)
            : new Date(b.datetime || b.time) - new Date(a.datetime || a.time);
        
        case 'amount':
          // Sort by total amount
          const aAmount = Number(a.total_bill_amount || 0);
          const bAmount = Number(b.total_bill_amount || 0);
          return ascending ? aAmount - bAmount : bAmount - aAmount;
        
        case 'status':
          // Sort by status (alphabetical)
          const statusOrder = {
            'placed': 1,
            'cooking': 2,
            'served': 3,
            'paid': 4,
            'cancelled': 5
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
  const [date, setDate] = useState(() => {
    const today = new Date();
    return formatDateString(today);
  });

  const [showPicker, setShowPicker] = useState(false);
  const [dateFilter, setDateFilter] = useState('today');
  const [dateRange, setDateRange] = useState(getDateRange('today'));
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isTodayActive, setIsTodayActive] = useState(true);

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
        start: formattedStartDate
      });
      
      // Open the date picker modal again
      setTimeout(() => {
        setShowPicker(true);
      }, 300);
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
        }, 500);
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
        }, 500);
        return;
      }
      
      // Set the end date
      setEndDate(selectedDate);
      const formattedEndDate = formatDateString(selectedDate);
      setDateRange({
        ...dateRange,
        end: formattedEndDate
      });
      
      // Open the date picker modal again
      setTimeout(() => {
        setShowPicker(true);
      }, 300);
    }
  };

  // Function to set date filter and update UI state
  const handleDateFilterChange = (filter) => {
    setDateFilter(filter);
    
    // Set today button state
    setIsTodayActive(filter === 'today');
    
    if (filter === 'custom') {
      setShowPicker(true);
    } else {
      // Get the date range for this filter
      const newRange = getDateRange(filter);
      setDateRange(newRange);
      
      // For "today" filter, set the current date to today
      // For other filters, set it to the end date of the range
      setDate(filter === 'today' ? formatDateString(new Date()) : newRange.end);
      
      // Fetch orders with the updated date
      fetchOrders(true);
    }
  };

  // Add useEffect to handle date range changes
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
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
      // Parse input dates from format "DD MMM YYYY"
      const [day, month, year] = dateString.split(" ");
      const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(month);
      
      if (monthIndex === -1) return false;
      
      const date = new Date(parseInt(year), monthIndex, parseInt(day));
      
      // Parse start date
      const [startDay, startMonth, startYear] = startDateString.split(" ");
      const startMonthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(startMonth);
      const startDateObj = new Date(parseInt(startYear), startMonthIndex, parseInt(startDay));
      
      // Parse end date
      const [endDay, endMonth, endYear] = endDateString.split(" ");
      const endMonthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(endMonth);
      const endDateObj = new Date(parseInt(endYear), endMonthIndex, parseInt(endDay));
      
      // Set times to ensure full day comparison
      startDateObj.setHours(0, 0, 0, 0);
      endDateObj.setHours(23, 59, 59, 999);
      date.setHours(12, 0, 0, 0);
      
      return date >= startDateObj && date <= endDateObj;
    } catch (error) {
      console.error("Error checking date range:", error);
      return false;
    }
  };

  // Update the fetchOrders function to handle date range filtering
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
        // Store all orders but filter display based on selected date or date range
        setOrders(data.lists);

        // Filter orders for timers based on selected date
        const relevantOrders = dateFilter === 'custom' && dateRange.start && dateRange.end
          ? data.lists.filter(section => isDateInRange(section.date, dateRange.start, dateRange.end))
          : data.lists.find(section => section.date === date);

        const newTimers = {};
        
        if (dateFilter === 'custom' && dateRange.start && dateRange.end) {
          // If custom date range, check all matching sections
          if (Array.isArray(relevantOrders)) {
            relevantOrders.forEach(section => {
              section.data.forEach(order => {
                if (order.order_status?.toLowerCase() === "placed") {
                  newTimers[order.order_number] = calculateOrderTimer(order.datetime);
                }
              });
            });
          }
        } else if (relevantOrders) {
          // If single date match
          relevantOrders.data.forEach(order => {
            if (order.order_status?.toLowerCase() === "placed") {
              newTimers[order.order_number] = calculateOrderTimer(order.datetime);
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

    // Only set up auto-refresh if the selected date is today
    const today = new Date();
    const [selectedDay, selectedMonth, selectedYear] = date.split(" ");
    const selectedDate = new Date(`${selectedMonth} ${selectedDay}, ${selectedYear}`);
    
    if (selectedDate.toDateString() === today.toDateString()) {
      const refreshInterval = setInterval(() => {
        console.log("Auto-refreshing orders for date:", date);
        fetchOrders(true);
      }, 60000);

      return () => clearInterval(refreshInterval);
    }
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

  // Add this function to the OrdersScreen component
  const toggleSortDirection = () => {
    setIsAscending(!isAscending);
  };
  
  // Update the filtered orders calculation to handle date ranges
  const filteredOrders = useMemo(() => {
    if (!orders || !orders.length) return [];

    let relevantSections = [];

    if (dateFilter === 'custom' && dateRange.start && dateRange.end) {
      // For custom date range, filter all sections within the range
      relevantSections = orders
        .filter(section => isDateInRange(section.date, dateRange.start, dateRange.end))
        .map(section => ({
          ...section,
          data: section.data
            .filter(order => {
              // Apply status filter
              if (orderStatus !== "all") {
                return order.order_status?.toLowerCase() === orderStatus.toLowerCase();
              }
              return true;
            })
            .filter(order => {
              // Apply order type filter
              if (orderType !== "all") {
                return order.order_type?.toLowerCase() === orderType.toLowerCase();
              }
              return true;
            })
            .filter(order => {
              // Apply search filter
              if (searchQuery) {
                return order.order_number.toLowerCase().includes(searchQuery.toLowerCase());
              }
              return true;
            })
        }));
    } else {
      // For single date, find the matching section
      const dateSection = orders.find(section => section.date === date);
      if (!dateSection) return [];

      // Create a section with the selected date and filtered data
      relevantSections = [{
        date: date,
        data: dateSection.data
          .filter(order => {
            // Apply status filter
            if (orderStatus !== "all") {
              return order.order_status?.toLowerCase() === orderStatus.toLowerCase();
            }
            return true;
          })
          .filter(order => {
            // Apply order type filter
            if (orderType !== "all") {
              return order.order_type?.toLowerCase() === orderType.toLowerCase();
            }
            return true;
          })
          .filter(order => {
            // Apply search filter
            if (searchQuery) {
              return order.order_number.toLowerCase().includes(searchQuery.toLowerCase());
            }
            return true;
          })
      }];
    }

    // Apply sorting to all relevant sections
    return sortOrders(relevantSections, sortBy, isAscending);
  }, [orders, date, orderStatus, orderType, searchQuery, sortBy, isAscending, dateFilter, dateRange]);

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
      <Modal isOpen={showOrderTypeModal} onClose={() => setShowOrderTypeModal(false)}>
        <Modal.Content>
          <Modal.CloseButton />
          <Modal.Header>Select Order Type</Modal.Header>
          <Modal.Body p={0}>
            <VStack divider={<Divider />} width="100%">
              <Pressable 
                onPress={() => {
                  setOrderType("all");
                  setShowOrderTypeModal(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <Text>All Types</Text>
                  {orderType === "all" && (
                    <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                  )}
                </HStack>
              </Pressable>
              
              <Pressable 
                onPress={() => {
                  setOrderType("dine-in");
                  setShowOrderTypeModal(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Icon as={MaterialIcons} name={ORDER_TYPE_ICONS["dine-in"]} size="sm" color="coolGray.600" />
                    <Text>Dine-in</Text>
                  </HStack>
                  {orderType === "dine-in" && (
                    <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                  )}
                </HStack>
              </Pressable>
              
              <Pressable 
                onPress={() => {
                  setOrderType("parcel");
                  setShowOrderTypeModal(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Icon as={MaterialIcons} name={ORDER_TYPE_ICONS["parcel"]} size="sm" color="coolGray.600" />
                    <Text>Parcel</Text>
                  </HStack>
                  {orderType === "parcel" && (
                    <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                  )}
                </HStack>
              </Pressable>
              
              <Pressable 
                onPress={() => {
                  setOrderType("drive-through");
                  setShowOrderTypeModal(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Icon as={MaterialIcons} name={ORDER_TYPE_ICONS["drive-through"]} size="sm" color="coolGray.600" />
                    <Text>Drive-through</Text>
                  </HStack>
                  {orderType === "drive-through" && (
                    <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                  )}
                </HStack>
              </Pressable>
              
              <Pressable 
                onPress={() => {
                  setOrderType("counter");
                  setShowOrderTypeModal(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Icon as={MaterialIcons} name={ORDER_TYPE_ICONS["counter"]} size="sm" color="coolGray.600" />
                    <Text>Counter</Text>
                  </HStack>
                  {orderType === "counter" && (
                    <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
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
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <Text>All Statuses</Text>
                  {orderStatus === "all" && (
                    <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                  )}
                </HStack>
              </Pressable>
              
              <Pressable 
                onPress={() => {
                  setOrderStatus("placed");
                  setShowStatusModal(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Badge bg={`${ORDER_STATUS_COLORS.PLACED}.500`} rounded="full" size="xs" />
                    <Text>Placed</Text>
                  </HStack>
                  {orderStatus === "placed" && (
                    <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                  )}
                </HStack>
              </Pressable>
              
              <Pressable 
                onPress={() => {
                  setOrderStatus("cooking");
                  setShowStatusModal(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Badge bg={`${ORDER_STATUS_COLORS.COOKING}.500`} rounded="full" size="xs" />
                    <Text>Cooking</Text>
                  </HStack>
                  {orderStatus === "cooking" && (
                    <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                  )}
                </HStack>
              </Pressable>
              
              <Pressable 
                onPress={() => {
                  setOrderStatus("served");
                  setShowStatusModal(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Badge bg={`${ORDER_STATUS_COLORS.SERVED}.500`} rounded="full" size="xs" />
                    <Text>Served</Text>
                  </HStack>
                  {orderStatus === "served" && (
                    <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                  )}
                </HStack>
              </Pressable>
              
              <Pressable 
                onPress={() => {
                  setOrderStatus("paid");
                  setShowStatusModal(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Badge bg={`${ORDER_STATUS_COLORS.PAID}.500`} rounded="full" size="xs" />
                    <Text>Paid</Text>
                  </HStack>
                  {orderStatus === "paid" && (
                    <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                  )}
                </HStack>
              </Pressable>
              
              <Pressable 
                onPress={() => {
                  setOrderStatus("cancelled");
                  setShowStatusModal(false);
                }}
                py={3}
                px={4}
              >
                <HStack alignItems="center" justifyContent="space-between">
                  <HStack alignItems="center" space={2}>
                    <Badge bg={`${ORDER_STATUS_COLORS.CANCELLED}.500`} rounded="full" size="xs" />
                    <Text>Cancelled</Text>
                  </HStack>
                  {orderStatus === "cancelled" && (
                    <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                  )}
                </HStack>
              </Pressable>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    );
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
      <Header title="My Orders" />

      <HStack
        px={4}
        py={3}
        bg="gray.100"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
        alignItems="center"
      >
        <Pressable 
          flex={1}
          onPress={() => {}}
          flexDirection="row"
          alignItems="center"
          mr={2}
        >
          <Icon as={MaterialIcons} name="business" size="sm" color="gray.600" mr={1} />
          <Text fontWeight="semibold" mr={1}>Jagdamb</Text>
          <Icon as={MaterialIcons} name="keyboard-arrow-down" size="sm" color="gray.600" />
        </Pressable>
        
        <Badge bg="amber.500" rounded="sm" px={2} py={0.5}>
          <Text color="white" fontSize="xs" fontWeight="bold">
            TESTING
          </Text>
        </Badge>
      </HStack>

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
          w="70px"
        >
          <HStack alignItems="center" space={1}>
            <Text fontSize="sm" color="coolGray.700">
              {orderStatus === "all" ? "All" :
               orderStatus === "placed" ? "Placed" :
               orderStatus === "cooking" ? "Cooking" :
               orderStatus === "served" ? "Served" :
               orderStatus === "paid" ? "Paid" :
               orderStatus === "cancelled" ? "Cancelled" : "All"}
            </Text>
            <Icon as={MaterialIcons} name="arrow-drop-down" size="sm" color="coolGray.600" />
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
          w="70px"
        >
          <HStack alignItems="center" space={1}>
            <Text fontSize="sm" color="coolGray.700">
              {orderType === "all" ? "All" :
               orderType === "dine-in" ? "Dine" :
               orderType === "parcel" ? "Parcel" :
               orderType === "drive-through" ? "Drive" :
               orderType === "counter" ? "Counter" : "All"}
            </Text>
            <Icon as={MaterialIcons} name="arrow-drop-down" size="sm" color="coolGray.600" />
          </HStack>
        </Pressable>
        
        <Pressable 
          onPress={() => handleDateFilterChange('today')}
          h="40px"
          px={3}
          bg={isTodayActive ? "#2196F3" : "white"}
          borderWidth={1}
          borderColor={isTodayActive ? "#2196F3" : "coolGray.300"}
          rounded="md"
          justifyContent="center"
          alignItems="center"
        >
          <Text fontSize="sm" color={isTodayActive ? "white" : "coolGray.700"} fontWeight="medium">
            Today
          </Text>
        </Pressable>
        
        <Pressable 
          onPress={() => setShowPicker(true)}
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
          <HStack alignItems="center" space={1} justifyContent="space-between" width="100%">
            <Text fontSize="sm" color="coolGray.700">
              {dateFilter === 'today' ? 'Date Filter' :
               dateFilter === 'yesterday' ? 'Yesterday' :
               dateFilter === 'this_week' ? 'This Week' :
               dateFilter === 'last_week' ? 'Last Week' :
               dateFilter === 'this_month' ? 'This Month' :
               dateFilter === 'last_month' ? 'Last Month' :
               dateFilter === 'custom' ? 'Custom Date' : 'Date Filter'}
            </Text>
            <Icon as={MaterialIcons} name="arrow-drop-down" size="sm" color="coolGray.600" />
          </HStack>
        </Pressable>
      </HStack>
      
      <Box px={4} py={2}>
        <HStack alignItems="center" mb={3}>
          <Text fontSize="md" fontWeight="semibold" color="coolGray.800">
            {dateFilter === 'custom' && dateRange.start && dateRange.end
              ? `${dateRange.start} to ${dateRange.end}`
              : date}
          </Text>
          
          {dateFilter === 'custom' && dateRange.start && dateRange.end && (
            <Pressable 
              ml={2}
              onPress={() => {
                setDateFilter('today');
                const today = new Date();
                setDate(formatDateString(today));
                fetchOrders(true);
              }}
            >
              <Icon as={MaterialIcons} name="close" size="sm" color="coolGray.500" />
            </Pressable>
          )}
        </HStack>
        
        <HStack space={3} alignItems="center">
          <Text fontSize="sm" color="coolGray.700">
            Total: {orders.reduce((total, dateGroup) => total + dateGroup.data.length, 0)}
          </Text>
          
          <HStack alignItems="center" space={1}>
            <Icon as={MaterialIcons} name="fastfood" size="xs" color="orange.500" />
            <Text fontSize="sm" color="orange.500">
              Cooking: {orders.reduce((total, dateGroup) => 
                total + dateGroup.data.filter(order => 
                  order.order_status?.toLowerCase() === "cooking"
                ).length, 0)}
            </Text>
          </HStack>
          
          <HStack alignItems="center" space={1}>
            <Icon as={MaterialIcons} name="restaurant" size="xs" color="blue.500" />
            <Text fontSize="sm" color="blue.500">
              Dine-in: {orders.reduce((total, dateGroup) => 
                total + dateGroup.data.filter(order => 
                  order.order_type?.toLowerCase() === "dine-in"
                ).length, 0)}
            </Text>
          </HStack>
        </HStack>
      </Box>

      {/* Date Picker */}
      {showPicker && (
        <Modal isOpen={showPicker} onClose={() => setShowPicker(false)} size="md">
          <Modal.Content>
            <Modal.CloseButton />
            <Modal.Header>Select Date Range</Modal.Header>
            <Modal.Body p={0}>
              <VStack divider={<Divider />} width="100%">
                <Pressable 
                  onPress={() => {
                    handleDateFilterChange('yesterday');
                    setShowPicker(false);
                  }}
                  py={3}
                  px={4}
                >
                  <HStack alignItems="center" justifyContent="space-between">
                    <Text>Yesterday</Text>
                    {dateFilter === 'yesterday' && (
                      <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                    )}
                  </HStack>
                </Pressable>
                
                <Pressable 
                  onPress={() => {
                    handleDateFilterChange('this_week');
                    setShowPicker(false);
                  }}
                  py={3}
                  px={4}
                >
                  <HStack alignItems="center" justifyContent="space-between">
                    <Text>This Week</Text>
                    {dateFilter === 'this_week' && (
                      <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                    )}
                  </HStack>
                </Pressable>
                
                <Pressable 
                  onPress={() => {
                    handleDateFilterChange('last_week');
                    setShowPicker(false);
                  }}
                  py={3}
                  px={4}
                >
                  <HStack alignItems="center" justifyContent="space-between">
                    <Text>Last Week</Text>
                    {dateFilter === 'last_week' && (
                      <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                    )}
                  </HStack>
                </Pressable>

                <Pressable 
                  onPress={() => {
                    handleDateFilterChange('this_month');
                    setShowPicker(false);
                  }}
                  py={3}
                  px={4}
                >
                  <HStack alignItems="center" justifyContent="space-between">
                    <Text>This Month</Text>
                    {dateFilter === 'this_month' && (
                      <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                    )}
                  </HStack>
                </Pressable>

                <Pressable 
                  onPress={() => {
                    handleDateFilterChange('last_month');
                    setShowPicker(false);
                  }}
                  py={3}
                  px={4}
                >
                  <HStack alignItems="center" justifyContent="space-between">
                    <Text>Last Month</Text>
                    {dateFilter === 'last_month' && (
                      <Icon as={MaterialIcons} name="check" size="sm" color="primary.500" />
                    )}
                  </HStack>
                </Pressable>
              </VStack>
              
              <Divider my={2} />
              
              {/* Custom Date Range Section */}
              <VStack p={4} space={3}>
                <Text fontWeight="medium">Custom Date Range</Text>
                
                <Pressable
                  borderWidth={1}
                  borderColor="coolGray.300"
                  p={3}
                  rounded="md"
                  onPress={() => {
                    setShowPicker(false);
                    setTimeout(() => {
                      // Set default date to today or existing start date
                      const defaultDate = dateRange.start ? 
                        (() => {
                          try {
                            const [day, month, year] = dateRange.start.split(" ");
                            const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(month);
                            return new Date(parseInt(year), monthIndex, parseInt(day));
                          } catch (e) {
                            return new Date();
                          }
                        })() : 
                        new Date();
                      
                      setPickerDate(defaultDate);
                      setShowDatePicker(true);
                    }, 300);
                  }}
                >
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text color="coolGray.600">Start Date:</Text>
                    <Text>{dateRange.start || formatDateString(new Date())}</Text>
                  </HStack>
                </Pressable>
                
                <Pressable
                  borderWidth={1}
                  borderColor="coolGray.300"
                  p={3}
                  rounded="md"
                  onPress={() => {
                    if (!dateRange.start) {
                      // If start date is not set, set it first
                      setDateRange({
                        ...dateRange,
                        start: formatDateString(new Date())
                      });
                    }
                    
                    setShowPicker(false);
                    setTimeout(() => {
                      // Set default date to today, existing end date, or day after start date
                      const defaultDate = dateRange.end ? 
                        (() => {
                          try {
                            const [day, month, year] = dateRange.end.split(" ");
                            const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(month);
                            return new Date(parseInt(year), monthIndex, parseInt(day));
                          } catch (e) {
                            return new Date();
                          }
                        })() : 
                        dateRange.start ? 
                          (() => {
                            try {
                              const [day, month, year] = dateRange.start.split(" ");
                              const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(month);
                              const startDate = new Date(parseInt(year), monthIndex, parseInt(day));
                              // Set to the same day as start date by default
                              return startDate;
                            } catch (e) {
                              return new Date();
                            }
                          })() : 
                          new Date();
                      
                      setEndDate(defaultDate);
                      setShowEndDatePicker(true);
                    }, 300);
                  }}
                >
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text color="coolGray.600">End Date:</Text>
                    <Text>{dateRange.end || formatDateString(new Date())}</Text>
                  </HStack>
                </Pressable>
                
                <Button 
                  colorScheme="blue"
                  onPress={() => {
                    setShowPicker(false);
                    
                    // If dates aren't set, use today's date
                    const start = dateRange.start || formatDateString(new Date());
                    const end = dateRange.end || formatDateString(new Date());
                    
                    setDateFilter('custom');
                    setDateRange({
                      start,
                      end,
                      label: 'Custom Date'
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
      
      {showDatePicker && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setPickerDate(date);
              handleDatePickerChange(event, date);
            }
          }}
          maximumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            if (date) {
              handleEndDatePickerChange(event, date);
            } else {
              setShowEndDatePicker(false);
            }
          }}
          maximumDate={new Date()}
          minimumDate={startDate}
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

      {renderOrderTypeModal()}
      {renderStatusModal()}
    </Box>
  );
};

export default OrdersScreen;
