import React, { useState, useEffect } from "react";
import { TouchableWithoutFeedback, Keyboard, BackHandler } from "react-native";
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  IconButton,
  useToast,
  ScrollView,
  Heading,
  FormControl,
  Badge,
  Divider,
  Spinner,
  Select,
  Pressable,
  Image,
  Modal,
  KeyboardAvoidingView,
  Center,
} from "native-base";

import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../components/Header";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { sendNotificationToWaiter } from "../../../services/NotificationService";

const API_BASE_URL = "https://men4u.xyz/captain_api";

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

const formatTime = (dateTimeStr) => {
  if (!dateTimeStr) return "";

  try {
    // Split the datetime string to get date, time and meridiem
    const parts = dateTimeStr.split(" ");
    if (parts.length < 3) return dateTimeStr;

    // Get date, time part and meridiem
    const date = parts[0]; // "18-Dec-2024"
    const time = parts[1]; // "03:51:28"
    const meridiem = parts[2]; // "PM"

    // Split time to get hours and minutes
    const timeParts = time.split(":");
    if (timeParts.length < 2) return dateTimeStr;

    // Return formatted date and time
    return `${date} ${timeParts[0]}:${timeParts[1]} ${meridiem}`;
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateTimeStr; // Return original string if formatting fails
  }
};

export default function CreateOrderScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams();
  const isFocused = useIsFocused();

  // Keep all existing states
  const [loading, setLoading] = useState(false);
  const [outletId, setOutletId] = useState(null);
  const [orderType, setOrderType] = useState("Dine In");
  const [orderItems, setOrderItems] = useState([
    {
      id: 1,
      menuItem: "",
      quantity: 1,
      specialInstructions: "",
      portionSize: "Full",
    },
  ]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [serviceCharges, setServiceCharges] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [orderDetails, setOrderDetails] = useState({
    order_number: "",
    table_number: "",
    total_bill: 0,
    datetime: "",
    order_type: "",
  });
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [isOccupied, setIsOccupied] = useState("0");
  const [orderId, setOrderId] = useState(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Add these new states for better state management
  const [currentTableNumber, setCurrentTableNumber] = useState(
    params.tableNumber || ""
  );
  const [currentSectionId, setCurrentSectionId] = useState(
    params.sectionId || ""
  );
  const [currentSectionName, setCurrentSectionName] = useState(
    params.sectionName || ""
  );
  const [currentIsOccupied, setCurrentIsOccupied] = useState(
    params.isOccupied || "0"
  );
  const [currentOrderId, setCurrentOrderId] = useState(params.orderId || null);

  // Add this at the top of your component
  const [userData, setUserData] = useState(null);

  // Update the useEffect for session handling
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const sessionData = await AsyncStorage.getItem("userSession");
        if (sessionData) {
          const parsedData = JSON.parse(sessionData);
          console.log("Loaded user session:", parsedData);

          if (!parsedData.user_id || !parsedData.outlet_id) {
            console.error("Invalid session data:", parsedData);
            toast.show({
              description: "Session data incomplete",
              status: "error",
            });
            return;
          }

          setUserData(parsedData);
        } else {
          console.error("No session data found");
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        toast.show({
          description: "Error loading user data",
          status: "error",
        });
      }
    };

    loadUserData();
  }, []);

  // Update the initialization useEffect
  useEffect(() => {
    const initializeOrder = async () => {
      try {
        console.log("Initializing order with params:", params);

        // Reset states
        setSelectedItems([]);
        setGrandTotal(0);
        setServiceCharges(0);
        setGstAmount(0);
        setDiscountAmount(0);

        // Set both current and existing state variables
        setTableNumber(params.tableNumber);
        setSectionId(params.sectionId);
        setSectionName(params.sectionName);
        setIsOccupied(params.isOccupied);
        setOrderId(params.orderId);

        setCurrentTableNumber(params.tableNumber);
        setCurrentSectionId(params.sectionId);
        setCurrentSectionName(params.sectionName);
        setCurrentIsOccupied(params.isOccupied);
        setCurrentOrderId(params.orderId);

        // Handle occupied table data
        if (params.isOccupied === "1" && params.orderDetails) {
          try {
            const orderData = JSON.parse(params.orderDetails);
            console.log("Parsed order data:", orderData);

            if (orderData.menu_items && Array.isArray(orderData.menu_items)) {
              const transformedItems = orderData.menu_items.map((item) => ({
                menu_id: item.menu_id.toString(),
                menu_name: item.name,
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity),
                total_price: parseFloat(item.total_price),
                specialInstructions: "",
                portionSize: "Full",
              }));

              setSelectedItems(transformedItems);
              setGrandTotal(parseFloat(orderData.grand_total) || 0);

              // Update order details
              setOrderDetails({
                order_number: params.orderNumber || "",
                table_number: params.tableNumber || "",
                total_bill: parseFloat(orderData.grand_total) || 0,
                datetime: new Date().toLocaleString(),
                order_type: "dine-in",
              });
            }
          } catch (parseError) {
            console.error("Error parsing order details:", parseError);
            console.log("Raw order details:", params.orderDetails);
          }
        }
      } catch (error) {
        console.error("Error initializing order:", error);
        toast.show({
          description: "Error initializing order",
          status: "error",
        });
      }
    };

    if (isFocused) {
      initializeOrder();
    }
  }, [isFocused, params.tableNumber, params.sectionId]);

  useEffect(() => {
    const getStoredData = async () => {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      setOutletId(storedOutletId);
    };
    getStoredData();
  }, []);

  useEffect(() => {
    if (outletId) {
      fetchMenuItems();
    }
  }, [outletId]);

  const fetchMenuItems = async () => {
    if (!outletId) return;

    setLoading(true);
    try {
      const response = await fetch(
        "https://men4u.xyz/captain_api/get_all_menu_list_by_category",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outlet_id: outletId.toString(),
          }),
        }
      );

      const data = await response.json();
      if (data.st === 1) {
        setMenuCategories(data.data.category);
        setMenuItems(data.data.menus);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.show({
        description: "Failed to load menu items",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderStatus) => {
    if (selectedItems.length === 0) {
      toast.show({
        description: "Please add items to the order",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    try {
      setLoading(true);

      // Get user_id and outlet_id from AsyncStorage
      const storedUserId = await AsyncStorage.getItem("user_id");
      const storedOutletId = await AsyncStorage.getItem("outlet_id");

      // Use stored values or params values
      const user_id = storedUserId || params?.userId;
      const outlet_id = storedOutletId || params?.outletId;

      console.log("Order creation data:", {
        user_id,
        outlet_id,
        storedUserId,
        storedOutletId,
        params,
        selectedItems,
      });

      if (!user_id || !outlet_id) {
        console.error("Missing critical data:", {
          user_id,
          outlet_id,
          storedUserId,
          storedOutletId,
          params,
        });
        throw new Error("Missing user or outlet information");
      }

      const orderItems = selectedItems.map((item) => ({
        menu_id: item.menu_id.toString(),
        quantity: parseInt(item.quantity) || 1,
        comment: item.specialInstructions || "",
        half_or_full: (item.portionSize || "full").toLowerCase(),
        price: parseFloat(item.price) || 0,
        total_price: parseFloat(item.total_price) || 0,
      }));

      const orderData = {
        user_id: user_id.toString(),
        outlet_id: outlet_id.toString(),
        order_type: params?.isSpecialOrder ? params.orderType : "dine-in",
        order_items: orderItems,
        grand_total: orderItems.reduce(
          (sum, item) => sum + (item.total_price || 0),
          0
        ),
      };

      // Add table and section details only for dine-in orders
      if (!params?.isSpecialOrder) {
        if (!params.tableNumber || !params.sectionId) {
          throw new Error(
            "Missing table or section information for dine-in order"
          );
        }
        orderData.tables = [params.tableNumber.toString()];
        orderData.section_id = params.sectionId.toString();
      }

      // Determine if this is an update (occupied table) or new order
      const isUpdate =
        !params?.isSpecialOrder &&
        params?.orderId &&
        params?.isOccupied === "1";

      const endpoint = isUpdate
        ? `${API_BASE_URL}/update_order`
        : `${API_BASE_URL}/create_order`;

      console.log(
        `${isUpdate ? "Updating" : "Creating"} order with data:`,
        orderData
      );

      if (isUpdate) {
        orderData.order_id = params.orderId.toString();
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();
      console.log(`${isUpdate ? "Update" : "Create"} Order Response:`, result);

      if (result.st === 1) {
        if (isUpdate) {
          await refreshOrderDetails();
        }

        toast.show({
          description: isUpdate
            ? "Order updated successfully"
            : `Order ${result.order_id || ""} created successfully`,
          status: "success",
          duration: 2000,
        });

        router.replace(
          params?.isSpecialOrder ? "/(tabs)/orders" : "/(tabs)/tables/sections"
        );
      } else {
        throw new Error(
          result.msg || `Failed to ${isUpdate ? "update" : "create"} order`
        );
      }
    } catch (error) {
      console.error(`${orderStatus.toUpperCase()} Error:`, error);
      toast.show({
        description: error.message || "Failed to process order",
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHold = () => createOrder("hold");
  const handleKOT = () => createOrder("kot");

  const handleSettle = async () => {
    if (selectedItems.length === 0) {
      toast.show({
        description: "Please add items to the order",
        status: "warning",
      });
      return;
    }

    try {
      setIsProcessing(true);
      setLoadingMessage("Processing order...");

      const storedUserId = await AsyncStorage.getItem("user_id");
      const storedOutletId = await AsyncStorage.getItem("outlet_id");

      if (!storedOutletId || !storedUserId) {
        throw new Error("Required data not found");
      }

      let currentOrderId = orderId;

      // For new orders
      if (!orderId) {
        setLoadingMessage("Creating new order...");
        const createPayload = {
          user_id: storedUserId.toString(),
          outlet_id: storedOutletId.toString(),
          tables: [tableNumber.toString()],
          section_id: sectionId.toString(),
          order_type: "dine-in",
          order_items: selectedItems.map((item) => ({
            menu_id: item.menu_id.toString(),
            quantity: item.quantity,
            comment: item.specialInstructions || "",
            half_or_full: (item.portionSize || "full").toLowerCase(),
          })),
        };

        const createResponse = await fetch(`${API_BASE_URL}/create_order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
        });

        const createData = await createResponse.json();

        if (createData.st !== 1) {
          throw new Error(createData.msg || "Failed to create order");
        }

        // Show message about waiting period
        toast.show({
          description:
            "New order created. Please wait 90 seconds for kitchen processing before settling.",
          status: "info",
          duration: 5000,
        });

        // Clear states before navigation
        setSelectedItems([]);
        setSearchQuery("");
        setOrderDetails({});
        setServiceCharges(0);
        setGstAmount(0);
        setDiscountAmount(0);

        // Navigate back to tables/sections
        router.replace("/(tabs)/tables/sections");

        setIsProcessing(false);
        setLoadingMessage("");
        return;
      }

      // For existing orders, continue with update and settlement
      else {
        setLoadingMessage("Updating order...");
        const updatePayload = {
          order_id: orderId.toString(),
          user_id: storedUserId.toString(),
          outlet_id: storedOutletId.toString(),
          tables: [tableNumber.toString()],
          section_id: sectionId.toString(),
          order_type: "dine-in",
          order_items: selectedItems.map((item) => ({
            menu_id: item.menu_id.toString(),
            quantity: item.quantity,
            comment: item.specialInstructions || "",
            half_or_full: (item.portionSize || "full").toLowerCase(),
          })),
        };

        const updateResponse = await fetch(`${API_BASE_URL}/update_order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        const updateData = await updateResponse.json();

        if (updateData.st !== 1) {
          throw new Error(updateData.msg || "Failed to update order");
        }

        // Continue with served status
        setLoadingMessage("Setting order status to served...");
        const servedPayload = {
          outlet_id: storedOutletId.toString(),
          order_id: currentOrderId.toString(),
          order_status: "served",
        };

        const servedResponse = await fetch(
          `${API_BASE_URL}/captain_manage/update_order_status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(servedPayload),
          }
        );

        const servedData = await servedResponse.json();
        if (servedData.st !== 1) {
          throw new Error(servedData.msg || "Failed to mark order as served");
        }

        // Finally mark as paid
        setLoadingMessage("Completing payment...");
        const paidPayload = {
          outlet_id: storedOutletId.toString(),
          order_id: currentOrderId.toString(),
          order_status: "paid",
        };

        const paidResponse = await fetch(
          `${API_BASE_URL}/captain_manage/update_order_status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paidPayload),
          }
        );

        const paidData = await paidResponse.json();
        if (paidData.st !== 1) {
          throw new Error(paidData.msg || "Failed to mark order as paid");
        }

        // Clear states and navigate
        setSelectedItems([]);
        setSearchQuery("");
        setOrderDetails({});
        setServiceCharges(0);
        setGstAmount(0);
        setDiscountAmount(0);

        toast.show({
          description: "Order settled successfully",
          status: "success",
          duration: 2000,
        });

        router.replace({
          pathname: "/(tabs)/orders",
          params: {
            refresh: Date.now().toString(),
            status: "paid",
            fromSettle: true,
          },
        });
      }
    } catch (error) {
      console.error("Settle Error:", error);
      toast.show({
        description: error.message || "Failed to settle order",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        // Don't close search results when keyboard hides
        // setIsSearchOpen(false); - Remove or comment this
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length >= 2) {
      const filtered = menuItems.filter((item) =>
        item.menu_name.toLowerCase().includes(text.toLowerCase())
      );
      setSearchResults(filtered);
      setIsSearchOpen(true);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  };

  const handlePortionSelect = (item, portionValue) => {
    const newItem = {
      ...item,
      quantity: 1,
      portionSize: portionValue,
      price:
        portionValue === "half" ? Math.floor(item.price * 0.6) : item.price,
      specialInstructions: "",
    };

    setSelectedItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex(
        (prevItem) => prevItem.menu_id === item.menu_id
      );

      if (existingItemIndex !== -1) {
        // Update existing item
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = newItem;
        return updatedItems;
      } else {
        // Add new item
        return [...prevItems, newItem];
      }
    });
  };

  const OrderSummary = () => {
    return (
      <Box bg="white" p={2} rounded="lg" shadow={1} my={1}>
        <VStack space={1}>
          <HStack justifyContent="space-between" alignItems="center">
            <Heading size="sm">
              {orderDetails?.order_number
                ? `Order #${orderDetails.order_number} - Table ${tableNumber}`
                : `Table ${tableNumber}`}
            </Heading>
            <Text fontSize="xs" color="gray.500">
              {orderDetails?.datetime
                ? formatTime(orderDetails.datetime)
                : getCurrentDate()}
            </Text>
          </HStack>
          {isOccupied === "1" && (
            <HStack justifyContent="space-between" mt={1}>
              <Text fontSize="sm" color="gray.600">
                Section: {sectionName}
              </Text>
              <Badge colorScheme="red">Occupied</Badge>
            </HStack>
          )}
        </VStack>
      </Box>
    );
  };

  const calculateSubtotal = (items) => {
    return items.reduce((sum, item) => {
      const itemPrice =
        item.portionSize === "Half" ? item.price * 0.6 : item.price;
      return sum + itemPrice * item.quantity;
    }, 0);
  };

  const calculateTotal = (items) => {
    const subtotal = calculateSubtotal(items);
    // Only update these states if they've changed
    const newGst = subtotal * 0.05;
    const newService = subtotal * 0.05;

    if (Math.abs(newGst - gstAmount) > 0.01) {
      setGstAmount(newGst);
    }
    if (Math.abs(newService - serviceCharges) > 0.01) {
      setServiceCharges(newService);
    }

    return (subtotal + newGst + newService - discountAmount).toFixed(2);
  };

  const handleAssignWaiter = async (waiterId) => {
    try {
      await sendNotificationToWaiter(waiterId, {
        tableNumber: tableNumber,
        sectionName: sectionName,
        orderId: orderId,
      });

      toast.show({
        description: "Notification sent to waiter",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      toast.show({
        description: "Failed to notify waiter",
        status: "error",
        duration: 2000,
      });
    }
  };

  const SelectedItemsList = () => {
    return (
      <VStack space={2}>
        {selectedItems.map((item, index) => (
          <Box key={index} borderBottomWidth={1} borderColor="gray.200" pb={2}>
            <HStack justifyContent="space-between" alignItems="center">
              <VStack flex={1}>
                <Text fontWeight="bold">{item.menu_name}</Text>
                <Text fontSize="sm" color="gray.600">
                  ₹{item.price?.toFixed(2)} x {item.quantity} = ₹
                  {item.menu_sub_total?.toFixed(2)}
                </Text>
                {item.specialInstructions && (
                  <Text fontSize="xs" color="gray.500">
                    Note: {item.specialInstructions}
                  </Text>
                )}
              </VStack>
              <Badge
                colorScheme={item.portionSize === "Half" ? "orange" : "blue"}
              >
                {item.portionSize}
              </Badge>
            </HStack>
          </Box>
        ))}
      </VStack>
    );
  };

  // Update the useEffect for handling existing orders
  useEffect(() => {
    const loadExistingOrder = async () => {
      if (params?.isOccupied === "1" && params?.orderId) {
        try {
          const response = await fetch(
            "https://men4u.xyz/captain_api/order_menu_details",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                order_id: params.orderId,
                outlet_id: userData?.outlet_id,
              }),
            }
          );

          const orderData = await response.json();

          if (orderData.st === 1) {
            // Transform menu items to match our structure
            const existingItems = orderData.data.map((item) => ({
              menu_id: item.menu_id.toString(),
              menu_name: item.name,
              price: item.price,
              quantity: item.quantity,
              total_price: item.total_price,
              portionSize: item.half_or_full || "full",
              specialInstructions: "",
            }));

            setSelectedItems(existingItems);
          }
        } catch (error) {
          console.error("Error loading existing order:", error);
          toast.show({
            description: "Error loading existing order",
            status: "error",
          });
        }
      }
    };

    if (userData?.outlet_id) {
      loadExistingOrder();
    }
  }, [params, userData]);

  // Add this function to refresh order details
  const refreshOrderDetails = async () => {
    if (!params?.orderId || !userData?.outlet_id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/order_menu_details`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: params.orderId.toString(),
          outlet_id: userData.outlet_id.toString(),
        }),
      });

      const result = await response.json();
      if (result.st === 1 && Array.isArray(result.data)) {
        setSelectedItems(
          result.data.map((item) => ({
            menu_id: item.menu_id.toString(),
            name: item.name,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity),
            total_price: parseFloat(item.total_price),
            half_or_full: item.half_or_full || "full",
            specialInstructions: item.comment || "",
          }))
        );
      }
    } catch (error) {
      console.error("Error refreshing order details:", error);
    }
  };

  // Update only the order details loading part in your existing useEffect
  useEffect(() => {
    if (params?.orderDetails) {
      try {
        console.log("Loading order details:", params.orderDetails);
        const orderData = JSON.parse(params.orderDetails);
        if (orderData.menu_items) {
          const transformedItems = orderData.menu_items.map((item) => ({
            menu_id: item.menu_id.toString(),
            name: item.name,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity),
            total_price: parseFloat(item.total_price),
            portionSize: item.half_or_full || "full",
            specialInstructions: item.comment || "",
          }));
          setSelectedItems(transformedItems);
        }
      } catch (error) {
        console.error("Error parsing order details:", error);
      }
    }
  }, []); // Empty dependency array to run only once

  return (
    <Box flex={1} bg="white" safeArea>
      <Header
        title={isOccupied === "1" ? "Update Order" : "Create Order"}
        onBackPress={() => router.replace("/(tabs)/tables/sections")}
        rightComponent={
          <Badge colorScheme="blue" rounded="lg" px={3} py={1}>
            <HStack space={2} alignItems="center">
              <Text fontSize="md" fontWeight="600" color="blue.800">
                {params?.isSpecialOrder
                  ? params.orderType === "parcel"
                    ? "Parcel"
                    : params.orderType === "drive-through"
                    ? "Drive Through"
                    : "Counter"
                  : `T${tableNumber}`}
              </Text>
              {!params?.isSpecialOrder && (
                <HStack space={1} alignItems="center">
                  <Text fontSize="md" fontWeight="600" color="blue.800">
                    •
                  </Text>
                  <Text fontSize="md" fontWeight="600" color="blue.800">
                    {sectionName}
                  </Text>
                </HStack>
              )}
            </HStack>
          </Badge>
        }
      />

      <Box flex={1} bg="coolGray.100" px={4}>
        {isOccupied === "1" && orderNumber && <OrderSummary />}

        <Box>
          <Input
            placeholder="Search menu items..."
            value={searchQuery}
            mt={2}
            rounded="lg"
            borderWidth={1}
            borderColor="coolGray.400"
            bg="white"
            fontSize={18}
            h={12}
            py={3}
            InputLeftElement={
              <MaterialIcons
                name="search"
                size={24}
                color="gray"
                style={{ marginLeft: 10 }}
              />
            }
            InputRightElement={
              searchQuery ? (
                <IconButton
                  icon={<MaterialIcons name="close" size={24} color="gray" />}
                  size="md"
                  rounded="full"
                  mr={1}
                  onPress={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setIsSearchOpen(false);
                  }}
                />
              ) : null
            }
            onChangeText={handleSearch}
          />
        </Box>

        {/* Search Results */}
        {isSearchOpen && searchResults.length > 0 && (
          <Box
            position="absolute"
            top={16}
            left={4}
            right={4}
            bg="white"
            rounded="lg"
            shadow={3}
            zIndex={2000}
            maxH="60%"
            borderWidth={1}
            borderColor="coolGray.200"
            overflow="hidden"
          >
            <ScrollView
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="always"
            >
              {searchResults.map((item) => (
                <Box
                  key={item.menu_id}
                  borderBottomWidth={1}
                  borderBottomColor="coolGray.200"
                  bg="white"
                  p={2}
                >
                  <HStack alignItems="center" space={2}>
                    {/* Category Indicator */}
                    <Box
                      w={1}
                      h="80px"
                      bg={
                        item.menu_food_type === "veg"
                          ? "green.500"
                          : item.menu_food_type === "nonveg"
                          ? "red.500"
                          : "gray.300"
                      }
                    />

                    {/* Image */}
                    <Box w="80px" h="80px">
                      {item.image ? (
                        <Image
                          source={{ uri: item.image }}
                          alt={item.menu_name}
                          w="full"
                          h="full"
                          resizeMode="cover"
                          rounded="md"
                        />
                      ) : (
                        <Center bg="gray.100" w="full" h="full" rounded="md">
                          <MaterialIcons
                            name="restaurant"
                            size={24}
                            color="gray"
                          />
                        </Center>
                      )}
                    </Box>

                    {/* Details */}
                    <VStack flex={1} space={1}>
                      <Text fontSize={16} fontWeight="600">
                        {item.menu_name}
                      </Text>
                      <HStack space={4}>
                        <Text fontSize={14}>
                          Half: ₹{Math.floor(item.price * 0.6)}
                        </Text>
                        <Text fontSize={14}>Full: ₹{item.price}</Text>
                      </HStack>
                    </VStack>

                    {/* Portion Selector */}
                    <Box>
                      <Select
                        w={24}
                        accessibilityLabel="Choose portion"
                        placeholder="Select"
                        onValueChange={(value) => {
                          const newItem = {
                            ...item,
                            quantity: 1,
                            portionSize: value,
                            price:
                              value === "half"
                                ? Math.floor(item.price * 0.6)
                                : item.price,
                            specialInstructions: "",
                          };

                          setSelectedItems((prevItems) => {
                            const existingIndex = prevItems.findIndex(
                              (prevItem) => prevItem.menu_id === item.menu_id
                            );

                            if (existingIndex !== -1) {
                              const updatedItems = [...prevItems];
                              updatedItems[existingIndex] = newItem;
                              return updatedItems;
                            }
                            return [...prevItems, newItem];
                          });

                          // Clear search and close search list
                          setSearchQuery("");
                          setSearchResults([]);
                          setIsSearchOpen(false);
                        }}
                      >
                        <Select.Item label="Full" value="full" />
                        <Select.Item label="Half" value="half" />
                      </Select>
                    </Box>
                  </HStack>
                </Box>
              ))}
            </ScrollView>
          </Box>
        )}

        <ScrollView
          flex={1}
          mt={2}
          showsVerticalScrollIndicator={false}
          mb={selectedItems.length > 0 ? 32 : 20}
        >
          <VStack space={2}>
            {selectedItems.length === 0 ? (
              <Box
                flex={1}
                justifyContent="center"
                alignItems="center"
                py={10}
                bg="white"
                rounded="lg"
                borderWidth={1}
                borderColor="coolGray.200"
              >
                <MaterialIcons name="restaurant" size={48} color="gray" />
                <Text color="coolGray.400" mt={2}>
                  No items added to order
                </Text>
              </Box>
            ) : (
              <>
                <Box>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Box py={1}>
                      <Text fontSize="sm" color="gray.500">
                        {selectedItems.length}{" "}
                        {selectedItems.length === 1 ? "Item" : "Items"}
                      </Text>
                    </Box>
                    <Button
                      variant="ghost"
                      _text={{ color: "gray.500" }}
                      leftIcon={
                        <MaterialIcons name="close" size={16} color="gray" />
                      }
                      onPress={() => {
                        setSelectedItems([]);
                        setSearchQuery("");
                        toast.show({
                          description: "All items cleared",
                          status: "info",
                          duration: 2000,
                        });
                      }}
                    >
                      Clear All
                    </Button>
                  </HStack>
                </Box>
                {selectedItems.map((item, index) => (
                  <>
                    <Box
                      key={index}
                      bg="white"
                      p={2}
                      mb={1}
                      rounded="lg"
                      borderWidth={1}
                      borderColor="coolGray.200"
                    >
                      <VStack space={1}>
                        <HStack
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Text
                            fontWeight={600}
                            flex={1}
                            numberOfLines={1}
                            fontSize={18}
                          >
                            {item.menu_name}
                          </Text>
                          <IconButton
                            icon={
                              <MaterialIcons
                                name="close"
                                size={16}
                                color="gray"
                              />
                            }
                            size="xs"
                            p={1}
                            onPress={() => {
                              const newItems = selectedItems.filter(
                                (_, i) => i !== index
                              );
                              setSelectedItems(newItems);
                            }}
                          />
                        </HStack>

                        <HStack
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <HStack space={1} alignItems="center">
                            <IconButton
                              borderWidth={1}
                              borderColor="gray.400"
                              icon={
                                <MaterialIcons
                                  name="remove"
                                  size={16}
                                  color="gray"
                                />
                              }
                              size="xs"
                              variant="outline"
                              _pressed={{ bg: "transparent" }}
                              onPress={() => {
                                if (item.quantity > 1) {
                                  const newItems = [...selectedItems];
                                  newItems[index].quantity--;
                                  setSelectedItems(newItems);
                                }
                              }}
                            />
                            <Text
                              w="10"
                              textAlign="center"
                              fontSize={16}
                              fontWeight="600"
                            >
                              {item.quantity}
                            </Text>
                            <IconButton
                              borderWidth={1}
                              borderColor="gray.400"
                              icon={
                                <MaterialIcons
                                  name="add"
                                  size={16}
                                  color="gray"
                                />
                              }
                              size="xs"
                              variant="outline"
                              _pressed={{ bg: "transparent" }}
                              onPress={() => {
                                if (item.quantity < 20) {
                                  const newItems = [...selectedItems];
                                  newItems[index].quantity++;
                                  setSelectedItems(newItems);
                                }
                              }}
                            />
                          </HStack>

                          <Text
                            fontSize={16}
                            fontWeight={600}
                            color="green.600"
                            textAlign="right"
                          >
                            <Text
                              fontSize={16}
                              color="gray.500"
                              ml={4}
                              fontWeight={600}
                            >
                              {item.portionSize} {" : "}
                            </Text>
                            ₹
                            {(item.portionSize === "Half"
                              ? item.price * 0.6
                              : item.price * 1
                            ).toFixed(2)}
                          </Text>
                        </HStack>
                      </VStack>
                    </Box>
                  </>
                ))}
              </>
            )}
          </VStack>
        </ScrollView>

        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          bg="transparent"
          px={4}
        >
          {selectedItems.length > 0 && (
            <Box
              bg="white"
              rounded="lg"
              mb={4}
              borderWidth={1}
              borderColor="coolGray.200"
            >
              {/* Price Summary Section */}
              <HStack
                alignItems="center"
                justifyContent="space-between"
                p={1}
                borderBottomWidth={1}
                borderBottomColor="coolGray.200"
              >
                {/* Subtotal */}
                <VStack alignItems="center">
                  <Text fontWeight="bold" fontSize="sm">
                    ₹
                    {selectedItems
                      .reduce((sum, item) => {
                        const itemPrice =
                          item.portionSize === "Half"
                            ? item.price * 0.6
                            : item.price;
                        return sum + itemPrice * item.quantity;
                      }, 0)
                      .toFixed(2)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Total
                  </Text>
                </VStack>

                {/* Service Charges */}
                <VStack alignItems="center">
                  <Text fontWeight="bold" fontSize="sm">
                    ₹{serviceCharges.toFixed(2)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Service
                  </Text>
                </VStack>

                {/* GST */}
                <VStack alignItems="center">
                  <Text fontWeight="bold" fontSize="sm">
                    ₹{gstAmount.toFixed(2)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    GST
                  </Text>
                </VStack>

                {/* Discount - Only shown if greater than 0 */}
                {discountAmount > 0 && (
                  <VStack alignItems="center">
                    <Text fontWeight="bold" fontSize="sm" color="red.500">
                      -₹{discountAmount.toFixed(2)}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Discount
                    </Text>
                  </VStack>
                )}

                {/* Divider */}
                <Box h="70%" w={0.5} bg="gray.200" />

                {/* Grand Total */}
                <VStack alignItems="center">
                  <Text fontWeight="bold" fontSize="lg" color="green.600">
                    ₹{calculateTotal(selectedItems)}
                  </Text>
                  <Text fontSize="xs" color="gray.500" fontWeight={600}>
                    Total
                  </Text>
                </VStack>
              </HStack>

              {/* Action Buttons Section */}
              <HStack space={4} justifyContent="space-between" p={3}>
                <Button
                  bg="gray.400"
                  rounded="lg"
                  onPress={handleHold}
                  isDisabled={loading}
                  _pressed={{ bg: "gray.600" }}
                >
                  Hold
                </Button>
                <Button
                  flex={1}
                  variant="outline"
                  bg="black"
                  leftIcon={
                    <MaterialIcons name="receipt" size={20} color="white" />
                  }
                  onPress={handleKOT}
                  isDisabled={loading}
                  _text={{ color: "white" }}
                >
                  KOT
                </Button>
                <Button
                  flex={1}
                  bg="blue.500"
                  leftIcon={
                    <MaterialIcons name="payment" size={20} color="white" />
                  }
                  onPress={handleSettle}
                  isDisabled={isProcessing}
                  _pressed={{ bg: "blue.600" }}
                >
                  {isProcessing ? "Processing..." : "Settle"}
                </Button>
              </HStack>
            </Box>
          )}
        </Box>
      </Box>

      {isProcessing && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0,0,0,0.3)"
          zIndex={999}
          justifyContent="center"
          alignItems="center"
        >
          <Box bg="white" p={4} rounded="lg" minW="200">
            <VStack space={3} alignItems="center">
              <Spinner size="lg" color="blue.500" />
              <Text fontWeight="medium">{loadingMessage}</Text>
            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  );
}
