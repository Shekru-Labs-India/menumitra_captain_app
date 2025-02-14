import React, { useState, useEffect } from "react";
import {
  TouchableWithoutFeedback,
  Keyboard,
  BackHandler,
  Platform,
  TouchableOpacity,
  Alert,
  StyleSheet,
  View,
  ActivityIndicator,
  NativeModules,
  NativeEventEmitter,
  Linking,
} from "react-native";
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
  Actionsheet,
} from "native-base";

import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../components/Header";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { sendNotificationToWaiter } from "../../../services/NotificationService";
import { getBaseUrl } from "../../../config/api.config";
import * as Print from "expo-print";
import { BleManager } from "react-native-ble-plx";
import { PermissionsAndroid } from "react-native";
import Constants from "expo-constants";
import base64 from "react-native-base64";

const PRINTER_SERVICE_UUIDS = [
  "49535343-FE7D-4AE5-8FA9-9FAFD205E455",
  "E7810A71-73AE-499D-8C15-FAA9AEF0C3F2",
  "000018F0-0000-1000-8000-00805F9B34FB",
];

const PRINTER_CHARACTERISTIC_UUIDS = [
  "49535343-8841-43F4-A8D4-ECBE34729BB3",
  "BEF8D6C9-9C21-4C9E-B632-BD58C1009F9F",
];

const ESC = 0x1b;
const GS = 0x1d;
const COMMANDS = {
  INITIALIZE: [ESC, "@"],
  TEXT_NORMAL: [ESC, "!", 0],
  TEXT_CENTERED: [ESC, "a", 1],
  LINE_SPACING: [ESC, "3", 60],
  CUT_PAPER: [GS, "V", 1],
};

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

const orderTypeMap = {
  parcel: "Parcel",
  "drive-through": "Drive Through",
  counter: "Counter",
  "dine-in": "Dine In",
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

  // Add this state for tracking fetch attempts
  const [chargesFetched, setChargesFetched] = useState(false);

  // Add this check to determine if it's an existing order
  const isExistingOrder = params?.orderId ? true : false;

  // Add loading state at the top of your component
  const [isLoading, setIsLoading] = useState(false);

  // Add this at component level, outside of the render
  const selectRef = React.useRef();

  // Add this state at component level
  const [openSelectId, setOpenSelectId] = useState(null);

  // Add this state at component level
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Add these state variables in your component
  const [printerDevice, setPrinterDevice] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [bleManager] = useState(() => {
    if (Platform.OS === "web") return null;
    if (Constants.appOwnership === "expo") {
      // Show message about development build requirement
      console.log("BLE requires development build");
      return null;
    }
    return new BleManager();
  });

  // Update the useEffect for session handling

  // Add this function to fetch order details
  const fetchOrderDetails = async (orderId) => {
    try {
      const accessToken = await AsyncStorage.getItem("access");
      const response = await fetch(`${getBaseUrl()}/order_view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
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
        const response = await fetch(`${getBaseUrl()}/order_view`, {
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
      const accessToken = await AsyncStorage.getItem("access");
      const response = await fetch(
        `${getBaseUrl()}/get_all_menu_list_by_category`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
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

      // Get both captain_id and user_id from AsyncStorage
      const storedCaptainId = await AsyncStorage.getItem("captain_id");
      const storedUserId = await AsyncStorage.getItem("user_id");
      const storedOutletId = await AsyncStorage.getItem("outlet_id");

      // Use stored values or params values
      const captain_id = storedCaptainId || params?.captainId;
      const user_id = storedUserId || params?.userId;
      const outlet_id = storedOutletId || params?.outletId;

      console.log("Order creation data:", {
        user_id,
        outlet_id,
        storedCaptainId,
        storedUserId,
        storedOutletId,
        params,
        selectedItems,
      });

      if (!captain_id || !user_id || !outlet_id) {
        console.error("Missing critical data:", {
          user_id,
          outlet_id,
          storedCaptainId,
          storedUserId,
          storedOutletId,
          params,
        });
        throw new Error("Missing required information");
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
        action: orderStatus,
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
        ? `${getBaseUrl()}/update_order`
        : `${getBaseUrl()}/create_order`;

      console.log(
        `${isUpdate ? "Updating" : "Creating"} order with data:`,
        orderData
      );

      if (isUpdate) {
        orderData.order_id = params.orderId.toString();
      }

      const accessToken = await AsyncStorage.getItem("access");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
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

  const handleHold = async () => {
    if (isLoading) return; // Prevent multiple calls

    try {
      setIsLoading(true);
      setLoadingMessage("Saving order...");

      await createOrder("save");
    } catch (error) {
      console.error("Error saving order:", error);
      toast.show({
        description: "Failed to save order",
        status: "error",
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleKOT = async () => {
    try {
      if (selectedItems.length === 0) {
        Alert.alert("Error", "Please add items to cart before creating KOT");
        return;
      }

      setIsProcessing(true);
      setLoadingMessage("Processing KOT...");

      // First create/update the order
      await createOrder("print");

      // Then handle KOT printing
      try {
        if (printerDevice && isConnected) {
          // Print using thermal printer
          const kotHtml = generateKOTHTML();
          await printThermal(kotHtml, true); // true indicates this is a KOT print
        } else {
          // Print using PDF
          await Print.printAsync({
            html: generateKOTHTML(),
            orientation: "portrait",
          });
        }
      } catch (printError) {
        console.error("KOT printing failed:", printError);
        Alert.alert(
          "Print Error",
          "Failed to print KOT. Would you like to try PDF printing?",
          [
            {
              text: "Print PDF",
              onPress: async () => {
                try {
                  await Print.printAsync({
                    html: generateKOTHTML(),
                    orientation: "portrait",
                  });
                } catch (error) {
                  Alert.alert("Error", "Failed to generate KOT PDF");
                }
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      }

      setLoadingMessage("");
      setIsProcessing(false);
    } catch (error) {
      console.error("KOT error:", error);
      Alert.alert("Error", error.message || "Failed to process KOT");
      setLoadingMessage("");
      setIsProcessing(false);
    }
  };

  const generateKOTHTML = () => {
    const items = selectedItems
      .map(
        (item) => `
      <tr style="font-family: monospace;">
        <td style="padding: 4px 0;">${item.menu_name}</td>
        <td style="text-align: center;">${item.quantity}</td>
      </tr>
    `
      )
      .join("");

    return `
    <html>
      <head>
        <style>
          @page { margin: 0; size: 80mm 297mm; }
          body { 
            font-family: monospace;
            padding: 10px;
            width: 80mm;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            font-size: 18px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">*** KOT ***</div>
        
        <div>
          Order: #${params?.orderId || "New Order"}<br>
          Table: ${params?.tableNumber || "-"}<br>
          DateTime: ${new Date().toLocaleString()}
        </div>

        <div class="divider"></div>

        <table>
          <tr>
            <th style="text-align: left;">Item</th>
            <th style="text-align: center;">Qty</th>
          </tr>
          ${items}
        </table>

        <div class="divider"></div>
        
        <div style="text-align: right;">
          Total Items: ${selectedItems.length}
        </div>
      </body>
    </html>
  `;
  };

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

      // Get all required stored values
      const [storedCaptainId, storedOutletId, storedUserId, accessToken] =
        await Promise.all([
          AsyncStorage.getItem("captain_id"),
          AsyncStorage.getItem("outlet_id"),
          AsyncStorage.getItem("user_id"),
          AsyncStorage.getItem("access"),
        ]);

      if (
        !storedOutletId ||
        !storedCaptainId ||
        !storedUserId ||
        !accessToken
      ) {
        throw new Error("Required data not found");
      }

      // Format order items with proper string conversion
      const orderItems = selectedItems.map((item) => ({
        menu_id: item.menu_id?.toString() || "",
        quantity: item.quantity?.toString() || "1",
        comment: item.specialInstructions?.toString() || "",
        half_or_full: (item.portionSize || "full").toLowerCase(),
        price: (
          item.price ||
          (item.portionSize === "Half" ? item.half_price : item.full_price) ||
          0
        ).toString(),
        total_price: (
          (item.price ||
            (item.portionSize === "Half" ? item.half_price : item.full_price) ||
            0) * (item.quantity || 1)
        ).toString(),
      }));

      // Calculate total with proper string conversion
      const grandTotal = calculateTotal(
        selectedItems,
        serviceChargePercentage,
        gstPercentage
      ).toString();

      // Base request body for all order types
      const baseRequestBody = {
        user_id: storedUserId.toString(),
        outlet_id: storedOutletId.toString(),
        order_items: orderItems,
        grand_total: grandTotal,
        service_charges_percent: serviceChargePercentage?.toString() || "0",
        gst_percent: gstPercentage?.toString() || "0",
        action: "settle",
      };

      // For existing orders
      if (params?.orderId) {
        try {
          // Step 1: Update the order first
          setLoadingMessage("Updating order...");
          const updateRequestBody = {
            ...baseRequestBody,
            order_id: params.orderId.toString(),
            order_type: "dine-in",
            ...(params?.tableNumber && {
              tables: [params.tableNumber.toString()],
              section_id: params.sectionId?.toString() || "",
            }),
          };

          const updateResponse = await fetch(`${getBaseUrl()}/update_order`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(updateRequestBody),
          });

          const updateResult = await updateResponse.json();
          if (updateResult.st !== 1) {
            throw new Error(updateResult.msg || "Failed to update order");
          }

          // Step 2: Mark as paid with simplified payload
          const settleRequestBody = {
            outlet_id: storedOutletId.toString(),
            order_id: params.orderId.toString(),
            order_status: "paid",
            user_id: storedUserId.toString(),
          };

          console.log(
            "Settle Request Body:",
            JSON.stringify(settleRequestBody, null, 2)
          );

          const settleResponse = await fetch(
            `${getBaseUrl()}/update_order_status`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify(settleRequestBody),
            }
          );

          const settleResult = await settleResponse.json();
          if (settleResult.st !== 1) {
            throw new Error(settleResult.msg || "Failed to mark as paid");
          }
        } catch (error) {
          throw new Error(error.message || "Failed to settle order");
        }
      } else {
        // For new orders (both special and regular)
        const createRequestBody = {
          ...baseRequestBody,
          captain_id: storedCaptainId.toString(),
          order_type: params?.isSpecialOrder
            ? (params.orderType || "").toLowerCase()
            : "dine-in",
          ...(params?.isSpecialOrder
            ? { tables: [] }
            : {
                tables: [params.tableNumber?.toString() || ""],
                section_id: params.sectionId?.toString() || "",
              }),
        };

        console.log(
          "Create Request Body:",
          JSON.stringify(createRequestBody, null, 2)
        );

        const createResponse = await fetch(`${getBaseUrl()}/create_order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(createRequestBody),
        });

        const createResult = await createResponse.json();
        if (createResult.st !== 1) {
          throw new Error(createResult.msg || "Failed to create order");
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
    const serviceCharge = (totalAfterDiscount * serviceChargePercentage) / 100;
    // Truncate to 2 decimal places to match API (0.525 → 0.52)
    return parseFloat(((serviceCharge * 100) / 100).toFixed(2));
  };

  const calculateGST = (selectedItems, gstPercentage) => {
    const totalAfterDiscount = calculateTotalAfterDiscount(selectedItems);
    const gst = (totalAfterDiscount * gstPercentage) / 100;
    // Truncate to 2 decimal places to match API (0.525 → 0.52)
    return parseFloat(((gst * 100) / 100).toFixed(2));
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
    return totalAfterDiscount + serviceCharges + parseFloat(gst);
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
          const response = await fetch(`${getBaseUrl()}/order_menu_details`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              order_id: params.orderId,
              outlet_id: userData?.outlet_id,
            }),
          });

          const orderData = await response.json();

          if (orderData.st === 1) {
            // Transform menu items to match our structure
            const existingItems = orderData.data.map((item) => ({
              menu_id: item.menu_id.toString(),
              menu_name: item.name,
              price: item.price,
              quantity: item.quantity,
              total_price: item.total_price,
              portionSize: item.half_or_full === "half" ? "Half" : "Full",
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

  // Update the useEffect to fetch stored GST and service charges with correct keys
  useFocusEffect(
    React.useCallback(() => {
      const fetchStoredCharges = async () => {
        try {
          // First attempt: Get from AsyncStorage
          let [gst, serviceCharges] = await Promise.all([
            AsyncStorage.getItem("gst"),
            AsyncStorage.getItem("service_charges"),
          ]);

          console.log("Initial fetch from storage:", { gst, serviceCharges });

          // If values are missing, try fetching from OTP response in storage
          if (!gst || !serviceCharges) {
            const userSession = await AsyncStorage.getItem("userSession");
            if (userSession) {
              const sessionData = JSON.parse(userSession);
              gst = sessionData.gst;
              serviceCharges = sessionData.service_charges;
              console.log("Fetched from session:", { gst, serviceCharges });

              // Store these values in AsyncStorage for future use
              if (gst) await AsyncStorage.setItem("gst", gst.toString());
              if (serviceCharges)
                await AsyncStorage.setItem(
                  "service_charges",
                  serviceCharges.toString()
                );
            }
          }

          // Set the values if we have them
          if (gst) {
            const gstValue = parseFloat(gst);
            console.log("Setting GST:", gstValue);
            setGstPercentage(gstValue);
          }

          if (serviceCharges) {
            const serviceValue = parseFloat(serviceCharges);
            console.log("Setting Service Charge:", serviceValue);
            setServiceChargePercentage(serviceValue);
          }

          setChargesFetched(true);
        } catch (error) {
          console.error("Error fetching charges:", error);
        }
      };

      // Fetch charges when screen comes into focus
      fetchStoredCharges();

      // Cleanup function
      return () => {
        setChargesFetched(false);
      };
    }, []) // Empty dependency array for mount-only execution
  );

  // Add a backup useEffect in case the first one fails
  useEffect(() => {
    if (!gstPercentage || !serviceChargePercentage) {
      const retryFetch = async () => {
        try {
          const userSession = await AsyncStorage.getItem("userSession");
          if (userSession) {
            const sessionData = JSON.parse(userSession);
            if (sessionData.gst && !gstPercentage) {
              setGstPercentage(parseFloat(sessionData.gst));
            }
            if (sessionData.service_charges && !serviceChargePercentage) {
              setServiceChargePercentage(
                parseFloat(sessionData.service_charges)
              );
            }
          }
        } catch (error) {
          console.error("Backup fetch error:", error);
        }
      };

      retryFetch();
    }
  }, [gstPercentage, serviceChargePercentage]);

  const handleAddItem = (item, selectedPortion) => {
    const newItem = {
      ...item,
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
      isNewlyAdded: true,
    };

    setSelectedItems((prevItems) => {
      // Check if the same menu item with same portion exists in current items
      const existingItemIndex = prevItems.findIndex(
        (prevItem) =>
          String(prevItem.menu_id) === String(item.menu_id) &&
          String(prevItem.portionSize).toLowerCase() ===
            String(selectedPortion).toLowerCase()
      );

      // If item exists, update its quantity
      if (existingItemIndex !== -1) {
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex];

        // Check quantity limit
        if (existingItem.quantity < 20) {
          existingItem.quantity += 1;
          existingItem.total_price =
            selectedPortion === "Half"
              ? Number(item.half_price) * existingItem.quantity
              : Number(item.full_price) * existingItem.quantity;
        }

        return updatedItems;
      }

      // If item doesn't exist, check in orderDetails (for existing orders)
      if (orderDetails?.menu_items) {
        const existingOrderItemIndex = orderDetails.menu_items.findIndex(
          (orderItem) =>
            String(orderItem.menu_id) === String(item.menu_id) &&
            String(orderItem.portionSize).toLowerCase() ===
              String(selectedPortion).toLowerCase()
        );

        if (existingOrderItemIndex !== -1) {
          // Item exists in order details, add with increased quantity
          const existingOrderItem =
            orderDetails.menu_items[existingOrderItemIndex];
          return [
            ...prevItems.filter(
              (item) =>
                !(
                  String(item.menu_id) === String(existingOrderItem.menu_id) &&
                  String(item.portionSize).toLowerCase() ===
                    String(selectedPortion).toLowerCase()
                )
            ),
            {
              ...newItem,
              quantity: (existingOrderItem.quantity || 0) + 1,
              total_price:
                selectedPortion === "Half"
                  ? Number(item.half_price) * (existingOrderItem.quantity + 1)
                  : Number(item.full_price) * (existingOrderItem.quantity + 1),
              specialInstructions: existingOrderItem.specialInstructions || "",
            },
          ];
        }
      }

      // If item doesn't exist anywhere, add as new
      return [
        ...prevItems,
        {
          ...newItem,
          total_price:
            selectedPortion === "Half"
              ? Number(item.half_price)
              : Number(item.full_price),
        },
      ];
    });

    // Clear search after adding
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  // Update the removeFromCart function
  const removeFromCart = (menuId, portionSize) => {
    setSelectedItems((prevItems) =>
      prevItems.filter((item) => {
        // Keep the item if:
        // 1. It's not the item we want to remove (different menu_id or portionSize)
        // 2. OR it's an existing item (not newly added)
        return !(
          item.menu_id === menuId &&
          item.portionSize === portionSize &&
          item.isNewlyAdded
        );
      })
    );
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

  // Add the print handling functions
  const handlePrint = async () => {
    try {
      if (selectedItems.length === 0) {
        Alert.alert("Error", "Please add items to cart before printing");
        return;
      }

      setIsProcessing(true);
      setLoadingMessage("Printing...");

      // First update/create the order
      await createOrder("print");

      // Check if running in Expo Go
      if (
        Platform.OS === "web" ||
        Constants.executionEnvironment === "storeClient"
      ) {
        // Use PDF printing in Expo Go
        const html = await generateReceiptHTML();
        await Print.printAsync({
          html,
          orientation: "portrait",
        });
      } else {
        // Use thermal printing in production
        if (printerDevice && isConnected) {
          await printReceipt();
        } else {
          // Show printer selection modal
          setIsModalVisible(true);
          scanForPrinters();
        }
      }

      setLoadingMessage("");
      setIsProcessing(false);
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert("Error", error.message || "Failed to print receipt");
      setLoadingMessage("");
      setIsProcessing(false);
    }
  };

  // Add the Bluetooth scanning and connection functions
  const scanForPrinters = async () => {
    try {
      if (!bleManager) {
        Alert.alert(
          "Feature Not Available",
          "Bluetooth printing is only available in development or production builds."
        );
        return;
      }

      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert("Permission Error", "Bluetooth permissions not granted");
        return;
      }

      setIsScanning(true);
      setAvailableDevices([]);
      setIsModalVisible(true);

      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error("Scan error:", error);
          return;
        }
        if (device) {
          setAvailableDevices((prevDevices) => {
            if (!prevDevices.find((d) => d.id === device.id)) {
              return [...prevDevices, device];
            }
            return prevDevices;
          });
        }
      });
    } catch (error) {
      console.error("Scan error:", error);
      Alert.alert("Error", "Failed to start scanning");
    }
  };

  const handleDeviceSelection = async (device) => {
    try {
      setIsModalVisible(false);
      setIsScanning(false);
      bleManager.stopDeviceScan();

      setLoadingMessage("Connecting to device...");
      setIsLoading(true);

      const connectedDevice = await device.connect();
      const discoveredDevice =
        await connectedDevice.discoverAllServicesAndCharacteristics();

      setPrinterDevice(discoveredDevice);
      setIsConnected(true);

      // Monitor connection state
      device.onDisconnected((error, disconnectedDevice) => {
        if (!isDisconnecting) {
          setIsConnected(false);
          setPrinterDevice(null);
          Alert.alert("Disconnected", "Printer connection was lost");
        }
      });

      Alert.alert("Success", `Connected to ${device.name || "printer"}`);
    } catch (error) {
      console.error("Connection error:", error);
      Alert.alert(
        "Connection Failed",
        "Could not connect to the selected device"
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // Add helper functions for printing
  const textToBytes = (text) => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(text));
  };

  const sendToDevice = async (commands) => {
    try {
      if (!printerDevice || !isConnected) {
        throw new Error("No printer connected");
      }

      const services = await printerDevice.services();
      const service = services.find((s) =>
        PRINTER_SERVICE_UUIDS.includes(s.uuid.toUpperCase())
      );

      if (!service) {
        throw new Error("Printer service not found");
      }

      const characteristics = await service.characteristics();
      const printCharacteristic = characteristics.find((c) =>
        PRINTER_CHARACTERISTIC_UUIDS.includes(c.uuid.toUpperCase())
      );

      if (!printCharacteristic) {
        throw new Error("Printer characteristic not found");
      }

      // Send data in chunks
      const CHUNK_SIZE = 20;
      for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
        const chunk = commands.slice(
          i,
          Math.min(i + CHUNK_SIZE, commands.length)
        );
        const base64Data = base64.encode(String.fromCharCode(...chunk));

        // Add retry logic
        let retries = 3;
        while (retries > 0) {
          try {
            await printCharacteristic.writeWithoutResponse(base64Data);
            break;
          } catch (error) {
            retries--;
            if (retries === 0) throw error;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return true;
    } catch (error) {
      console.error("Send to printer error:", error);
      throw error;
    }
  };

  // Add enhanced permission checking
  const requestPermissions = async () => {
    try {
      const state = await bleManager.state();
      if (state !== "PoweredOn") {
        Alert.alert(
          "Bluetooth Required",
          "Please enable Bluetooth to connect to printer",
          [
            {
              text: "Open Settings",
              onPress: () => Linking.openSettings(),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return false;
      }

      if (Platform.OS === "android") {
        if (Platform.Version >= 31) {
          const results = await Promise.all([
            PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
            ),
            PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
            ),
            PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            ),
          ]);
          return results.every(
            (result) => result === PermissionsAndroid.RESULTS.GRANTED
          );
        } else {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          return result === PermissionsAndroid.RESULTS.GRANTED;
        }
      }
      return true;
    } catch (error) {
      console.error("Permission request error:", error);
      return false;
    }
  };

  // Add this function to handle receipt printing
  const printReceipt = async () => {
    try {
      if (!printerDevice || !isConnected) {
        throw new Error("No printer connected");
      }

      const html = await generateReceiptHTML();

      if (printerDevice && isConnected) {
        await printThermal(html);
      } else {
        await Print.printAsync({
          html,
          printerUrl: printerList[0]?.url,
          orientation: "portrait",
        });
      }
    } catch (error) {
      console.error("Print receipt error:", error);
      throw error;
    }
  };

  // Add this function for thermal printing
  const printThermal = async (html, isKOT = false) => {
    try {
      if (!printerDevice || !isConnected) {
        throw new Error("No printer connected");
      }

      // Convert HTML to printer commands
      const commands = isKOT
        ? generateKOTCommands(html)
        : generatePrinterCommands(html);

      // Send commands to printer
      await sendToDevice(commands);
    } catch (error) {
      console.error("Thermal print error:", error);
      throw error;
    }
  };

  // Add KOT-specific command generator
  const generateKOTCommands = (html) => {
    const commands = [
      ...COMMANDS.INITIALIZE,
      ...textToBytes("\x1B\x40"), // Initialize printer
      ...textToBytes("\x1B\x61\x01"), // Center alignment
      ...textToBytes("*** KOT ***\n\n"),
      ...textToBytes("\x1B\x61\x00"), // Left alignment
      ...textToBytes(`Order: #${params?.orderId || "New Order"}\n`),
      ...textToBytes(`Table: ${params?.tableNumber || "-"}\n`),
      ...textToBytes(`Date: ${new Date().toLocaleString()}\n\n`),
      ...textToBytes("Items:\n"),
      ...selectedItems
        .map((item) => textToBytes(`${item.menu_name} x ${item.quantity}\n`))
        .flat(),
      ...COMMANDS.CUT_PAPER,
    ];

    return commands;
  };

  // Add printer command generator
  const generatePrinterCommands = (html) => {
    // Convert HTML content to printer commands
    const commands = [
      ...COMMANDS.INITIALIZE,
      ...textToBytes("\x1B\x40"), // Initialize printer
      ...textToBytes("\x1B\x61\x01"), // Center alignment
      ...textToBytes("*** RECEIPT ***\n\n"),
      ...textToBytes("\x1B\x61\x00"), // Left alignment
      ...textToBytes(html),
      ...COMMANDS.CUT_PAPER,
    ];

    return commands;
  };

  // Add this function to generate receipt HTML
  const generateReceiptHTML = async () => {
    try {
      // Get restaurant details from AsyncStorage
      const outletName =
        (await AsyncStorage.getItem("outlet_name")) || "Restaurant";
      const outletAddress =
        (await AsyncStorage.getItem("outlet_address")) || "Address";
      const websiteUrl =
        (await AsyncStorage.getItem("website_url")) || "menumitra.com";

      const items = selectedItems
        .map(
          (item) => `
      <tr>
        <td style="text-align: left;">${item.menu_name}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">₹${
          item.portionSize === "Half" ? item.half_price : item.full_price
        }</td>
        <td style="text-align: right;">₹${(
          (item.portionSize === "Half" ? item.half_price : item.full_price) *
          item.quantity
        ).toFixed(2)}</td>
      </tr>
    `
        )
        .join("");

      const subtotal = calculateSubtotal(selectedItems);
      const discount = calculateDiscount(selectedItems);
      const serviceChargesAmount = calculateServiceCharges(
        selectedItems,
        serviceChargePercentage
      );
      const gstAmount = calculateGST(selectedItems, gstPercentage);
      const grandTotal = calculateTotal(
        selectedItems,
        serviceChargePercentage,
        gstPercentage
      );

      return `
    <html>
      <head>
        <style>
          @page {
            margin: 0;
            size: 80mm 297mm;
          }
          body { 
            font-family: monospace;
            padding: 10px;
            width: 80mm;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          .restaurant-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .restaurant-address {
            font-size: 14px;
            margin-bottom: 5px;
          }
          .order-info {
            margin-bottom: 10px;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 14px;
          }
          th, td {
            padding: 3px 0;
          }
          .dotted-line {
            border-top: 1px dotted black;
            margin: 5px 0;
          }
          .total-section {
            font-size: 14px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          .payment-methods {
            text-align: center;
            margin: 15px 0;
          }
          .payment-icons {
            display: flex;
            justify-content: space-around;
            margin: 10px 0;
          }
          .payment-icons span {
            font-size: 12px;
            color: #666;
            padding: 4px 8px;
          }
          .qr-section {
            text-align: center;
            margin: 15px 0;
          }
          .qr-code {
            width: 150px;
            height: 150px;
            margin: 10px auto;
          }
          .website {
            text-align: center;
            font-size: 12px;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="restaurant-name">${outletName}</div>
          <div class="restaurant-address">${outletAddress}</div>
        </div>

        <div class="order-info">
          Order: #${params?.orderId || "New Order"}<br>
          Table: ${
            params?.isSpecialOrder
              ? orderTypeMap[params.orderType]
              : `Dinning - ${params.tableNumber}`
          }<br>
          DateTime: ${new Date().toLocaleString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })}
        </div>

        <div class="dotted-line"></div>

        <table>
          <tr>
            <th style="text-align: left;">Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Amt</th>
          </tr>
          ${items}
        </table>

        <div class="dotted-line"></div>

        <div class="total-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${subtotal.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Discount(${calculateTotalDiscountPercentage(
              selectedItems
            )}%):</span>
            <span>-₹${discount.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Service Charges(${serviceChargePercentage}%):</span>
            <span>+₹${serviceChargesAmount.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>GST(${gstPercentage}%):</span>
            <span>+₹${gstAmount.toFixed(2)}</span>
          </div>
        </div>

        <div class="dotted-line"></div>

        <div class="total-row" style="font-weight: bold;">
          <span>Total:</span>
          <span>₹${grandTotal.toFixed(2)}</span>
        </div>

        <div class="payment-methods">
          <div class="payment-icons">
            <span>PhonePe</span>
            <span>Google Pay</span>
            <span>Paytm</span>
            <span>UPI</span>
          </div>
        </div>

        <div class="qr-section">
          <div>Scan to Pay ₹${grandTotal.toFixed(2)}</div>
          <img 
            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=merchant@upi&pn=${encodeURIComponent(
              outletName
            )}&am=${grandTotal.toFixed(2)}&cu=INR" 
            class="qr-code"
          />
        </div>

        <div class="website">
          ${websiteUrl}
        </div>
      </body>
    </html>
    `;
    } catch (error) {
      console.error("Error generating receipt HTML:", error);
      throw error;
    }
  };

  // Add this function to generate KOT HTML

  // Add this component for the device selection modal
  const DeviceSelectionModal = ({ visible, devices, onSelect, onClose }) => (
    <Modal isOpen={visible} onClose={onClose}>
      <Modal.Content maxWidth="90%" maxHeight="80%">
        <Modal.Header>Select a Bluetooth Printer</Modal.Header>
        <Modal.Body>
          {isScanning && (
            <Center p={4}>
              <Spinner size="lg" color="blue.500" />
              <Text mt={2} color="gray.600">
                Scanning for devices...
              </Text>
            </Center>
          )}

          <ScrollView maxH="300">
            {devices.map((device, index) => (
              <Pressable
                key={device.id || index}
                p={4}
                borderBottomWidth={1}
                borderBottomColor="gray.200"
                onPress={() => onSelect(device)}
              >
                <Text fontSize="md" fontWeight="500">
                  {device.name || "Unknown Device"}
                </Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  {device.id}
                </Text>
              </Pressable>
            ))}
            {!isScanning && devices.length === 0 && (
              <Text textAlign="center" color="gray.500" p={4}>
                No printers found. Make sure your printer is turned on and
                nearby.
              </Text>
            )}
          </ScrollView>
        </Modal.Body>

        <Modal.Footer>
          <Button.Group space={2}>
            <Button
              variant="ghost"
              colorScheme="blueGray"
              onPress={() => {
                setAvailableDevices([]);
                scanForPrinters();
              }}
            >
              Scan Again
            </Button>
            <Button onPress={onClose}>Close</Button>
          </Button.Group>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );

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
        <KeyboardAvoidingView
          flex={1}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <VStack flex={1} bg="coolGray.100" px={4}>
            {isOccupied === "1" && orderNumber && <OrderSummary />}

            <Box mb={2}>
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
                      icon={
                        <MaterialIcons name="close" size={24} color="gray" />
                      }
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
                      onPress={() => {
                        setSelectedItem(item);
                        setShowActionSheet(true);
                      }}
                    >
                      <HStack space={2} alignItems="center">
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
                      </HStack>
                    </Pressable>
                  ))}
                </ScrollView>
              </Box>
            )}

            <Box flex={1}>
              <ScrollView
                flex={1}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{
                  paddingBottom: selectedItems.length > 0 ? 30 : 20,
                }}
                nestedScrollEnabled={true}
              >
                <VStack space={2} mb={selectedItems.length > 0 ? 300 : 0}>
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
                        <HStack
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <HStack space={2} alignItems="center">
                            {params?.isOccupied === "1" &&
                              params?.orderNumber && (
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
                                      await fetchOrderDetails(
                                        params.orderNumber
                                      );
                                    } catch (error) {
                                      console.error(
                                        "Error refreshing order:",
                                        error
                                      );
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
                          {!isExistingOrder && (
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
                          )}
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
                              {(item.isNewlyAdded || !isExistingOrder) && (
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
                                    removeFromCart(
                                      item.menu_id,
                                      item.portionSize
                                    );
                                  }}
                                />
                              )}
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
                                      newItems[index].total_price =
                                        item.portionSize === "Half"
                                          ? Number(item.half_price) *
                                            newItems[index].quantity
                                          : Number(item.full_price) *
                                            newItems[index].quantity;
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
                                      newItems[index].total_price =
                                        item.portionSize === "Half"
                                          ? Number(item.half_price) *
                                            newItems[index].quantity
                                          : Number(item.full_price) *
                                            newItems[index].quantity;
                                      setSelectedItems(newItems);
                                    }
                                  }}
                                />
                              </HStack>

                              <Text fontSize={14} color="gray.600">
                                {item.half_or_full
                                  ? item.half_or_full.charAt(0).toUpperCase() +
                                    item.half_or_full.slice(1)
                                  : item.portionSize}
                                : ₹
                                {(item.price
                                  ? Number(item.price) * item.quantity
                                  : item.portionSize === "Half"
                                  ? Number(item.half_price) * item.quantity
                                  : Number(item.full_price) * item.quantity
                                ).toFixed(2)}
                              </Text>
                            </HStack>
                          </VStack>
                        </Box>
                      ))}
                    </>
                  )}
                </VStack>
              </ScrollView>
            </Box>

            {selectedItems.length > 0 && (
              <Box
                position="absolute"
                bottom={0}
                left={0}
                right={0}
                bg="white"
                px={4}
                py={2}
                borderTopWidth={1}
                borderTopColor="coolGray.200"
                style={{
                  shadowColor: "#000",
                  shadowOffset: {
                    width: 0,
                    height: -2,
                  },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 5,
                }}
              >
                <VStack space={2} mb={3}>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="sm" color="gray.600">
                      Total Amount
                    </Text>
                    <Text fontSize="sm" fontWeight="600">
                      ₹{calculateSubtotal(selectedItems).toFixed(2)}
                    </Text>
                  </HStack>

                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="sm" color="gray.600">
                      Discount (
                      {calculateTotalDiscountPercentage(selectedItems)}%)
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color="red.500">
                      -₹{calculateDiscount(selectedItems).toFixed(2)}
                    </Text>
                  </HStack>

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

                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="sm" color="gray.600">
                      GST ({gstPercentage}%)
                    </Text>
                    <Text fontSize="sm" fontWeight="600">
                      ₹{calculateGST(selectedItems, gstPercentage).toFixed(2)}
                    </Text>
                  </HStack>

                  <Divider my={1} />

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

                <HStack
                  space={2}
                  justifyContent="space-between"
                  alignItems="center"
                  py={2}
                >
                  <TouchableOpacity
                    onPress={handleHold}
                    disabled={Boolean(
                      loadingMessage && loadingMessage !== "Saving order..."
                    )}
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: "transparent",
                      justifyContent: "center",
                      alignItems: "center",
                      minWidth: 44,
                      minHeight: 44,
                    }}
                  >
                    <MaterialIcons
                      name="save"
                      size={28}
                      color={
                        loadingMessage === "Saving order..." ? "#999" : "#666"
                      }
                    />
                  </TouchableOpacity>

                  <Button
                    flex={1}
                    bg="black"
                    height="44px"
                    leftIcon={
                      <MaterialIcons
                        name="receipt"
                        size={24}
                        color="white"
                        style={{ marginRight: 4 }}
                      />
                    }
                    onPress={handleKOT}
                    _text={{
                      color: "white",
                      fontSize: "md",
                      fontWeight: "600",
                    }}
                    isDisabled={Boolean(
                      loadingMessage && loadingMessage !== "Processing KOT..."
                    )}
                    isLoading={loadingMessage === "Processing KOT..."}
                  >
                    {loadingMessage === "Processing KOT..."
                      ? "Processing..."
                      : "KOT"}
                  </Button>

                  <Button
                    flex={1}
                    variant="outline"
                    bg="black"
                    height="44px"
                    leftIcon={
                      <MaterialIcons
                        name="print"
                        size={24}
                        color="white"
                        style={{ marginRight: 4 }}
                      />
                    }
                    onPress={handlePrint}
                    _text={{
                      color: "white",
                      fontSize: "md",
                      fontWeight: "600",
                    }}
                    isDisabled={Boolean(
                      loadingMessage && loadingMessage !== "Printing..."
                    )}
                    isLoading={loadingMessage === "Printing..."}
                  >
                    {loadingMessage === "Printing..." ? "Printing..." : "Print"}
                  </Button>

                  <Button
                    flex={1}
                    bg="blue.500"
                    height="44px"
                    leftIcon={
                      <MaterialIcons
                        name="payment"
                        size={24}
                        color="white"
                        style={{ marginRight: 4 }}
                      />
                    }
                    onPress={handleSettle}
                    _pressed={{ bg: "blue.600" }}
                    _text={{
                      color: "white",
                      fontSize: "md",
                      fontWeight: "600",
                    }}
                    isDisabled={Boolean(
                      loadingMessage && loadingMessage !== "Settling order..."
                    )}
                    isLoading={loadingMessage === "Settling order..."}
                  >
                    {loadingMessage === "Settling order..."
                      ? "Settling..."
                      : "Settle"}
                  </Button>
                </HStack>
              </Box>
            )}
          </VStack>
        </KeyboardAvoidingView>
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

      <Actionsheet
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
      >
        <Actionsheet.Content>
          <Actionsheet.Item
            onPress={() => {
              handleAddItem(selectedItem, "Full");
              setShowActionSheet(false);
            }}
          >
            Full
          </Actionsheet.Item>
          {selectedItem && Number(selectedItem.half_price) > 0 && (
            <Actionsheet.Item
              onPress={() => {
                handleAddItem(selectedItem, "Half");
                setShowActionSheet(false);
              }}
            >
              Half
            </Actionsheet.Item>
          )}
        </Actionsheet.Content>
      </Actionsheet>

      <DeviceSelectionModal
        visible={isModalVisible}
        devices={availableDevices}
        onSelect={handleDeviceSelection}
        onClose={() => {
          setIsModalVisible(false);
          setIsScanning(false);
          bleManager?.stopDeviceScan();
        }}
      />
    </Box>
  );
}
