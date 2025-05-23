import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Platform,
  SafeAreaView,
  Modal,
  ScrollView,
  BackHandler,
} from "react-native";
import axios from "axios";
import globalStyles from "../../styles";
import RemixIcon from "react-native-remix-icon";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import { onGetProductionUrl } from "../utils/ConstantFunctions"; // Assuming globalStyles is imported correctly
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import MainToolBar from "../MainToolbar";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";

const ORDER_STATUS_COLORS = {
  PLACED: "#4B89DC",    // Blue for Placed
  COOKING: "#FF9800",   // Orange for Cooking
  SERVED: "#0C8B51",    // Green for Served
  PAID: "#673AB7",      // Purple for Paid
  CANCELLED: "#F44336", // Red for Cancelled
  DEFAULT: "#9E9E9E",   // Gray for Default
};

const ORDER_TYPE_ICONS = {
  "dine-in": "restaurant-fill",
  "take-away": "takeaway-fill",
  "parcel": "hand-heart-fill",
  "delivery": "motorbike-fill",
  "drive-through": "car-fill",
  "counter": "store-2-fill",
  "DEFAULT": "restaurant-2-fill",
};

const ORDER_TYPE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Dine-in", value: "dine-in" },
  { label: "Parcel", value: "parcel" },
  { label: "Drive-Through", value: "drive-through" },
  { label: "Counter", value: "counter" },
];

const OrderList = ({ route }) => {
  const { selectedOrderStatus = "all" } = route.params || {};
  const [orderStatus, setOrderStatus] = useState(selectedOrderStatus);
  const [orderList, setOrderList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // State for refreshing
  const [selected, setSelected] = useState("All"); // Track selected button
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState(""); // State for search query

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [dateFilterType, setDateFilterType] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(),
    endDate: new Date(),
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isDateFilterModalVisible, setIsDateFilterModalVisible] = useState(false);

  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [isOrderTypeModalVisible, setIsOrderTypeModalVisible] = useState(false);
  const [isAscending, setIsAscending] = useState(true);

  const [collapsedDates, setCollapsedDates] = useState({});
  const [allCollapsed, setAllCollapsed] = useState(false);

  const [selectedOrderType, setSelectedOrderType] = useState("All");

  const orderTypeOptions = [
    "All",
    "Dine-in",
    "Parcel",
    "Drive-through",
    "Counter",
  ];

  const [filterOptions] = useState([
    { label: "All", value: "all" },
    { label: "Dine-in", value: "dine-in" },
    { label: "Parcel", value: "parcel" },
    { label: "Delivery", value: "delivery" },
    { label: "Drive-Through", value: "drive-through" },
    { label: "Counter", value: "counter" },
  ]);

  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const formatDate = (inputDate) => {
    try {
      if (!inputDate) return "";

      const date = new Date(inputDate);
      if (isNaN(date.getTime())) {
        // If it's already in the API format (e.g. "03 Jan 2025"), return as is
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

  // Add handleRefresh function
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      console.log("🎯 Screen focused - fetching orders");
      fetchOrders();
    }, [])
  );

  // Remove or modify the initial fetch useEffect
  // Since useFocusEffect will handle the fetching on mount and navigation
  useEffect(() => {
    // Set up auto-refresh interval (60 seconds)
    const refreshInterval = setInterval(() => {
      console.log("Auto-refreshing orders list...");
      fetchOrders(true); // Pass true to indicate it's an auto-refresh
    }, 60000);

    // Cleanup interval on component unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, []); // Empty dependency array for setup only

  // Update notification listener
  useEffect(() => {
    console.log("🔔 Setting up notification listener");
    const subscription = Notifications.addNotificationResponseReceivedListener(
      () => {
        console.log("📱 Notification received, refreshing orders");
        if (!refreshing) {
          handleRefresh();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Update the fetchOrders function to handle silent refresh
  const fetchOrders = async (isSilentRefresh = false) => {
    console.log("🔄 Fetching orders... Silent refresh:", isSilentRefresh);

    if (!isSilentRefresh) setLoading(true);

    try {
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      console.log("Debug - Token:", accessToken);
      console.log("Debug - Restaurant ID:", restaurantId);

      const response = await axiosInstance.post(
        `${onGetProductionUrl()}order_listview`,
        {
          outlet_id: restaurantId,
          created_by_id: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("API Response:", response.data);

      if (response?.data?.st === 1 && response.data.lists) {
        // Transform the nested date structure into a flat array of orders
        const formattedOrders = response.data.lists.reduce((acc, dateGroup) => {
          const orders = dateGroup.data.map((order) => ({
            ...order,
            date: dateGroup.date,
            time: order.time,
            table_number: Array.isArray(order.table_number)
              ? order.table_number
              : order.table_number
              ? [order.table_number]
              : [],
          }));
          return [...acc, ...orders];
        }, []);

        setOrderList(formattedOrders);

        // Set up collapsed states for date groups
        const today = new Date();
        const currentDateStr = formatDate(today);

        const initialCollapsedStates = {};
        response.data.lists.forEach((dateGroup) => {
          if (dateGroup.date !== currentDateStr) {
            initialCollapsedStates[dateGroup.date] = true;
          }
        });
        setCollapsedDates(initialCollapsedStates);
      } else {
        console.error("API Error:", response?.data?.msg);
        setOrderList([]);
      }
    } catch (error) {
      console.error(
        "❌ Error fetching orders:",
        error.response?.data || error.message
      );
      setOrderList([]);
    } finally {
      setLoading(false);
      if (!isSilentRefresh) setRefreshing(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleViewDetails = (order) => {
    const status = order.order_status.toLowerCase();
    console.log("Clicked order status:", status);

    switch (status) {
      case "placed":
        navigation.navigate("PlacedOrderDetails", {
          orderDetail: order,
          from: "list",
        });
        break;
      case "cooking":
        navigation.navigate("OnGoingOrderDetails", {
          orderDetail: order,
          from: "list",
        });
        break;
      case "served":
        navigation.navigate("ServedOrderDetails", {
          orderDetail: order,
          from: "list",
        });
        break;
      case "paid":
        navigation.navigate("CompletedOrderDetails", {
          orderDetail: order,
          from: "list",
        });
        break;
      case "cancle":
      case "cancel":
      case "cancelled":
        navigation.navigate("CancelledOrderDetails", {
          orderDetail: order,
          from: "list",
        });
        break;
      default:
        console.warn("Unknown order status:", status);
    }
  };

  const handleToggle = (status) => {
    setSelected(status);
    if (status === "All") {
      setOrderStatus("all");
    } else {
      const apiStatus =
        status.toLowerCase() === "cancelled" ? "cancel" : status.toLowerCase();
      setOrderStatus(apiStatus);
    }
    // Trigger a re-fetch when status changes
    fetchOrders();
  };

  const filteredOrders = useMemo(() => {
    return orderList.filter((order) => {
      if (selected === "All") return true;
      return order.order_status?.toLowerCase() === selected.toLowerCase();
    });
  }, [orderList, selected]);

  const getOrderTypeIcon = (orderType) => {
    switch (orderType?.toLowerCase()) {
      case "dine-in":
        return {
          icon: ORDER_TYPE_ICONS["dine-in"], // 'ri-restaurant-fill'
          color: "#666666", // Grey color for dine-in
        };
      case "parcel":
      case "parcel":
        return {
          icon: ORDER_TYPE_ICONS["parcel"], // 'ri-takeaway-fill'
          color: "#666666", // Green color for takeaway/parcel
        };
      case "delivery":
        return {
          icon: ORDER_TYPE_ICONS["delivery"], // 'ri-bike-fill'
          color: "#666666", // Blue color for delivery
        };
      case "drive-through":
        return {
          icon: ORDER_TYPE_ICONS["drive-through"], // 'ri-car-fill'
          color: "#666666", // Orange color for drive-through
        };
      case "counter":
        return {
          icon: ORDER_TYPE_ICONS["counter"], // 'ri-store-2-fill'
          color: "#666666", // Purple color for counter
        };
      default:
        return {
          icon: ORDER_TYPE_ICONS["DEFAULT"], // 'ri-restaurant-2-fill'
          color: "#666666", // Default gray color
        };
    }
  };

  const parseTimeString = (timeString) => {
    console.log("Parsing time string:", timeString);
    try {
      if (!timeString) return new Date();

      // Split the components
      const [day, month, year, time, meridiem] = timeString.split(" ");
      const [hours, minutes, seconds] = time.split(":");

      // Convert month name to number (0-11)
      const monthMap = {
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

      // Convert to 24-hour format
      let hour24 = parseInt(hours);
      if (meridiem === "PM" && hour24 !== 12) {
        hour24 += 12;
      } else if (meridiem === "AM" && hour24 === 12) {
        hour24 = 0;
      }

      // Create date object directly with numeric values
      const parsedDate = new Date(
        parseInt(year),
        monthMap[month],
        parseInt(day),
        hour24,
        parseInt(minutes),
        parseInt(seconds)
      );

      console.log("Date components:", {
        year: parseInt(year),
        month: monthMap[month],
        day: parseInt(day),
        hour: hour24,
        minutes: parseInt(minutes),
        seconds: parseInt(seconds),
      });
      console.log("Parsed date:", parsedDate.toISOString());

      return parsedDate;
    } catch (error) {
      console.error("Error parsing time:", error);
      return new Date();
    }
  };

  const calculateRemainingTime = (orderTime) => {
    if (!orderTime) return 0;

    try {
      const orderDate = parseTimeString(orderTime);
      const currentTime = new Date();

      const timeDiff = Math.floor((currentTime - orderDate) / 1000);
      const remainingTime = Math.max(0, 90 - timeDiff);

      console.log("Current time:", currentTime.toISOString());
      console.log("Order time:", orderDate.toISOString());
      console.log("Time difference (seconds):", timeDiff);
      console.log("Remaining time:", remainingTime);

      return remainingTime;
    } catch (error) {
      console.error("Error calculating remaining time:", error);
      return 0;
    }
  };

  // Update the OrderTimer component
  const OrderTimer = ({ orderTime }) => {
    const [remainingTime, setRemainingTime] = useState(() =>
      calculateRemainingTime(orderTime)
    );

    useEffect(() => {
      const timer = setInterval(() => {
        const newTime = calculateRemainingTime(orderTime);
        setRemainingTime(newTime);

        // Add refresh trigger when timer ends
        if (newTime <= 0) {
          clearInterval(timer);
          fetchOrders(true); // Silently refresh when timer ends
        }
      }, 1000);

      return () => clearInterval(timer);
    }, [orderTime]);

    if (remainingTime <= 0) return null;

    return (
      <View style={styles.timerContainer}>
        <RemixIcon
          name="time-line"
          size={14}
          color={remainingTime < 30 ? "#FF0000" : "#FF6B6B"}
        />
        <Text
          style={[
            styles.timerText,
            { color: remainingTime < 30 ? "#FF0000" : "#FF6B6B" },
          ]}
        >
          {`${remainingTime}s`}
        </Text>
      </View>
    );
  };

  const renderOrderItem = ({ item }) => {
    console.log("Rendering order item:", {
      orderNumber: item.order_number,
      status: item.order_status,
      time: item.time || item.occupied_time,
    }); // Debug log

    const getStatusStyle = (status) => {
      switch (status.toLowerCase()) {
        case "placed":
        case "pending":
          return { color: ORDER_STATUS_COLORS.PLACED, icon: "checkbox-blank-circle-line" };
        case "cooking":
          return { color: ORDER_STATUS_COLORS.COOKING, icon: "fire-line" };
        case "served":
          return { color: ORDER_STATUS_COLORS.SERVED, icon: "restaurant-2-line" };
        case "paid":
          return { color: ORDER_STATUS_COLORS.PAID, icon: "checkbox-circle-line" };
        case "cancle":
        case "cancel":
        case "cancelled":
          return { color: ORDER_STATUS_COLORS.CANCELLED, icon: "close-circle-line" };
        default:
          return { color: ORDER_STATUS_COLORS.DEFAULT, icon: "information-line" };
      }
    };

    const statusStyle = getStatusStyle(item.order_status);
    const orderTypeStyle = getOrderTypeIcon(item.order_type);

    return (
      <TouchableOpacity
        style={[
          styles.newCard,
          { borderLeftWidth: 4, borderLeftColor: statusStyle.color },
        ]}
        onPress={() => handleViewDetails(item)}
        activeOpacity={0.7}
      >
        {/* Header with Order Number, Status and Timer */}
        <View style={styles.headerContainer}>
          <View style={styles.orderNumberContainer}>
            <Text style={styles.orderNumber}>#{item.order_number}</Text>
            {item.order_status?.toLowerCase() === "placed" && (
              <OrderTimer orderTime={item.time} />
            )}
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: statusStyle.color }]}
          >
            <Text style={styles.statusBadgeText}>
              {item.order_status?.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Date and Time */}
        <Text style={styles.dateTimeText}>{item.time}</Text>

        {/* Order Details */}
        <View style={styles.detailsContainer}>
          {/* Show table and section only for dine-in orders */}
          {item.order_type?.toLowerCase() === "dine-in" && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Table No:</Text>
                <Text style={styles.detailValue}>
                  {Array.isArray(item.table_number)
                    ? item.table_number.join(", ")
                    : item.table_number}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Section:</Text>
                <Text style={styles.detailValue}>{item.section_name}</Text>
              </View>
            </>
          )}

          {/* Order Type Badge */}
          <View style={styles.orderTypeContainer}>
            <View
              style={[
                styles.badge,
                { backgroundColor: orderTypeStyle.color + "20" },
              ]}
            >
              <View style={styles.badgeContent}>
                <RemixIcon
                  name={orderTypeStyle.icon}
                  size={16}
                  color={orderTypeStyle.color}
                />
                <Text
                  style={[styles.badgeText, { color: orderTypeStyle.color }]}
                >
                  {item.order_type === "parcel"
                    ? "Parcel"
                    : item.order_type === "counter"
                    ? "Counter"
                    : item.order_type}
                </Text>
              </View>
            </View>

            <View style={styles.itemsCountBadge}>
              <Text style={styles.itemsCountText}>
                {item.menu_count || 0} Items
              </Text>
            </View>
          </View>
        </View>

        {/* Add Comment Section if comment exists */}
        {item.comment && (
          <View style={styles.commentContainer}>
            <RemixIcon name="chat-1-line" size={16} color="#666" />
            <Text style={styles.commentText}>{item.comment}</Text>
          </View>
        )}

        {/* Price Details */}
        <View style={styles.priceDetailsContainer}>
          <View style={styles.priceColumn}>
            {item.payment_method && (
              <View style={styles.paymentMethodContainer}>
                <RemixIcon
                  name={
                    item.payment_method.toLowerCase() === "cash"
                      ? "money-dollar-circle-line"
                      : "bank-card-line"
                  }
                  size={14}
                  color="#555"
                />
                <Text style={styles.paymentMethodText}>
                  {item.payment_method.charAt(0).toUpperCase() + item.payment_method.slice(1).toLowerCase()}
                </Text>
              </View>
            )}
            {item.is_paid && item.is_paid !== "null" && (
              <View style={[
                styles.isPaidContainer,
                { backgroundColor: item.is_paid === "paid" ? "#DCFCE7" : "#FAE8FF" }
              ]}>
                <Text style={[
                  styles.isPaidText,
                  { color: item.is_paid === "paid" ? "#15803D" : "#7E22CE" }
                ]}>
                  {item.is_paid.charAt(0).toUpperCase() + item.is_paid.slice(1)}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.priceColumn, styles.rightAlign]}>
            <Text style={styles.totalValue}>
              ₹{item.final_grand_total?.toFixed(2) || 0}
            </Text>
            <Text style={styles.priceLabel}>Grand Total</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const groupOrdersByDate = (orders) => {
    return orders.reduce((acc, order) => {
      const date = order.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(order);
      return acc;
    }, {});
  };

  // Enhance the getOrderStatusCounts function to also count order types
  const getOrderCounts = (orders) => {
    const counts = {
      // Status counts
      placed: 0,
      cooking: 0,
      served: 0,
      paid: 0,
      cancelled: 0,
      
      // Order type counts
      dineIn: 0,
      parcel: 0,
      driveThrough: 0,
      counter: 0,
      delivery: 0, // Add delivery count property
      
      total: orders.length
    };
    
    orders.forEach(order => {
      // Count by status
      const status = order.order_status?.toLowerCase() || "";
      if (status === "placed") counts.placed++;
      else if (status === "cooking") counts.cooking++;
      else if (status === "served") counts.served++;
      else if (status === "paid") counts.paid++;
      else if (["cancle", "cancel", "cancelled"].includes(status)) counts.cancelled++;
      
      // Count by order type
      const orderType = order.order_type?.toLowerCase() || "";
      if (orderType === "dine-in") counts.dineIn++;
      else if (orderType === "parcel") counts.parcel++;
      else if (orderType === "drive-through") counts.driveThrough++;
      else if (orderType === "counter") counts.counter++;
      else if (orderType === "delivery") counts.delivery++; // Add delivery count
    });
    
    return counts;
  };

  // Add this helper function to check if there are any orders for the selected status
  const hasOrdersForStatus = (orders, status) => {
    return orders.some((order) => {
      const orderStatus = order.order_status?.toLowerCase() || "";
      switch (status) {
        case "Placed":
          return orderStatus === "placed";
        case "Cooking":
          return orderStatus === "cooking";
        case "Served":
          return orderStatus === "served";
        case "Paid":
          return orderStatus === "paid";
        case "Cancelled":
          return ["cancle", "cancel", "cancelled"].includes(orderStatus);
        case "All":
          return true;
        default:
          return false;
      }
    });
  };

  // Update the dateFilterOptions to remove Custom Range
  const dateFilterOptions = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "This Week", value: "thisWeek" },
    { label: "Last Week", value: "lastWeek" },
    { label: "This Month", value: "thisMonth" },
    { label: "Last Month", value: "lastMonth" },
  ];

  // Date helper functions to calculate date ranges
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

  // Handle custom date picker changes 
  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const formattedDate = formatDate(selectedDate);
      setCustomDateRange(prev => ({...prev, startDate: selectedDate}));
      
      // If we have both dates, update the dateRange state
      if (customDateRange.endDate) {
        handleDateRangeSelect(selectedDate, customDateRange.endDate);
      }
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      const formattedDate = formatDate(selectedDate);
      setCustomDateRange(prev => ({...prev, endDate: selectedDate}));
      
      // If we have both dates, update the dateRange state
      if (customDateRange.startDate) {
        handleDateRangeSelect(customDateRange.startDate, selectedDate);
      }
    }
  };

  // Add a function to handle date range selection
  const handleDateRangeSelect = (startDate, endDate) => {
    console.log("Date range selected:", startDate, endDate);
    
    if (startDate && endDate) {
      setDateRange({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      });
      
      // Clear the predefined date filter type when custom range is selected
      setDateFilterType('all');
    }
  };

  // Add this function to handle date filter type changes
  const handleDateFilterTypeChange = (type) => {
    setDateFilterType(type);
    
    // Clear custom date range when selecting a predefined filter
    setDateRange({
      startDate: null,
      endDate: null
    });
    
    // Also reset the custom date range inputs
    setCustomDateRange({
      startDate: null,
      endDate: null
    });
  };

  // Helper function to check if a date is within a range
  const isDateInRange = (dateToCheck, startDate, endDate) => {
    // Convert all dates to Date objects for comparison
    const checkDate = parseDateFromFormat(dateToCheck);
    const start = parseDateFromFormat(startDate);
    const end = parseDateFromFormat(endDate);
    
    // Compare the dates
    return checkDate >= start && checkDate <= end;
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

  // Update the getFilteredOrders function to handle both date range and date filter type
  const getFilteredOrders = () => {
    let orders = [...orderList];
    
    // Apply date filtering
    if (dateRange.startDate && dateRange.endDate) {
      // Custom date range is selected
      orders = orders.filter((order) => {
        const orderDate = order.date;
        return isDateInRange(orderDate, dateRange.startDate, dateRange.endDate);
      });
    } else if (dateFilterType !== 'all') {
      // Apply predefined date filters (today, yesterday, etc.)
      const today = new Date();
      const todayStr = formatDate(today);
      
      switch (dateFilterType) {
        case 'today':
          orders = orders.filter(order => order.date === todayStr);
          break;
        case 'yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = formatDate(yesterday);
          orders = orders.filter(order => order.date === yesterdayStr);
          break;
        }
        case 'thisWeek': {
          // Get start of current week (Sunday)
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(today);
          
          orders = orders.filter(order => {
            const orderDate = parseDateFromFormat(order.date);
            return orderDate >= startOfWeek && orderDate <= today;
          });
          break;
        }
        case 'lastWeek': {
          // Last week: from last Sunday to last Saturday
          const endOfLastWeek = new Date(today);
          endOfLastWeek.setDate(today.getDate() - today.getDay() - 1);
          const startOfLastWeek = new Date(endOfLastWeek);
          startOfLastWeek.setDate(endOfLastWeek.getDate() - 6);
          
          orders = orders.filter(order => {
            const orderDate = parseDateFromFormat(order.date);
            return orderDate >= startOfLastWeek && orderDate <= endOfLastWeek;
          });
          break;
        }
        case 'thisMonth': {
          // This month: from 1st of current month to today
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          
          orders = orders.filter(order => {
            const orderDate = parseDateFromFormat(order.date);
            return orderDate >= startOfMonth && orderDate <= today;
          });
          break;
        }
        case 'lastMonth': {
          // Last month: from 1st to last day of previous month
          const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          
          orders = orders.filter(order => {
            const orderDate = parseDateFromFormat(order.date);
            return orderDate >= startOfLastMonth && orderDate <= endOfLastMonth;
          });
          break;
        }
      }
    }

    // Apply order type filter (existing logic)
    if (selectedOrderType !== "All") {
      orders = orders.filter(
        (order) =>
          order.order_type?.toLowerCase() === selectedOrderType.toLowerCase()
      );
    }

    // Apply search filter (existing logic)
    if (searchQuery) {
      orders = orders.filter((order) =>
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter (existing logic)
    if (selected !== "All") {
      orders = orders.filter((order) => {
        const status = order.order_status?.toLowerCase() || "";
        switch (selected) {
          case "Placed":
            return status === "placed";
          case "Cooking":
            return status === "cooking";
          case "Served":
            return status === "served";
          case "Paid":
            return status === "paid";
          case "Cancelled":
            return ["cancle", "cancel", "cancelled"].includes(status);
          default:
            return false;
        }
      });
    }

    return orders;
  };

  const renderFilterChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
    >
      {filterOptions.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.filterChip,
            selectedFilter === option.value && styles.filterChipSelected,
          ]}
          onPress={() => setSelectedFilter(option.value)}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedFilter === option.value && styles.filterChipTextSelected,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Add custom back handler
  const handleBackNavigation = () => {
    navigation.goBack();
    return true; // Prevents default back behavior
  };
  // Add useEffect to handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackNavigation
    );

    // Cleanup the event listener
    return () => backHandler.remove();
  }, []);

  // Update the order type modal
  const renderOrderTypeModal = () => (
    <Modal
      visible={isOrderTypeModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setIsOrderTypeModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsOrderTypeModalVisible(false)}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <Text style={styles.modalTitle}>Select Order Type</Text>
          <TouchableOpacity
            style={[
              styles.modalItem,
              selectedOrderType === "All" && styles.modalItemSelected,
            ]}
            onPress={() => {
              setSelectedOrderType("All");
              setIsOrderTypeModalVisible(false);
              fetchOrders();
            }}
          >
            <Text style={styles.modalItemText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modalItem,
              selectedOrderType === "Dine-in" && styles.modalItemSelected,
            ]}
            onPress={() => {
              setSelectedOrderType("Dine-in");
              setIsOrderTypeModalVisible(false);
              fetchOrders();
            }}
          >
            <Text style={styles.modalItemText}>Dine-in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modalItem,
              selectedOrderType === "Parcel" && styles.modalItemSelected,
            ]}
            onPress={() => {
              setSelectedOrderType("Parcel");
              setIsOrderTypeModalVisible(false);
              fetchOrders();
            }}
          >
            <Text style={styles.modalItemText}>Parcel</Text>
          </TouchableOpacity>
          {/* Add Delivery option to modal */}
          <TouchableOpacity
            style={[
              styles.modalItem,
              selectedOrderType === "Delivery" && styles.modalItemSelected,
            ]}
            onPress={() => {
              setSelectedOrderType("Delivery");
              setIsOrderTypeModalVisible(false);
              fetchOrders();
            }}
          >
            <Text style={styles.modalItemText}>Delivery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modalItem,
              selectedOrderType === "Drive-through" && styles.modalItemSelected,
            ]}
            onPress={() => {
              setSelectedOrderType("Drive-through");
              setIsOrderTypeModalVisible(false);
              fetchOrders();
            }}
          >
            <Text style={styles.modalItemText}>Drive-through</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modalItem,
              selectedOrderType === "Counter" && styles.modalItemSelected,
            ]}
            onPress={() => {
              setSelectedOrderType("Counter");
              setIsOrderTypeModalVisible(false);
              fetchOrders();
            }}
          >
            <Text style={styles.modalItemText}>Counter</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <>
      <CustomHeader title="My Orders" onBackPress={handleBackNavigation} />
      <View style={styles.toolbarContainer}>
        <MainToolBar />
      </View>
      <View style={styles.container}>
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Icon
              name="search"
              size={20}
              color="#666"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
        <View style={styles.searchSection}>
          <TouchableOpacity
            style={styles.statusDropdown}
            onPress={() => setIsStatusModalVisible(true)}
          >
            <Text style={styles.statusDropdownText}>{selected}</Text>
            <Icon name="arrow-drop-down" size={24} color="#000" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.statusDropdown}
            onPress={() => setIsOrderTypeModalVisible(true)}
          >
            <Text style={styles.statusDropdownText}>{selectedOrderType}</Text>
            <Icon name="arrow-drop-down" size={24} color="#000" />
          </TouchableOpacity>

          {/* Today filter button separately */}
          <TouchableOpacity
            style={[
              styles.dateFilterButton,
              dateFilterType === 'today' && styles.dateFilterButtonSelected
            ]}
            onPress={() => handleDateFilterTypeChange('today')}
          >
            <Text style={[
              styles.dateFilterButtonText,
              dateFilterType === 'today' && styles.dateFilterButtonTextSelected
            ]}>
              Today
            </Text>
          </TouchableOpacity>

          {/* Other date filters dropdown */}
          <TouchableOpacity
            style={styles.statusDropdown}
            onPress={() => setIsDateFilterModalVisible(true)}
          >
            <Text style={styles.statusDropdownText}>
              {dateFilterType === 'customRange' && customDateRange.startDate && customDateRange.endDate
                ? `${formatDate(customDateRange.startDate)} - ${formatDate(customDateRange.endDate)}`
                : dateFilterType !== 'today' 
                  ? dateFilterOptions.find(option => option.value === dateFilterType)?.label || "Filter" 
                  : "Date Filter"}
            </Text>
            <Icon name="arrow-drop-down" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Update the date filter modal */}
        <Modal
          visible={isDateFilterModalVisible}
          transparent={true}
          animationType="none"
          onRequestClose={() => setIsDateFilterModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsDateFilterModalVisible(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <Text style={styles.datePickerTitle}>Select Date Range</Text>
              
              {/* Date filter options */}
              <View style={styles.datePickerOptions}>
                {/* Yesterday */}
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    dateFilterType === 'yesterday' && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    handleDateFilterTypeChange('yesterday');
                    setIsDateFilterModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>Yesterday</Text>
                </TouchableOpacity>
                
                {/* This Week */}
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    dateFilterType === 'thisWeek' && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    handleDateFilterTypeChange('thisWeek');
                    setIsDateFilterModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>This Week</Text>
                </TouchableOpacity>
                
                {/* Last Week */}
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    dateFilterType === 'lastWeek' && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    handleDateFilterTypeChange('lastWeek');
                    setIsDateFilterModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>Last Week</Text>
                </TouchableOpacity>
                
                {/* This Month */}
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    dateFilterType === 'thisMonth' && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    handleDateFilterTypeChange('thisMonth');
                    setIsDateFilterModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>This Month</Text>
                </TouchableOpacity>
                
                {/* Last Month */}
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    dateFilterType === 'lastMonth' && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    handleDateFilterTypeChange('lastMonth');
                    setIsDateFilterModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>Last Month</Text>
                </TouchableOpacity>
              </View>
              
              {/* Custom date range section */}
              <View style={styles.customRangeContainer}>
                <Text style={styles.datePickerTitle}>Custom Date Range</Text>
                
                {/* Start date field */}
                <TouchableOpacity
                  style={styles.datePickerField}
                  onPress={() => {
                    setShowStartDatePicker(true);
                  }}
                >
                  <Text style={styles.datePickerLabel}>Start Date:</Text>
                  <Text style={styles.datePickerValue}>
                    {customDateRange.startDate ? formatDate(customDateRange.startDate) : "Select Date"}
                  </Text>
                </TouchableOpacity>
                
                {/* End date field */}
                <TouchableOpacity
                  style={styles.datePickerField}
                  onPress={() => {
                    setShowEndDatePicker(true);
                  }}
                >
                  <Text style={styles.datePickerLabel}>End Date:</Text>
                  <Text style={styles.datePickerValue}>
                    {customDateRange.endDate ? formatDate(customDateRange.endDate) : "Select Date"}
                  </Text>
                </TouchableOpacity>
                
                {/* Apply button */}
                <TouchableOpacity
                  style={[
                    styles.applyDateRangeButton,
                    (!customDateRange.startDate || !customDateRange.endDate) && styles.applyDateRangeButtonDisabled
                  ]}
                  disabled={!customDateRange.startDate || !customDateRange.endDate}
                  onPress={() => {
                    handleDateRangeSelect(customDateRange.startDate, customDateRange.endDate);
                    setIsDateFilterModalVisible(false);
                  }}
                >
                  <Text style={styles.applyDateRangeText}>Apply Date Range</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Update the date picker implementation */}
        {showStartDatePicker && (
          <DateTimePicker
            value={customDateRange.startDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                // If end date exists but is before the new start date, reset it
                if (customDateRange.endDate && selectedDate > customDateRange.endDate) {
                  setCustomDateRange({
                    startDate: selectedDate,
                    endDate: null
                  });
                } else {
                  setCustomDateRange(prev => ({...prev, startDate: selectedDate}));
                }
                
                // Do NOT set dateFilterType here, wait for Apply button
                // Do NOT close the modal
              }
            }}
            maximumDate={new Date()} // No future dates
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={customDateRange.endDate || customDateRange.startDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) {
                setCustomDateRange(prev => ({...prev, endDate: selectedDate}));
                
                // Do NOT set dateFilterType here, wait for Apply button
                // Do NOT close the modal
              }
            }}
            minimumDate={customDateRange.startDate || undefined} // No dates before start date
            maximumDate={new Date()} // No future dates
          />
        )}

        <Modal
          visible={isStatusModalVisible}
          transparent={true}
          animationType="none"
          onRequestClose={() => setIsStatusModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsStatusModalVisible(false)}
          >
            <View style={styles.modalContent}>
              {["All", "Placed", "Cooking", "Served", "Paid", "Cancelled"].map(
                (status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.modalItem,
                      selected === status && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      handleToggle(status);
                      setIsStatusModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        selected === status && styles.modalItemTextSelected,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </TouchableOpacity>
        </Modal>
        {renderOrderTypeModal()}

        {/* Show selected date range if any */}
        {dateRange.startDate && dateRange.endDate && (
          <Text style={styles.dateRangeText}>
            Showing orders from {dateRange.startDate} to {dateRange.endDate}
          </Text>
        )}

        {!loading ? (
          <View style={styles.orderListContainer}>
            {getFilteredOrders().length > 0 ? (
              <ScrollView
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={["#4b89dc"]}
                    tintColor="#4b89dc"
                  />
                }
              >
                {Object.entries(
                  getFilteredOrders().reduce((acc, order) => {
                    const orderDate = order.date || "";
                    if (!acc[orderDate]) acc[orderDate] = [];
                    acc[orderDate].push(order);
                    return acc;
                  }, {})
                ).map(([dateKey, orders]) => {
                  const orderCounts = getOrderCounts(orders);
                  
                  return (
                    <View key={dateKey} style={styles.dateSection}>
                      <View style={styles.dateSectionHeader}>
                        <View style={styles.dateHeaderLeft}>
                          <Text style={styles.dateSectionTitle}>{dateKey}</Text>
                          <View style={styles.orderCountsContainer}>
                            <Text style={styles.totalOrdersText}>
                              Total: {orderCounts.total}
                            </Text>
                            
                            {/* Status badges */}
                            {orderCounts.placed > 0 && (
                              <View style={[styles.statusBadge, { backgroundColor: 'rgba(75, 137, 220, 0.1)' }]}>
                                <RemixIcon name="checkbox-blank-circle-line" size={12} color={ORDER_STATUS_COLORS.PLACED} />
                                <Text style={[styles.statusBadgeText, { color: ORDER_STATUS_COLORS.PLACED }]}>
                                  Placed: {orderCounts.placed}
                                </Text>
                              </View>
                            )}
                            {orderCounts.cooking > 0 && (
                              <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
                                <RemixIcon name="fire-line" size={12} color={ORDER_STATUS_COLORS.COOKING} />
                                <Text style={[styles.statusBadgeText, { color: ORDER_STATUS_COLORS.COOKING }]}>
                                  Cooking: {orderCounts.cooking}
                                </Text>
                              </View>
                            )}
                            {orderCounts.served > 0 && (
                              <View style={[styles.statusBadge, { backgroundColor: 'rgba(12, 139, 81, 0.1)' }]}>
                                <RemixIcon name="restaurant-2-line" size={12} color={ORDER_STATUS_COLORS.SERVED} />
                                <Text style={[styles.statusBadgeText, { color: ORDER_STATUS_COLORS.SERVED }]}>
                                  Served: {orderCounts.served}
                                </Text>
                              </View>
                            )}
                            {orderCounts.paid > 0 && (
                              <View style={[styles.statusBadge, { backgroundColor: 'rgba(103, 58, 183, 0.1)' }]}>
                                <RemixIcon name="checkbox-circle-line" size={12} color={ORDER_STATUS_COLORS.PAID} />
                                <Text style={[styles.statusBadgeText, { color: ORDER_STATUS_COLORS.PAID }]}>
                                  Paid: {orderCounts.paid}
                                </Text>
                              </View>
                            )}
                            {orderCounts.cancelled > 0 && (
                              <View style={[styles.statusBadge, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
                                <RemixIcon name="close-circle-line" size={12} color={ORDER_STATUS_COLORS.CANCELLED} />
                                <Text style={[styles.statusBadgeText, { color: ORDER_STATUS_COLORS.CANCELLED }]}>
                                  Cancelled: {orderCounts.cancelled}
                                </Text>
                              </View>
                            )}
                            
                            {/* Order type badges */}
                            {orderCounts.dineIn > 0 && (
                              <View style={[styles.typeBadge]}>
                                <RemixIcon name="restaurant-fill" size={10} color="#555" />
                                <Text style={styles.typeBadgeText}>
                                  Dine-in: {orderCounts.dineIn}
                                </Text>
                              </View>
                            )}
                            {orderCounts.parcel > 0 && (
                              <View style={[styles.typeBadge]}>
                                <RemixIcon name="hand-heart-fill" size={10} color="#555" />
                                <Text style={styles.typeBadgeText}>
                                  Parcel: {orderCounts.parcel}
                                </Text>
                              </View>
                            )}
                            {orderCounts.driveThrough > 0 && (
                              <View style={[styles.typeBadge]}>
                                <RemixIcon name="car-fill" size={10} color="#555" />
                                <Text style={styles.typeBadgeText}>
                                  Drive: {orderCounts.driveThrough}
                                </Text>
                              </View>
                            )}
                            {orderCounts.counter > 0 && (
                              <View style={[styles.typeBadge]}>
                                <RemixIcon name="store-2-fill" size={10} color="#555" />
                                <Text style={styles.typeBadgeText}>
                                  Counter: {orderCounts.counter}
                                </Text>
                              </View>
                            )}
                            {orderCounts.delivery > 0 && (
                              <View style={[styles.typeBadge]}>
                                <RemixIcon name="motorbike-fill" size={10} color="#555" />
                                <Text style={styles.typeBadgeText}>
                                  Delivery: {orderCounts.delivery}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.ordersList}>
                        {orders.map((order) => (
                          <View
                            key={order.order_number}
                            style={[
                              styles.orderCard,
                              dateKey === formatDate(date) && styles.selectedDateOrderCard,
                            ]}
                          >
                            {renderOrderItem({ item: order })}
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <ScrollView
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={["#4b89dc"]}
                    tintColor="#4b89dc"
                  />
                }
                contentContainerStyle={styles.noOrdersContainer}
              >
                <RemixIcon
                  name={
                    selected === "Placed"
                      ? "ri-file-list-3-line"
                      : "ri-file-list-line"
                  }
                  size={48}
                  color="#666"
                />
                <Text style={styles.noOrdersText}>
                  {selected === "All"
                    ? "No orders found"
                    : `No ${selected.toLowerCase()} orders`}
                </Text>
                <Text style={styles.noOrdersSubText}>
                  {selected === "Placed"
                    ? "There are no placed orders at the moment"
                    : "Try changing the filters or search terms"}
                </Text>
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4b89dc" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        )}
      </View>
      <CustomTabBar />
    </>
  );
};

// Basic styles for better UI
const styles = StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
    padding: 5,
    backgroundColor: "#f6f6f6",
    paddingBottom: 70,
  },
  toolbarContainer: {
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginLeft: 10,
    borderBottomColor: "#e0e0e0",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  searchInput: {
    height: 40,
    borderColor: "#4b89dc",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 5,
    backgroundColor: "#fff",
  },
  card: {
    marginLeft: 5,
    marginEnd: 5,
    borderColor: "#9aa2ae",
    borderWidth: 1,
    marginBottom: 10,
    borderRadius: 16,
    shadowColor: "rgba(198,175,175,0.68)",
    backgroundColor: "#fff",
  },
  row: {
    borderTopRightRadius: 13,
    borderTopLeftRadius: 13,
    margin: 0,
    padding: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  firstRow: {
    paddingBottom: 10,
    paddingTop: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  lastRow: {
    marginLeft: 10,
    marginEnd: 5,
    marginBottom: 10,
    alignContent: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  column: {
    flex: 1,
    paddingHorizontal: 8,
  },
  orderStatus: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#000",
  },
  orderTime: {
    fontSize: 12,
    color: "#000",
  },
  orderId: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    textAlign: "right",
  },
  orderIdText: {
    fontSize: 12,

    color: "#000",
    textAlign: "center",
  },
  productList: {
    marginVertical: 0,
  },
  productItem: {
    marginLeft: 10,
    marginEnd: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    width: "94%",
    paddingVertical: 4,
  },
  productNumber: {
    fontSize: 13,
    color: "#000",
  },
  productName: {
    fontSize: 13,
    color: "#000",
    flex: 2,
  },
  productQuantity: {
    fontSize: 13,
    color: "#000",
    flex: 1,
    textAlign: "center",
  },
  productPrice: {
    fontSize: 13,
    color: "#000",
    flex: 1,
    textAlign: "right",
  },
  orderTotal: {
    marginEnd: 5,
    paddingVertical: 5,
    paddingHorizontal: 5,
    textAlign: "right",
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    flex: 1,
  },
  viewDetailsButton: {
    borderColor: "#4b89dc",
    borderWidth: 1,
    backgroundColor: "white",
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  viewDetailsText: {
    color: "blue",
    fontSize: 15,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleContainer: {
    flexDirection: "row",
    flex: 1,
    paddingHorizontal: 10,
  },
  toggleButton: {
    flex: 1,
  },
  selectedButton: {
    backgroundColor: "#4b89dc",
  },
  datePickerContainer: {
    marginLeft: 10,
  },
  dateButton: {
    padding: 10,
    backgroundColor: "#eee",
    borderRadius: 10,
  },
  dateText: {
    color: "#000",
  },
  buttonText: {
    fontSize: 16,
    color: "#000",
  },
  selectedButtonText: {
    color: "#fff",
  },

  selectedButtonOngoing: {
    backgroundColor: "#FF9A6C", // Background color for Ongoing button
  },
  selectedButtonCompleted: {
    backgroundColor: "#55BB77", // Background color for Completed button
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#000",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 40,
    padding: 0, // Remove default padding
  },
  selectedButtonAll: {
    backgroundColor: "#4b89dc", // Blue color for All button
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    padding: 0,
  },
  statusDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 8,
    // minWidth: 100,
  },
  statusDropdownText: {
    marginRight: 4,
    fontSize: 14,
    color: "#000",
  },
  dateButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateText: {
    fontSize: 14,
    color: "#000",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    width: "80%",
    maxWidth: 300,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalItemSelected: {
    backgroundColor: "#f0f8ff",
  },
  modalItemText: {
    fontSize: 16,
    color: "#000",
  },
  modalItemTextSelected: {
    color: "#4b89dc",
    fontWeight: "bold",
  },
  newCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 6,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderNumberContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  hashSymbol: {
    fontSize: 16,
    color: "#666",
    marginRight: 2,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  timeText: {
    fontSize: 14,
    color: "#666",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  restaurantInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  orderTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuCountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 4,
  },
  restaurantName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  orderTypeText: {
    fontSize: 14,
    color: "#666",
  },
  sectionText: {
    fontSize: 14,
    color: "#666",
  },
  menuCountText: {
    fontSize: 14,
    color: "#666",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  originalPrice: {
    fontSize: 14,
    color: "#666",
    textDecorationLine: "line-through",
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  orderListContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  collapseAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "transparent",
    // borderBottomWidth: 1,
    // borderBottomColor: '#eee',
  },
  collapseAllText: {
    fontSize: 14,
    color: "#666",
    marginRight: 4,
  },
  dateGroup: {
    marginBottom: 8,
  },
  dateHeader: {
    backgroundColor: "transparent",
    padding: 12,
    // borderBottomWidth: 1,
    // borderBottomColor: '#eee',
  },
  dateHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  orderCountContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    alignItems: 'center',
  },
  orderCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false, // Add this to fix text alignment
    textAlignVertical: 'center', // Add this for Android
  },
  orderCard: {
    marginHorizontal: 8,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#666",
  },
  orderTypeIcon: {
    marginRight: 6,
  },
  orderType: {
    fontSize: 14,
    fontWeight: "500",
  },
  noOrdersContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  noOrdersText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    textAlign: "center",
  },
  noOrdersSubText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  statusButtonsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  selectedStatusButton: {
    backgroundColor: "#4b89dc",
  },
  statusButtonText: {
    color: "#666",
    fontWeight: "500",
  },
  selectedStatusButtonText: {
    color: "#fff",
  },
  dateButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateIcon: {
    marginLeft: 8,
  },
  todayButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  statusBadgeContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },

  priceDetailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },

  priceColumn: {
    flex: 1,
  },

  centerAlign: {
    alignItems: "center",
  },

  rightAlign: {
    alignItems: "flex-end",
  },

  priceValue: {
    fontSize: 16,
    color: "#333",
  },

  discountValue: {
    fontSize: 16,
    color: "#22C55E", // green.600 equivalent
  },

  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563EB", // primary.600 equivalent
  },

  priceLabel: {
    fontSize: 12,
    color: "#6B7280", // gray.500 equivalent
    marginTop: 2,
  },

  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  dateTimeText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  detailsContainer: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  orderTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  itemsCountBadge: {
    backgroundColor: "#E5F0FF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemsCountText: {
    fontSize: 12,
    color: "#6B7280",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterChipSelected: {
    backgroundColor: "#219ebc",
    borderColor: "#219ebc",
  },
  filterChipText: {
    color: "#666",
    fontSize: 14,
  },
  filterChipTextSelected: {
    color: "#fff",
    fontWeight: "500",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  timerText: {
    color: "#FF6B6B",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  commentContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F5F5F5",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  commentText: {
    marginLeft: 8,
    color: "#666",
    fontSize: 14,
    flex: 1,
  },
  customRangeContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  customDateButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  customDateText: {
    fontSize: 14,
    color: '#333',
  },
  applyDateRangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#4b89dc',
    borderRadius: 4,
    alignItems: 'center',
  },
  applyDateRangeText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  dateFilterText: {
    fontSize: 14,
    color: '#333',
  },
  dateFilterButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateFilterButtonSelected: {
    backgroundColor: '#4b89dc',
  },
  dateFilterButtonText: {
    fontSize: 13,
    color: '#666',
  },
  dateFilterButtonTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  datePickerOptions: {
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
    paddingTop: 5,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  datePickerField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#666',
  },
  datePickerValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  applyDateRangeButtonDisabled: {
    backgroundColor: '#c2c2c2',
    opacity: 0.7,
  },
  dateRangeText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 8,
  },
  orderCountsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    alignItems: 'center',
  },
  totalOrdersText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
   
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  dateSection: {
    marginBottom: 4,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  dateSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    color: '#555',
  },
  paymentMethodContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  paymentMethodText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
  },
  isPaidContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  isPaidText: {
    fontSize: 12,
    fontWeight: "500",
  },
});

export default OrderList;
