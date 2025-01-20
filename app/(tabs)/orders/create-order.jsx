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
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false);

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

  // Add to your component's state
  const [serviceChargePercentage, setServiceChargePercentage] = useState(0);
  const [gstPercentage, setGstPercentage] = useState(0);

  // Update the useEffect for session handling

  // Add this function to fetch order details
  const fetchOrderDetails = async (orderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/captain_order/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_number: orderId,
        }),
      });

      const data = await response.json();
      if (data.st === 1 && data.lists) {
        return data.lists;
      }
      return null;
    } catch (error) {
      console.error("Error fetching order details:", error);
      return null;
    }
  };

  // Add this useEffect for handling order initialization
  useEffect(() => {
    const initializeOrder = async () => {
      if (!params?.orderId) return;

      try {
        setLoading(true);
        // First, fetch order details
        const response = await fetch(`${API_BASE_URL}/captain_order/view`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_number: params.orderNumber,
          }),
        });

        const data = await response.json();
        console.log("Order details response:", data);

        if (data.st === 1 && data.lists) {
          const orderDetails = data.lists;

          // Set the menu items with all necessary details
          const transformedItems = orderDetails.menu_details.map((item) => ({
            menu_id: item.menu_id.toString(),
            menu_name: item.menu_name,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity),
            portionSize: "Full",
            specialInstructions: item.comment || "",
            offer: parseFloat(item.offer) || 0,
            menu_sub_total: parseFloat(item.menu_sub_total),
          }));

          setSelectedItems(transformedItems);

          // Set tax details
          if (orderDetails.order_details) {
            setServiceChargePercentage(
              parseFloat(orderDetails.order_details.service_charges_percent)
            );
            setGstPercentage(
              parseFloat(orderDetails.order_details.gst_percent)
            );
          }
        }
      } catch (error) {
        console.error("Error initializing order:", error);
        toast.show({
          description: "Error loading order details",
          status: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    initializeOrder();
  }, [params?.orderId, params?.orderNumber]);

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
      console.log("API Response:", data); // Debug log

      if (data.st === 1 && data.data) {
        setMenuCategories(data.data.category);
        setMenuItems(data.data.menus); // Store raw data directly
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

      // For existing orders, show message and navigate to orders screen
      if (params?.orderId) {
        toast.show({
          description: "Please settle this order from the order details screen",
          status: "info",
          duration: 3000,
          placement: "top",
        });

        router.replace({
          pathname: "/(tabs)/orders",
          params: {
            refresh: Date.now().toString(),
          },
        });
        return;
      }

      // Prepare common order items structure
      const orderItems = selectedItems.map((item) => ({
        menu_id: item.menu_id.toString(),
        quantity: item.quantity,
        comment: item.specialInstructions || "",
        half_or_full: (item.portionSize || "full").toLowerCase(),
      }));

      // Handle special orders (counter, parcel, drive-through)
      if (params?.isSpecialOrder) {
        setLoadingMessage("Creating special order...");
        const createPayload = {
          user_id: storedUserId.toString(),
          outlet_id: storedOutletId.toString(),
          order_type: params.orderType.toLowerCase(),
          order_items: orderItems,
        };

        // Create the order
        const createResponse = await fetch(`${API_BASE_URL}/create_order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
        });

        const createResult = await createResponse.json();
        if (createResult.st !== 1) {
          throw new Error(createResult.msg || "Failed to create order");
        }

        // Immediately mark as paid
        setLoadingMessage("Marking order as paid...");
        const paidResponse = await fetch(
          `${API_BASE_URL}/captain_manage/update_order_status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              outlet_id: storedOutletId.toString(),
              order_id: createResult.order_id.toString(),
              order_status: "paid",
            }),
          }
        );

        const paidResult = await paidResponse.json();
        if (paidResult.st !== 1) {
          throw new Error(paidResult.msg || "Failed to mark as paid");
        }
      } else {
        // Handle regular table orders
        setLoadingMessage("Creating new order...");
        const createPayload = {
          user_id: storedUserId.toString(),
          outlet_id: storedOutletId.toString(),
          tables: [params.tableNumber.toString()],
          section_id: params.sectionId.toString(),
          order_type: "dine-in",
          order_items: orderItems,
        };

        const createResponse = await fetch(`${API_BASE_URL}/create_order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
        });

        const createResult = await createResponse.json();
        if (createResult.st !== 1) {
          throw new Error(createResult.msg || "Failed to create order");
        }

        // Mark as paid
        setLoadingMessage("Marking order as paid...");
        const paidResponse = await fetch(
          `${API_BASE_URL}/captain_manage/update_order_status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              outlet_id: storedOutletId.toString(),
              order_id: createResult.order_id.toString(),
              order_status: "paid",
            }),
          }
        );

        const paidResult = await paidResponse.json();
        if (paidResult.st !== 1) {
          throw new Error(paidResult.msg || "Failed to mark as paid");
        }
      }

      // Clear states
      setSelectedItems([]);
      setSearchQuery("");
      setOrderDetails({});
      setServiceCharges(0);
      setGstAmount(0);
      setDiscountAmount(0);

      toast.show({
        description: "Order created and settled successfully",
        status: "success",
        duration: 2000,
      });

      // Navigate back to orders page
      router.replace({
        pathname: "/(tabs)/orders",
        params: {
          refresh: Date.now().toString(),
          status: "paid",
          fromSettle: true,
        },
      });
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
        // setIsSearchOpen(false); - Remove or comment this`
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
      const price =
        item.portionSize === "Half"
          ? Number(item.half_price || item.price)
          : Number(item.full_price || item.price);
      return sum + price * Number(item.quantity);
    }, 0);
  };

  const calculateDiscount = (items) => {
    return items.reduce((sum, item) => {
      const price =
        item.portionSize === "Half"
          ? Number(item.half_price || item.price)
          : Number(item.full_price || item.price);
      const itemTotal = price * Number(item.quantity);
      return sum + (itemTotal * Number(item.offer)) / 100;
    }, 0);
  };

  const calculateTotalAfterDiscount = (selectedItems) => {
    const subtotal = calculateSubtotal(selectedItems);
    const discount = calculateDiscount(selectedItems);
    return subtotal - discount;
  };

  const calculateServiceCharges = (selectedItems, serviceChargePercentage) => {
    const totalAfterDiscount = calculateTotalAfterDiscount(selectedItems);
    return (totalAfterDiscount * serviceChargePercentage) / 100;
  };

  const calculateGST = (selectedItems, gstPercentage) => {
    const totalAfterDiscount = calculateTotalAfterDiscount(selectedItems);
    return (totalAfterDiscount * gstPercentage) / 100;
  };

  const calculateTotal = (
    selectedItems,
    serviceChargePercentage,
    gstPercentage
  ) => {
    const totalAfterDiscount = calculateTotalAfterDiscount(selectedItems);
    const serviceCharges = calculateServiceCharges(
      selectedItems,
      serviceChargePercentage
    );
    const gst = calculateGST(selectedItems, gstPercentage);
    return totalAfterDiscount + serviceCharges + gst;
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
                <HStack space={2} alignItems="center">
                  {item.half_price > 0 && (
                    <Text fontSize={14}>Half: ₹{item.half_price}</Text>
                  )}
                  <Text fontSize={14}>Full: ₹{item.full_price}</Text>
                </HStack>
                {item.specialInstructions && (
                  <Text fontSize="xs" color="gray.500">
                    Note: {item.specialInstructions}
                  </Text>
                )}
              </VStack>
              <VStack alignItems="flex-end">
                <Text fontWeight="bold">
                  ₹
                  {(item.menu_sub_total || item.price * item.quantity).toFixed(
                    2
                  )}
                </Text>
                <Badge
                  colorScheme={item.portionSize === "Half" ? "orange" : "blue"}
                >
                  {item.portionSize}
                </Badge>
              </VStack>
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
    if (!params?.orderNumber) return;

    try {
      const orderData = await fetchOrderDetails(params.orderNumber);

      if (orderData) {
        const updatedItems = orderData.menu_details.map((item) => ({
          menu_id: item.menu_id.toString(),
          menu_name: item.menu_name,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity),
          total_price: parseFloat(item.menu_sub_total),
          portionSize: item.half_or_full === "half" ? "Half" : "Full",
          offer: parseFloat(item.offer || 0),
          specialInstructions: item.comment || "",
        }));

        setSelectedItems(updatedItems);

        if (orderData.order_details) {
          setServiceChargePercentage(
            parseFloat(orderData.order_details.service_charges_percent)
          );
          setGstPercentage(parseFloat(orderData.order_details.gst_percent));
        }
      }
    } catch (error) {
      console.error("Error refreshing order details:", error);
      toast.show({
        description: "Error refreshing order details",
        status: "error",
      });
    }
  };

  // Add this to clear states when leaving the screen
  useFocusEffect(
    React.useCallback(() => {
      // Clear states when entering the screen
      setSelectedItems([]);
      setSearchQuery("");
      setSearchResults([]);
      setIsSearchOpen(false);
      setServiceChargePercentage(0);
      setGstPercentage(0);
      setIsLoadingOrder(true);

      // Load order details if exists
      const loadExistingOrder = async () => {
        if (params?.isOccupied === "1" && params?.orderNumber) {
          try {
            const orderData = await fetchOrderDetails(params.orderNumber);

            if (orderData) {
              const existingItems = orderData.menu_details.map((item) => ({
                menu_id: item.menu_id.toString(),
                menu_name: item.menu_name,
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity),
                total_price: parseFloat(item.menu_sub_total),
                portionSize: item.half_or_full === "half" ? "Half" : "Full",
                offer: parseFloat(item.offer || 0),
                specialInstructions: item.comment || "",
              }));

              setSelectedItems(existingItems);

              if (orderData.order_details) {
                setServiceChargePercentage(
                  parseFloat(orderData.order_details.service_charges_percent)
                );
                setGstPercentage(
                  parseFloat(orderData.order_details.gst_percent)
                );
              }
            }
          } catch (error) {
            console.error("Error loading existing order:", error);
            toast.show({
              description: "Error loading existing order",
              status: "error",
            });
          }
        }
        setIsLoadingOrder(false);
      };

      loadExistingOrder();

      // Cleanup function when leaving the screen
      return () => {
        setSelectedItems([]);
        setSearchQuery("");
        setSearchResults([]);
        setIsSearchOpen(false);
        setServiceChargePercentage(0);
        setGstPercentage(0);
        setIsLoadingOrder(false);
      };
    }, [params?.orderNumber, params?.isOccupied]) // Dependencies
  );

  // Add useEffect to fetch percentages from AsyncStorage
  useEffect(() => {
    const fetchPercentages = async () => {
      try {
        const [gst, serviceCharge] = await AsyncStorage.multiGet([
          "gst_percentage",
          "service_charge_percentage",
        ]);

        setGstPercentage(parseFloat(gst[1]) || 0);
        setServiceChargePercentage(parseFloat(serviceCharge[1]) || 0);

        console.log(
          "Loaded from storage - GST:",
          gst[1],
          "Service:",
          serviceCharge[1]
        );
      } catch (error) {
        console.error("Error fetching percentages from storage:", error);
      }
    };

    fetchPercentages();
  }, []); // Run once when component mounts

  const handleAddItem = (item, selectedPortion) => {
    const newItem = {
      menu_id: item.menu_id,
      menu_name: item.menu_name,
      quantity: 1,
      portionSize: selectedPortion,
      price:
        selectedPortion === "Half"
          ? Number(item.half_price)
          : Number(item.full_price),
      half_price: Number(item.half_price),
      full_price: Number(item.full_price),
      offer: Number(item.offer || 0),
      specialInstructions: "",
      menu_food_type: item.menu_food_type,
      image: item.image,
    };

    setSelectedItems((prev) => {
      // Check if item with same menu_id and portionSize exists
      const existingItemIndex = prev.findIndex(
        (i) => i.menu_id === item.menu_id && i.portionSize === selectedPortion
      );

      if (existingItemIndex !== -1) {
        // If item exists, increment its quantity
        const updatedItems = [...prev];
        if (updatedItems[existingItemIndex].quantity < 20) {
          updatedItems[existingItemIndex].quantity += 1;
        }
        return updatedItems;
      } else {
        // If item doesn't exist, add new item
        return [...prev, newItem];
      }
    });

    setSearchQuery("");
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  const initializeOrderDetails = async (orderData) => {
    if (orderData?.menu_details) {
      const transformedItems = await Promise.all(
        orderData.menu_details.map(async (item) => {
          // Find the full menu item details from menuItems
          const menuItem = menuItems.find((m) => m.menu_id === item.menu_id);

          return {
            menu_id: item.menu_id,
            menu_name: item.menu_name,
            quantity: Number(item.quantity),
            portionSize: item.half_or_full === "half" ? "Half" : "Full",
            price: Number(item.price),
            half_price: Number(menuItem?.half_price || 0),
            full_price: Number(menuItem?.full_price || item.price),
            offer: Number(item.offer || 0),
            specialInstructions: item.comment || "",
            menu_sub_total: Number(item.menu_sub_total),
          };
        })
      );
      setSelectedItems(transformedItems);
    }
  };

  const renderSelectedItem = (item) => (
    <HStack space={4}>
      {Number(item.half_price) > 0 && (
        <Text fontSize={14}>Half: ₹{item.half_price}</Text>
      )}
      <Text fontSize={14}>Full: ₹{item.full_price || item.price}</Text>
    </HStack>
  );

  // Add useEffect to clear states when navigating from special orders
  useEffect(() => {
    // Clear all states if it's a special order
    if (params.isSpecialOrder === "true") {
      setSelectedItems([]);
      setSearchQuery("");
      setOrderDetails({});
      setServiceCharges(0);
      setGstAmount(0);
      setDiscountAmount(0);
      setOrderId(null);
      setSectionId(null);
      setSectionName("");
      setTableNumber("");
    }
  }, [params.isSpecialOrder]);

  const OrderBadge = () => (
    <Box
      position="absolute"
      right={4}
      borderWidth={1}
      borderStyle="dashed"
      borderColor={
        params?.isSpecialOrder
          ? params.orderType === "parcel"
            ? "amber.500"
            : params.orderType === "drive-through"
            ? "purple.500"
            : "indigo.500"
          : params?.isOccupied === "1"
          ? "red.500"
          : "green.500"
      }
      rounded="lg"
      overflow="hidden"
    >
      <Badge
        bg={
          params?.isSpecialOrder
            ? params.orderType === "parcel"
              ? "amber.100"
              : params.orderType === "drive-through"
              ? "purple.100"
              : "indigo.100"
            : params?.isOccupied === "1"
            ? "red.100"
            : "green.100"
        }
        rounded="lg"
        px={3}
        py={1}
      >
        <VStack alignItems="center">
          {params?.isSpecialOrder ? (
            <Text
              color={
                params.orderType === "parcel"
                  ? "amber.800"
                  : params.orderType === "drive-through"
                  ? "purple.800"
                  : "indigo.800"
              }
              fontSize="sm"
              fontWeight="medium"
              numberOfLines={1}
            >
              {params.orderType === "drive-through"
                ? "Drive Through"
                : params.orderType.charAt(0).toUpperCase() +
                  params.orderType.slice(1)}
            </Text>
          ) : (
            <Text
              color={params?.isOccupied === "1" ? "red.800" : "green.800"}
              fontSize="sm"
              fontWeight="bold"
              numberOfLines={1}
            >
              {params.sectionName} - {params.tableNumber}
            </Text>
          )}
        </VStack>
      </Badge>
    </Box>
  );

  const calculateTotalDiscountPercentage = (items) => {
    if (items.length === 0) return 0;

    const totalAmount = items.reduce((sum, item) => {
      const price =
        item.portionSize === "Half"
          ? Number(item.half_price || item.price)
          : Number(item.full_price || item.price);
      return sum + price * Number(item.quantity);
    }, 0);

    const totalDiscount = calculateDiscount(items);

    return parseFloat(((totalDiscount / totalAmount) * 100).toFixed(2)) || 0;
  };

  return (
    <Box flex={1} bg="white" safeArea>
      <Header
        title={isOccupied === "1" ? "Update Order" : "Create Order"}
        onBackPress={() => router.replace("/(tabs)/tables/sections")}
        rightComponent={<OrderBadge />}
      />

      {isLoadingOrder ? (
        <Center flex={1} bg="coolGray.100">
          <VStack space={3} alignItems="center">
            <Spinner size="lg" color="blue.500" />
            <Text color="coolGray.600">Loading order details...</Text>
          </VStack>
        </Center>
      ) : (
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
                  <Pressable
                    key={item.menu_id}
                    bg="white"
                    p={2}
                    mb={1}
                    rounded="lg"
                    borderWidth={1}
                    borderColor="coolGray.200"
                  >
                    <HStack space={2} alignItems="center">
                      {/* Image */}
                      <Box size={16} rounded="md" overflow="hidden">
                        {item.image ? (
                          <Image
                            source={{ uri: item.image }}
                            alt={item.menu_name}
                            size="full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Center bg="gray.200" size="full">
                            <MaterialIcons
                              name="restaurant-menu"
                              size={24}
                              color="gray"
                            />
                          </Center>
                        )}
                      </Box>

                      {/* Menu Details */}
                      <VStack flex={1} space={1}>
                        <HStack space={2} alignItems="center">
                          <Text fontSize={16} fontWeight="600">
                            {item.menu_name}
                            {item.offer > 0 && (
                              <Text color="green.600" fontSize={14}>
                                {" "}
                                ({item.offer}% off)
                              </Text>
                            )}
                          </Text>
                        </HStack>
                        <HStack space={4}>
                          {Number(item.half_price) > 0 && (
                            <Text fontSize={14} color="gray.600">
                              Half: ₹{Number(item.half_price)}
                            </Text>
                          )}
                          <Text fontSize={14} color="gray.600">
                            Full: ₹{Number(item.full_price)}
                          </Text>
                        </HStack>
                      </VStack>

                      {/* Right side controls */}
                      <VStack alignItems="flex-end" space={2}>
                        <Select
                          selectedValue="Full"
                          minWidth="100"
                          accessibilityLabel="Choose portion"
                          placeholder="Choose portion"
                          onValueChange={(value) => handleAddItem(item, value)}
                          _selectedItem={{
                            endIcon: (
                              <MaterialIcons
                                name="check"
                                size={16}
                                color="gray"
                              />
                            ),
                          }}
                          dropdownIcon={
                            <MaterialIcons
                              name="arrow-drop-down"
                              size={24}
                              color="gray"
                            />
                          }
                          bg="white"
                        >
                          <Select.Item label="Full" value="Full" />
                          {Number(item.half_price) > 0 && (
                            <Select.Item label="Half" value="Half" />
                          )}
                        </Select>
                      </VStack>
                    </HStack>
                  </Pressable>
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
                      <HStack space={2} alignItems="center">
                        {params?.isOccupied === "1" && params?.orderNumber && (
                          <IconButton
                            icon={
                              <MaterialIcons
                                name="refresh"
                                size={20}
                                color="gray"
                              />
                            }
                            size="sm"
                            variant="ghost"
                            _pressed={{ bg: "coolGray.100" }}
                            onPress={async () => {
                              try {
                                setIsProcessing(true);
                                setLoadingMessage(
                                  "Refreshing order details..."
                                );
                                await fetchOrderDetails(params.orderNumber);
                              } catch (error) {
                                console.error("Error refreshing order:", error);
                              } finally {
                                setIsProcessing(false);
                                setLoadingMessage("");
                              }
                            }}
                          />
                        )}
                        <Text fontSize="sm" color="gray.500">
                          {selectedItems.length}{" "}
                          {selectedItems.length === 1 ? "Item" : "Items"}
                        </Text>
                      </HStack>
                      <Button
                        variant="ghost"
                        _text={{ color: "gray.500" }}
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
                          <HStack space={2} flex={1} alignItems="center">
                            <Text
                              fontWeight={600}
                              numberOfLines={1}
                              fontSize={18}
                            >
                              {item.menu_name}
                              {item.offer > 0 && (
                                <Text color="green.600" fontSize={14}>
                                  {" "}
                                  ({item.offer}% off)
                                </Text>
                              )}
                            </Text>
                          </HStack>
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

                          {/* Show selected portion price */}
                          <Text fontSize={14} color="gray.600">
                            {item.portionSize}: ₹{Number(item.price)}
                          </Text>
                        </HStack>
                      </VStack>
                    </Box>
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
                p={3}
              >
                {/* Price Details */}
                <VStack space={2} mb={3}>
                  {/* Total */}
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="sm" color="gray.600">
                      Total Amount
                    </Text>
                    <Text fontSize="sm" fontWeight="600">
                      ₹{calculateSubtotal(selectedItems).toFixed(2)}
                    </Text>
                  </HStack>

                  {/* Discount */}
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="sm" color="gray.600">
                      Discount (
                      {calculateTotalDiscountPercentage(selectedItems)}%)
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color="red.500">
                      -₹{calculateDiscount(selectedItems).toFixed(2)}
                    </Text>
                  </HStack>

                  {/* Total After Discount */}
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="sm" color="gray.600">
                      Total After Discount
                    </Text>
                    <Text fontSize="sm" fontWeight="600">
                      ₹
                      {(
                        calculateSubtotal(selectedItems) -
                        calculateDiscount(selectedItems)
                      ).toFixed(2)}
                    </Text>
                  </HStack>

                  {/* Service Charge */}
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="sm" color="gray.600">
                      Service Charge ({serviceChargePercentage}%)
                    </Text>
                    <Text fontSize="sm" fontWeight="600">
                      ₹
                      {calculateServiceCharges(
                        selectedItems,
                        serviceChargePercentage
                      ).toFixed(2)}
                    </Text>
                  </HStack>

                  {/* GST */}
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="sm" color="gray.600">
                      GST ({gstPercentage}%)
                    </Text>
                    <Text fontSize="sm" fontWeight="600">
                      ₹{calculateGST(selectedItems, gstPercentage).toFixed(2)}
                    </Text>
                  </HStack>

                  {/* Divider */}
                  <Divider my={1} />

                  {/* Grand Total */}
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="md" fontWeight="600">
                      Grand Total
                    </Text>
                    <Text fontSize="lg" fontWeight="700" color="green.600">
                      ₹
                      {calculateTotal(
                        selectedItems,
                        serviceChargePercentage,
                        gstPercentage
                      ).toFixed(2)}
                    </Text>
                  </HStack>
                </VStack>

                {/* Action Buttons Section */}
                <HStack space={4} justifyContent="space-between">
                  <Button
                    bg="gray.400"
                    rounded="lg"
                    onPress={handleHold}
                    _pressed={{ bg: "gray.600" }}
                  >
                    Save
                  </Button>
                  <Button
                    flex={1}
                    variant="outline"
                    bg="black"
                    leftIcon={
                      <MaterialIcons name="receipt" size={20} color="white" />
                    }
                    onPress={handleKOT}
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
                    _pressed={{ bg: "blue.600" }}
                  >
                    Settle
                  </Button>
                </HStack>
              </Box>
            )}
          </Box>
        </Box>
      )}

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
