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
  Icon,
  Checkbox,
  Radio,
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
import { fetchWithAuth } from "../../../utils/apiInterceptor";
import { usePrinter } from "../../../context/PrinterContext";
import axios from "axios";
import Toast from "react-native-toast-message";

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
  LINE_SPACING: [ESC, "3", 24],  //? Reduced from 30 to 24 for tighter line spacing
  LINE_SPACING_TIGHT: [ESC, "3", 18], // Even tighter spacing for itemized sections ?(reduced from 24)
  LINE_SPACING_NORMAL: [ESC, "3", 30], // Normal spacing ?(reduced from 40)
  CUT_PAPER: [GS, "V", 1],
  MARGIN_BOTTOM: [ESC, "O", 1], //? Reduced bottom margin from 3 to 1
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
  delivery: "Delivery",
  "dine-in": "Dine In",
};

// Add these helper functions at the top level
const splitLongText = (text, maxLength) => {
  if (!text) return [""];
  
  // If text fits on one line, return immediately to save paper
  if (text.length <= maxLength) return [text];
  
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";
  
  for (const word of words) {
    // If adding this word would exceed max length
    if (currentLine.length + word.length + 1 <= maxLength) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      // If current line already has content, push it
      if (currentLine) lines.push(currentLine);
      
      // If the word itself is longer than maxLength, break it up
      if (word.length > maxLength) {
        let remainingWord = word;
        while (remainingWord.length > 0) {
          lines.push(remainingWord.slice(0, maxLength));
          remainingWord = remainingWord.slice(maxLength);
        }
        currentLine = "";
      } else {
        currentLine = word;
      }
    }
  }
  
  // Don't forget to add the last line if not empty
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

const formatMenuItem = (item) => {
  const name = item?.menu_name || item?.name || "";
  const qty = item?.quantity?.toString() || "0";
  const rate = Math.floor(item?.price || 0)?.toString();
  const total = (item?.quantity * item?.price || 0).toFixed(2);

  // Special handling for long item names
  if (name.length > 14) {
    const lines = splitLongText(name, 14);
    // First line contains the item name, qty, rate, and amount
    const firstLine = `${lines[0].padEnd(14)} ${qty.padStart(2)} ${rate.padStart(5)} ${total.padStart(8)}\n`;
    
    // If there are additional lines, format them with minimal spacing
    if (lines.length > 1) {
      // Combine all remaining lines where possible to minimize paper usage
      let remainingLines = [];
      let currentLine = "";
      
      for (let i = 1; i < lines.length; i++) {
        if (currentLine.length + lines[i].length + 1 <= 28) {
          currentLine += (currentLine ? " " : "") + lines[i];
        } else {
          remainingLines.push(currentLine);
          currentLine = lines[i];
        }
      }
      
      if (currentLine) {
        remainingLines.push(currentLine);
      }
      
      // Join with minimal line breaks
      const remainingText = remainingLines.map(line => `  ${line}`).join("\n");
      return firstLine + remainingText + "\n";
    }
    return firstLine;
  }
  
  return `${name.padEnd(14)} ${qty.padStart(2)} ${rate.padStart(5)} ${total.padStart(8)}\n`;
};

const formatAmountLine = (label, amount, symbol = "") => {
  const amountStr = Math.abs(amount).toFixed(2);
  const totalWidth = 30; //? Reduced from 32 to save horizontal space
  const amountWidth = 10; //? Reduced from 12 to save horizontal space

  const padding = Math.max(1, totalWidth - label.length - amountWidth);
  const amountWithSymbol = `${symbol}${amountStr}`;
  const amountPadded = amountWithSymbol.padStart(amountWidth);

  return `${label}${" ".repeat(padding)}${amountPadded}\n`;
};

const generateQRCode = (data) => {
  return [
    ...textToBytes("\x1D\x28\x6B\x04\x00\x31\x41\x32\x00"),
    ...textToBytes("\x1D\x28\x6B\x03\x00\x31\x43\x08"),
    ...textToBytes("\x1D\x28\x6B\x03\x00\x31\x45\x30"),
    ...textToBytes(
      `\x1D\x28\x6B${String.fromCharCode(
        data.length + 3,
        0
      )}\x31\x50\x30${data}`
    ),
    ...textToBytes("\x1D\x28\x6B\x03\x00\x31\x51\x30"),
  ];
};

// Keep the existing textToBytes function
const textToBytes = (text) => {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
};

// Add this helper function at the top level
const calculateItemTotal = (price, quantity, offer = 0) => {
  const total = price * quantity;
  const discount = (total * offer) / 100;
  return total - discount;
};

export default function CreateOrderScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const toast = useToast();
  const isFocused = useIsFocused();
  
  // Add printer context integration
  const {
    isConnected: printerConnected,
    printerDevice: contextPrinterDevice,
    connectToPrinter: contextConnectPrinter,
    sendDataToPrinter
  } = usePrinter();
  
  // Show printer connection status when focused
  useEffect(() => {
    if (isFocused && printerConnected && contextPrinterDevice) {
      console.log("Printer connected:", contextPrinterDevice?.id);
      toast.show({
        description: "Printer connected and ready",
        placement: "top",
        duration: 2000,
      });
    }
  }, [isFocused, printerConnected, contextPrinterDevice]);
  
  // State variables

  // Keep all existing states
  const [loading, setLoading] = useState(false);
  const [outletId, setOutletId] = useState(null);
  
  const [menuCategories, setMenuCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
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

  // Add orderType state
  const [orderType, setOrderType] = useState(params.orderType || "dine-in");

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

  // Add these new state variables for customer details and payment options
  const [customerDetails, setCustomerDetails] = useState({
    customer_name: "",
    customer_mobile: "",
    customer_alternate_mobile: "",
    customer_address: "",
    customer_landmark: ""
  });
  
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [specialDiscount, setSpecialDiscount] = useState('0');
  const [extraCharges, setExtraCharges] = useState('0');
  const [tip, setTip] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [isPaid, setIsPaid] = useState(false);
  const [isComplementary, setIsComplementary] = useState(false);
  const [isAdditionalOptionsOpen, setIsAdditionalOptionsOpen] = useState(false);
  
  // Add this validation function near the top of your component
  const validateMobileNumber = (number) => {
    const regex = /^[0-9]{0,10}$/; // Only allows up to 10 digits
    return regex.test(number);
  };

  // Update the handleCustomerDetailsChange function
  const handleCustomerDetailsChange = (field, value) => {
    if ((field === "customer_mobile" || field === "customer_alternate_mobile")) {
      // Only update if the value matches our validation or is empty
      if (validateMobileNumber(value) || value === "") {
        setCustomerDetails(prevDetails => ({
          ...prevDetails,
          [field]: value
        }));
      }
    } else {
      // For other fields, update normally
      setCustomerDetails(prevDetails => ({
        ...prevDetails,
        [field]: value
      }));
    }
  };

  // Update the useEffect for session handling

  // Add this function to fetch order details
  const fetchOrderDetails = async (orderId) => {
    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      
      const data = await fetchWithAuth(`${getBaseUrl()}/order_view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: orderId,
          order_id: params?.orderId?.toString() || "",
          outlet_id: storedOutletId?.toString() || ""
        }),
      });

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
        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        
        const data = await fetchWithAuth(`${getBaseUrl()}/order_view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_number: params.orderNumber,
            order_id: params.orderId?.toString() || "",
            outlet_id: storedOutletId?.toString() || ""
          }),
        });

        if (data.st === 1 && data.lists) {
          const orderDetails = data.lists;

          // Set the menu items with all necessary details
          const transformedItems = orderDetails.menu_details.map((item) => ({
            menu_id: item.menu_id?.toString(),
            menu_name: item.menu_name,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity),
            portionSize: "Full",
            specialInstructions: item.comment || "",
            offer: parseFloat(item.offer) || 0,
            menu_sub_total: parseFloat(item.menu_sub_total),
          }));

        
          // Set tax details
          if (orderDetails.order_details) {
            setServiceChargePercentage(
              parseFloat(orderDetails.order_details.service_charges_percent)
            );
            setGstPercentage(
              parseFloat(orderDetails.order_details.gst_percent)
            );

            // Set customer details
            if (orderDetails.order_details.customer_name) {
              setCustomerDetails({
                customer_name: orderDetails.order_details.customer_name || "",
                customer_mobile: orderDetails.order_details.customer_mobile || "",
                customer_alternate_mobile: orderDetails.order_details.customer_alternate_mobile || "",
                customer_address: orderDetails.order_details.customer_address || "",
                customer_landmark: orderDetails.order_details.customer_landmark || ""
              });
            }

            // Set additional charges
            setSpecialDiscount(orderDetails.order_details.special_discount?.toString() || "0");
            setExtraCharges(orderDetails.order_details.charges?.toString() || "0");
            setTip(orderDetails.order_details.tip?.toString() || "0");

            // Set payment information
            if (orderDetails.order_details.is_paid === "paid") {
              setIsPaid(true);
              setIsComplementary(false);
              setPaymentMethod(orderDetails.order_details.payment_method?.toUpperCase() || "CARD");
            } else if (orderDetails.order_details.is_paid === "complementary") {
              setIsPaid(false);
              setIsComplementary(true);
            }
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
  }, [params?.orderId, params?.orderNumber]); // Add proper dependencies

  const handleHold = async () => {
    if (isLoading) return; // Prevent multiple calls

    try {
      setIsLoading(true);
      setLoadingMessage("Saving order...");

      await createOrder("create_order");
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

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("CASH");
  const [isPaidChecked, setIsPaidChecked] = useState(false);

  const handleKOT = async (modalPaymentMethod = null) => {
    try {
      setIsLoading(true);
      setLoadingMessage("Processing order...");

      if (selectedItems.length === 0) {
        Alert.alert("Error", "Please add items to cart before generating KOT");
        return;
      }

      const [restaurantId, userId, accessToken] = await Promise.all([
        // getRestaurantId(),
        // getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      // Set auth header for subsequent requests
      // axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      const orderItems = selectedItems.map((item) => ({
        menu_id: item.menu_id?.toString(),
        quantity: item.quantity?.toString(),
        comment: item.specialInstructions || "",
        half_or_full: (item.portion || "full").toLowerCase(),
        price: item.price?.toString() || "0",
        total_price: item.total_price?.toString() || "0",
      }));

      const paymentStatus = isPaid ? "paid" : (isComplementary ? "complementary" : "unpaid");
      const effectivePaymentMethod = modalPaymentMethod || paymentMethod;

      const baseRequestBody = {
        user_id: userId?.toString(),
        outlet_id: restaurantId?.toString(),
        order_type: orderType || "dine-in",
        order_items: orderItems,
        grand_total: calculateGrandTotal()?.toString(),
        action: "settle",
        is_paid: paymentStatus,
        payment_method: isPaid ? effectivePaymentMethod : "",
        special_discount: specialDiscount,
        charges: extraCharges,
        tip: tip,
        customer_name: customerDetails.customer_name || "",
        customer_mobile: customerDetails.customer_mobile || "",
        customer_alternate_mobile: customerDetails.customer_alternate_mobile || "",
        customer_address: customerDetails.customer_address || "",
        customer_landmark: customerDetails.customer_landmark || "",
      };

      let apiResponse;

      if (tableData?.order_id) {
        const updateRequestBody = {
          ...baseRequestBody,
          order_id: tableData.order_id?.toString(),
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number?.toString()],
            section_id: tableData.section_id?.toString(),
          }),
          is_paid: null
        };

        const updateResponse = await axiosInstance.post(
          `${onGetProductionUrl()}update_order`,
          updateRequestBody,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const updateData = await updateResponse.data;
        if (updateData.st !== 1) {
          throw new Error(updateData.msg || "Failed to update order");
        }

        const statusRequestBody = {
          outlet_id: restaurantId?.toString(),
          order_id: tableData.order_id?.toString(),
          order_status: isPaid ? "paid" : (orderDetails?.order_status || existingOrderDetails?.order_status || "placed"),
          user_id: userId?.toString(),
          action: "settle",
          order_type: orderType || "dine-in",
          is_paid: paymentStatus,
          payment_method: isPaid ? effectivePaymentMethod : "",
          customer_name: customerDetails.customer_name || "",
          customer_mobile: customerDetails.customer_mobile || "",
          customer_alternate_mobile: customerDetails.customer_alternate_mobile || "",
          customer_address: customerDetails.customer_address || "",
          customer_landmark: customerDetails.customer_landmark || "",
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number?.toString()],
            section_id: tableData.section_id?.toString(),
          }),
        };

        const statusResponse = await axiosInstance.post(
          `${onGetProductionUrl()}update_order_status`,
          statusRequestBody,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const statusData = await statusResponse.data;
        if (statusData.st !== 1) {
          throw new Error(statusData.msg || "Failed to update order status");
        }

        apiResponse = updateData;
      } else {
        const createRequestBody = {
          ...baseRequestBody,
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number?.toString()],
            section_id: tableData.section_id?.toString(),
          }),
        };

        const response = await axiosInstance.post(
          `${onGetProductionUrl()}create_order`,
          createRequestBody,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.data;
        if (data.st !== 1) {
          throw new Error(data.msg || "Failed to create order");
        }

        apiResponse = data;
      }

      if (apiResponse.st === 1) {
        setLoadingMessage("Processing KOT...");

        if (!tableData?.order_id) {
          apiResponse.order_number =
            apiResponse.order_number || String(apiResponse.order_id);
        }
      
        if (printerConnected && contextPrinterDevice) {
          try {
            try {
              const isDeviceConnected = await contextPrinterDevice.isConnected();
              if (!isDeviceConnected) {
                console.log("Device reports as not connected for KOT despite context state");
                throw new Error("Printer connection not stable for KOT");
              }
              console.log("Printer verified as ready for KOT");
            } catch (connectionError) {
              console.error("KOT printer verification error:", connectionError);
              throw new Error("Please disconnect and reconnect your printer before printing KOT");
            }
            
            const kotCommands = await generateKOTCommands(apiResponse);
            if (sendDataToPrinter) {
              await sendDataToPrinter(kotCommands);
            } else {
              await sendToDevice(kotCommands, contextPrinterDevice);
            }
            
            setSelectedItems([]);
            navigation.navigate("RestaurantTables");
          } catch (error) {
            console.error("KOT print error:", error);
            Alert.alert("Error", "Failed to print KOT. Please try again.");
          }
        } else {
          if (Constants.appOwnership === "expo") {
            Alert.alert(
              "Print Options",
              "How would you like to print?",
              [
                {
                  text: "Print to PDF",
                  onPress: async () => {
                    try {
                      await Print.printAsync({
                        html: await generateKOTHTML(apiResponse),
                        printerUrl: printerList[0]?.url,
                        orientation: "portrait",
                      });
                      setSelectedItems([]);
                      navigation.navigate("RestaurantTables");
                    } catch (error) {
                      console.error("PDF print error:", error);
                      Alert.alert("Error", "Failed to generate KOT PDF");
                    }
                  },
                },
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => {
                    setSelectedItems([]);
                    navigation.navigate("RestaurantTables");
                  },
                },
              ],
              {
                cancelable: true,
                onDismiss: () => {
                  setSelectedItems([]);
                  navigation.navigate("RestaurantTables");
                },
              }
            );
          } else {
            Alert.alert(
              "Printer Not Connected",
              "Please connect a printer to print the KOT",
              [
                {
                  text: "Connect Printer",
                  onPress: () => navigation.navigate("PrinterManagement"),
                },
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => {
                    setSelectedItems([]);
                    navigation.navigate("RestaurantTables");
                  },
                },
              ],
              {
                cancelable: true,
                onDismiss: () => {
                  setSelectedItems([]);
                  navigation.navigate("RestaurantTables");
                },
              }
            );
          }
        }
      }
    } catch (error) {
      console.error("KOT error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.msg ||
          error.message ||
          "Failed to process order and generate KOT"
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
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

  // Handle KOT and Save button press
  const handleKOTAndSave = async () => {
    try {
      Keyboard.dismiss();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setIsLoading(true);
      setLoadingMessage("Processing order...");

      if (selectedItems.length === 0) {
        Alert.alert("Error", "Please add items to cart before generating KOT");
        return;
      }
      
      // Check printer connection first
      if (!printerConnected || !contextPrinterDevice) {
        Alert.alert(
          "Printer Not Connected",
          "You need to connect to a printer before printing KOT.",
          [
            {
              text: "Connect Printer",
              onPress: () => {
                router.push("/profile/PrinterManagement");
              },
            },
            {
              text: "Skip Printer",
              onPress: async () => {
                try {
                  setIsLoading(true);
                  setLoadingMessage("Creating order without printing...");
                  
                  // Use the createOrder function for better error handling
                  try {
                    let result;
                    if (tableData?.order_id) {
                      // Update existing order
                      result = await createOrder("placed", true);
                    } else {
                      // Create new order
                      result = await createOrder("KOT", true);
                    }
                    
                    Alert.alert(
                      "Order Created",
                      "Order has been created successfully without printing.",
                      [
                        {
                          text: "OK",
                          onPress: () => {
                            setSelectedItems([]);
                            navigation.navigate("RestaurantTables");
                          }
                        }
                      ]
                    );
                  } catch (orderError) {
                    // Don't show alert here as createOrder will already show the appropriate error
                    console.error("Order creation error in Skip Printer KOT:", orderError);
                    // Don't navigate away if there was an error with table occupation
                  }
                } finally {
                  setIsLoading(false);
                  setLoadingMessage("");
                }
              },
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        );
        return;
      }
      
      const [restaurantId, userId, accessToken] = await Promise.all([
        // getRestaurantId(),
        // getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      // Set auth header for subsequent requests
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

    const orderItems = selectedItems.map((item) => ({
      menu_id: item.menu_id?.toString(),
      quantity: item.quantity?.toString(),
      comment: item.specialInstructions || "",
        half_or_full: (item.portion || "full").toLowerCase(),
      price: item.price?.toString() || "0",
      total_price: item.total_price?.toString() || "0",
    }));

    const paymentStatus = isPaid ? "paid" : (isComplementary ? "complementary" : "unpaid");
    
    const baseRequestBody = {
        user_id: userId?.toString(),
        outlet_id: restaurantId?.toString(),
        order_type: orderType || "dine-in",
      order_items: orderItems,
        grand_total: calculateGrandTotal()?.toString(),
      action: "KOT_and_save",
      is_paid: paymentStatus,
        payment_method: isPaid ? paymentMethod : "",
        special_discount: specialDiscount,
        charges: extraCharges,
        tip: tip,
      customer_name: customerDetails.customer_name || "",
      customer_mobile: customerDetails.customer_mobile || "",
      customer_alternate_mobile: customerDetails.customer_alternate_mobile || "",
      customer_address: customerDetails.customer_address || "",
      customer_landmark: customerDetails.customer_landmark || "",
    };
    
    let apiResponse;

      // Handle existing order update
      if (tableData?.order_id) {
      const updateRequestBody = {
        ...baseRequestBody,
          order_id: tableData.order_id?.toString(),
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number?.toString()],
            section_id: tableData.section_id?.toString(),
        }),
      };

        const updateResponse = await axiosInstance.post(
          onGetProductionUrl() + "update_order",
          updateRequestBody
        );

        apiResponse = updateResponse.data;
      } else {
        // Handle new order creation
        const createRequestBody = {
          ...baseRequestBody,
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number?.toString()],
            section_id: tableData.section_id?.toString(),
        }),
      };

        const response = await axiosInstance.post(
          onGetProductionUrl() + "create_order",
          createRequestBody
        );

        apiResponse = response.data;
      }

      if (apiResponse.st === 1) {
        setLoadingMessage("Printing KOT...");

        try {
          // Generate and print KOT
          const kotCommands = await generateKOTCommands(apiResponse);
          if (sendDataToPrinter) {
            await sendDataToPrinter(kotCommands);
    } else {
            await sendToDevice(kotCommands);
          }

          Alert.alert("Success", "Order saved and KOT printed successfully!", [
            {
              text: "OK",
              onPress: () => {
                setSelectedItems([]);
                navigation.navigate("RestaurantTables");
              },
            },
          ]);
        } catch (printError) {
          console.error("KOT print error:", printError);
          Alert.alert(
            "Print Error",
            "Order was saved but failed to print KOT. Would you like to retry printing?",
            [
              {
                text: "Retry Print",
                onPress: async () => {
                  try {
                    const kotCommands = await generateKOTCommands(apiResponse);
                    if (sendDataToPrinter) {
                      await sendDataToPrinter(kotCommands);
                    } else {
                      await sendToDevice(kotCommands);
                    }
                    setSelectedItems([]);
                    navigation.navigate("RestaurantTables");
                  } catch (retryError) {
                    Alert.alert("Error", "Failed to print KOT");
                  }
                },
              },
              {
                text: "Skip Print",
                onPress: () => {
                  setSelectedItems([]);
                  navigation.navigate("RestaurantTables");
                },
              },
            ]
          );
        }
      } else {
        throw new Error(apiResponse.msg || "Failed to process order");
      }
    } catch (error) {
      console.error("KOT error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.msg ||
          error.message ||
          "Failed to process order and print KOT"
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // KOT printing function
  const printKOT = async (orderData) => {
    try {
      // Generate KOT commands for the provided order data
      console.log("Generating KOT commands for order data", orderData);
      const kotCommands = await generateKOTCommands(orderData);
      
      // Use the PrinterContext's sendDataToPrinter function
      console.log("Sending KOT commands to printer");
      await sendDataToPrinter(kotCommands);
      console.log("KOT commands sent successfully!");
      
      return true;
    } catch (error) {
      console.error("Print KOT error:", error);
      throw error;
    }
  };
  
  // Continue with the rest of the implementation (remove the generateKOTCommands function here)

  // Add this function before handleSettle
  const calculateTotal = (items) => {
    return items?.reduce((total, item) => {
      const itemTotal = parseFloat(item.total_price) || 0;
      return total + itemTotal;
    }, 0);
  };


// handle settle order
const handleSettleOrder = async () => {
  if (selectedItems.length === 0) {
    toast.show({
      description: "Please add items to the order",
      status: "warning"
    });
    return;
  }

  // Show payment modal
  setShowPaymentModal(true);
};

// Add this new function to handle settle payment confirmation
const handleSettlePaymentConfirm = async () => {
  try {
    setIsLoading(true);
    setLoadingMessage("Processing settlement...");
    setShowPaymentModal(false);

    const [storedUserId, storedOutletId] = await Promise.all([
      AsyncStorage.getItem("user_id"),
      AsyncStorage.getItem("outlet_id"),
    ]);

    if (!storedUserId || !storedOutletId) {
      throw new Error("Missing required information");
    }

    const orderItems = selectedItems.map((item) => ({
      menu_id: item.menu_id?.toString(),
      quantity: parseInt(item.quantity) || 1,
      comment: item.specialInstructions || "",
      half_or_full: (item.portionSize || "full").toLowerCase(),
      price: parseFloat(item.price) || 0,
      total_price: parseFloat(item.total_price) || 0,
    }));

    // Use the selected payment method and paid status from the modal
    const paymentStatus = isPaidChecked ? "paid" : (isComplementary ? "complementary" : "unpaid");
    const effectivePaymentMethod = isPaidChecked ? selectedPaymentMethod.toLowerCase() : "";

    const orderData = {
      user_id: storedUserId?.toString(),
      outlet_id: storedOutletId?.toString(),
      order_type: params?.isSpecialOrder ? params.orderType : "dine-in",
      order_items: orderItems,
      grand_total: calculateGrandTotal(
        selectedItems,
        specialDiscount,
        extraCharges,
        serviceChargePercentage,
        gstPercentage,
        tip
      )?.toString(),
      action: "settle",
      is_paid: paymentStatus,
      payment_method: effectivePaymentMethod,
      special_discount: specialDiscount?.toString(),
      charges: extraCharges?.toString(),
      tip: tip?.toString(),
      customer_name: customerDetails.customer_name || "",
      customer_mobile: customerDetails.customer_mobile || "",
      customer_alternate_mobile: customerDetails.customer_alternate_mobile || "",
      customer_address: customerDetails.customer_address || "",
      customer_landmark: customerDetails.customer_landmark || "",
    };

    if (!params?.isSpecialOrder) {
      if (!params.tableNumber || !params.sectionId) {
        throw new Error("Missing table or section information for dine-in order");
      }
      orderData.tables = [params.tableNumber?.toString()];
      orderData.section_id = params.sectionId?.toString();
    }

    const endpoint = params?.orderId ? 
      `${getBaseUrl()}/update_order` : 
      `${getBaseUrl()}/create_order`;

    if (params?.orderId) {
      orderData.order_id = params.orderId?.toString();
    }

    const result = await fetchWithAuth(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    if (result.st === 1) {
      // If order was successful, update the payment status
      const settleRequestBody = {
        outlet_id: storedOutletId?.toString(),
        order_id: (params?.orderId || result.order_id)?.toString(),
        order_status: "paid",
        payment_method: selectedPaymentMethod.toLowerCase(),
        user_id: storedUserId?.toString(),
      };

      const settleResult = await fetchWithAuth(
        `${getBaseUrl()}/update_order_status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settleRequestBody),
        }
      );

      if (settleResult.st !== 1) {
        throw new Error(settleResult.msg || "Failed to settle order");
      }

      toast.show({
        description: "Order settled successfully!",
        status: "success"
      });

      // Clear states and navigate
      setSelectedItems([]);
      router.replace({
        pathname: "/(tabs)/tables",
        params: { 
          refresh: Date.now()?.toString(),
          status: "completed"
        }
      });
    } else {
      throw new Error(result.msg || "Failed to process order");
    }
  } catch (error) {
    console.error("Error settling order:", error);
    toast.show({
      description: error.message || "Failed to settle order",
      status: "error"
    });
  } finally {
    setIsLoading(false);
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
    return items?.reduce((sum, item) => {
      const price = item.portionSize === "Half" ? Number(item.half_price || item.price) : Number(item.full_price || item.price);
      return sum + price * Number(item.quantity);
    }, 0);
  };

  const calculateItemDiscount = (items) => {
    return items?.reduce((sum, item) => {
      const price = item.portionSize === "Half" ? Number(item.half_price || item.price) : Number(item.full_price || item.price);
      const itemTotal = price * Number(item.quantity);
      return sum + (itemTotal * Number(item.offer)) / 100;
    }, 0);
  };

  const calculateTotalAfterDiscounts = (selectedItems, specialDiscount) => {
    const subtotal = calculateSubtotal(selectedItems);
    const itemDiscounts = calculateItemDiscount(selectedItems);
    const specialDiscountAmount = parseFloat(specialDiscount) || 0;
    return subtotal - itemDiscounts - specialDiscountAmount;
  };

  const calculateTotalAfterExtraCharges = (totalAfterDiscounts, extraCharges) => {
    const extraChargesAmount = parseFloat(extraCharges) || 0;
    return totalAfterDiscounts + extraChargesAmount;
  };

  const calculateServiceCharges = (amount, serviceChargePercentage) => {
    return (amount * serviceChargePercentage) / 100;
  };

  const calculateGST = (amount, gstPercentage) => {
    return (amount * gstPercentage) / 100;
  };

  const calculateGrandTotal = (selectedItems, specialDiscount, extraCharges, serviceChargePercentage, gstPercentage, tip) => {
    // 1. Start with items total
    const itemsTotal = calculateSubtotal(selectedItems);
    
    // 2. Subtract item discounts
    const itemDiscounts = calculateItemDiscount(selectedItems);
    
    // 3. Subtract special discount
    const specialDiscountAmount = parseFloat(specialDiscount) || 0;
    
    // 4. Add extra charges
    const extraChargesAmount = parseFloat(extraCharges) || 0;
    
    // 5. Calculate subtotal after discounts and extra charges
    const subtotalAfterDiscountsAndExtra = itemsTotal - itemDiscounts - specialDiscountAmount + extraChargesAmount;
    
    // 6. Calculate and add service charges
    const serviceCharges = calculateServiceCharges(subtotalAfterDiscountsAndExtra, serviceChargePercentage);
    
    // 7. Calculate and add GST
    const gst = calculateGST(subtotalAfterDiscountsAndExtra + serviceCharges, gstPercentage);
    
    // 8. Add tip
    const tipAmount = parseFloat(tip) || 0;
    
    // 9. Return grand total
    return subtotalAfterDiscountsAndExtra + serviceCharges + gst + tipAmount;
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
    console.log("Rendering SelectedItemsList with items:", selectedItems.length);
    console.log("Items with isNewlyAdded flag:", selectedItems.filter(item => item.isNewlyAdded).length);
    
    return (
      <Box bg="white" borderWidth={1} borderColor="gray.200" borderRadius="md" p={3}>
        <VStack space={2}>
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontSize="md" fontWeight="bold">Selected Items</Text>
            {selectedItems.length > 0 && (
              <Badge rounded="full" colorScheme="cyan">
                {selectedItems.length}
              </Badge>
            )}
          </HStack>
          {selectedItems.map((item, index) => {
            console.log(`Item ${index} details:`, JSON.stringify({
              id: item.menu_id,
              name: item.name, 
              menu_name: item.menu_name,
              isNewlyAdded: item.isNewlyAdded,
              price: item.price,
              quantity: item.quantity
            }));
            return (
              <Box key={index} borderBottomWidth={1} borderColor="gray.200" pb={2}>
                <HStack justifyContent="space-between" alignItems="center">
                  <VStack flex={1}>
                    <Text fontWeight="bold">{item.menu_name || item.name}</Text>
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
            );
          })}
        </VStack>
      </Box>
    );
  };

  // Update the useEffect for handling existing orders
  // useEffect(() => {
  //   const loadExistingOrder = async () => {
  //     if (params?.isOccupied === "1" && params?.orderId) {
  //       try {
  //         const data = await fetchWithAuth(`${getBaseUrl()}/order_menu_details`, {
  //           method: "POST",
  //           headers: { "Content-Type": "application/json" },
  //           body: JSON.stringify({
  //             order_id: params.orderId,
  //             outlet_id: userData?.outlet_id,
  //           }),
  //         });

  //         if (data.st === 1) {
  //           const existingItems = data.data.map((item) => ({
  //             menu_id: item.menu_id?.toString(),
  //             menu_name: item.name,
  //             price: item.price,
  //             quantity: item.quantity,
  //             total_price: item.total_price,
  //             portionSize: item.half_or_full === "half" ? "Half" : "Full",
  //             specialInstructions: "",
  //           }));

  //           setSelectedItems(existingItems);
  //         }
  //       } catch (error) {
  //         console.error("Error loading existing order:", error);
  //         toast.show({
  //           description: "Error loading existing order",
  //           status: "error",
  //         });
  //       }
  //     }
  //   };

  //   if (userData?.outlet_id) {
  //     loadExistingOrder();
  //   }
  // }, [params, userData]);

  // Add this function to refresh order details


  const refreshOrderDetails = async () => {
    if (!params?.orderNumber) return;

    try {
      const orderData = await fetchOrderDetails(params.orderNumber);

      if (orderData) {
        // Get existing items with isNewlyAdded flag
        const existingNewItems = selectedItems.filter(item => item.isNewlyAdded);
        
        // Transform order data items
        const orderItems = orderData.menu_details.map((item) => ({
          menu_id: item.menu_id?.toString(),
          menu_name: item.menu_name,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity),
          total_price: parseFloat(item.menu_sub_total),
          portionSize: item.half_or_full === "half" ? "Half" : "Full",
          offer: parseFloat(item.offer || 0),
          specialInstructions: item.comment || "",
        }));

        // Merge existing new items with order items
        const mergedItems = [...orderItems];
        
        // Add new items that aren't already in the order
        existingNewItems.forEach(newItem => {
          const existingItemIndex = mergedItems.findIndex(
            item => item.menu_id === newItem.menu_id
          );
          
          if (existingItemIndex === -1) {
            // Item doesn't exist in order, add it
            mergedItems.push({
              ...newItem,
              isNewlyAdded: true
            });
          } else {
            // Item exists, update quantity if needed
            mergedItems[existingItemIndex].quantity += newItem.quantity;
            mergedItems[existingItemIndex].total_price = 
              parseFloat(mergedItems[existingItemIndex].price) * 
              mergedItems[existingItemIndex].quantity;
          }
        });

        // Update selected items with merged list
        setSelectedItems(mergedItems);

        if (orderData.order_details) {
          setServiceChargePercentage(
            parseFloat(orderData.order_details.service_charges_percent)
          );
          setGstPercentage(parseFloat(orderData.order_details.gst_percent));
          
          // Set customer details
          if (orderData.order_details.customer_name) {
            setCustomerDetails({
              customer_name: orderData.order_details.customer_name || "",
              customer_mobile: orderData.order_details.customer_mobile || "",
              customer_alternate_mobile: orderData.order_details.customer_alternate_mobile || "",
              customer_address: orderData.order_details.customer_address || "",
              customer_landmark: orderData.order_details.customer_landmark || ""
            });
          }

          // Set additional charges
          setSpecialDiscount(orderData.order_details.special_discount?.toString() || "0");
          setExtraCharges(orderData.order_details.charges?.toString() || "0");
          setTip(orderData.order_details.tip?.toString() || "0");

          // Set payment information
          if (orderData.order_details.is_paid === "paid") {
            setIsPaid(true);
            setIsComplementary(false);
            setPaymentMethod(orderData.order_details.payment_method?.toUpperCase() || "CARD");
          } else if (orderData.order_details.is_paid === "complementary") {
            setIsPaid(false);
            setIsComplementary(true);
          }
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
      const initializeScreen = async () => {
        setIsLoadingOrder(true);
        
        const hasExistingOrder = params?.isOccupied === "1" && params?.orderNumber;
        const hasNewItems = params?.orderDetails ? true : false;
        
        try {
          // Clear the selectedItems first
          setSelectedItems([]);
          
          // Load existing order if needed
          if (hasExistingOrder && userData?.outlet_id) {
            const orderData = await fetchOrderDetails(params.orderNumber);
            
            if (orderData) {
              const existingItems = orderData.menu_details.map((item) => ({
                menu_id: item.menu_id?.toString(),
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
                setServiceChargePercentage(parseFloat(orderData.order_details.service_charges_percent || 0));
                setGstPercentage(parseFloat(orderData.order_details.gst_percent || 0));
                
                if (orderData.order_details.customer_name) {
                  setCustomerDetails({
                    customer_name: orderData.order_details.customer_name || "",
                    customer_mobile: orderData.order_details.customer_mobile || "",
                    customer_alternate_mobile: orderData.order_details.customer_alternate_mobile || "",
                    customer_address: orderData.order_details.customer_address || "",
                    customer_landmark: orderData.order_details.customer_landmark || ""
                  });
                }

                setSpecialDiscount(orderData.order_details.special_discount?.toString() || "0");
                setExtraCharges(orderData.order_details.charges?.toString() || "0");
                setTip(orderData.order_details.tip?.toString() || "0");

                if (orderData.order_details.is_paid === "paid") {
                  setIsPaid(true);
                  setIsComplementary(false);
                  setPaymentMethod(orderData.order_details.payment_method?.toUpperCase() || "CARD");
                } else if (orderData.order_details.is_paid === "complementary") {
                  setIsPaid(false);
                  setIsComplementary(true);
                }
              }
            }
          }
          
          // Process new items if they exist
          if (hasNewItems && params.orderDetails) {
            try {
              const orderDetailsObj = JSON.parse(params.orderDetails);
              
              if (orderDetailsObj.menu_items?.length > 0) {
                const newItems = orderDetailsObj.menu_items.map(item => ({
                  menu_id: item.menu_id,
                  menu_name: item.name,
                  name: item.name,
                  price: parseFloat(item.price),
                  quantity: parseInt(item.quantity) || 1,
                  total_price: parseFloat(item.price) * (parseInt(item.quantity) || 1),
                  portionSize: item.portion === 'half' ? 'Half' : 'Full',
                  offer: parseFloat(item.offer) || 0,
                  specialInstructions: item.specialInstructions || "",
                  isNewlyAdded: true,
                  half_price: parseFloat(item.half_price) || 0,
                  full_price: parseFloat(item.full_price) || parseFloat(item.price),
                }));
                
                setSelectedItems(prevItems => {
                  if (!hasExistingOrder) return newItems;
                  
                  const existingItemsMap = {};
                  prevItems.forEach(item => {
                    existingItemsMap[item.menu_id] = item;
                  });
                  
                  const mergedItems = [...prevItems];
                  newItems.forEach(newItem => {
                    const existingItem = existingItemsMap[newItem.menu_id];
                    if (existingItem) {
                      existingItem.quantity += newItem.quantity;
                      existingItem.total_price = calculateItemTotal(
                        existingItem.price,
                        existingItem.quantity,
                        existingItem.offer
                      );
                    } else {
                      mergedItems.push(newItem);
                    }
                  });
                  
                  return mergedItems;
                });
              }
            } catch (error) {
              console.error("Error processing new items:", error);
            }
          }
        } catch (error) {
          console.error("Error in initializeScreen:", error);
        } finally {
          setIsLoadingOrder(false);
        }
      };

      initializeScreen();
    }, [params?.orderNumber, params?.orderDetails, userData?.outlet_id])
  );

  // Update the charges fetching useEffect
  useEffect(() => {
    const fetchCharges = async () => {
      if (chargesFetched) return;

      try {
        const [gst, serviceCharges] = await Promise.all([
          AsyncStorage.getItem("gst"),
          AsyncStorage.getItem("service_charges"),
        ]);

        if (!gst || !serviceCharges) {
          const userSession = await AsyncStorage.getItem("userSession");
          if (userSession) {
            const sessionData = JSON.parse(userSession);
            if (sessionData.gst) await AsyncStorage.setItem("gst", sessionData.gst?.toString());
            if (sessionData.service_charges) await AsyncStorage.setItem("service_charges", sessionData.service_charges?.toString());
            
            setGstPercentage(parseFloat(sessionData.gst || 0));
            setServiceChargePercentage(parseFloat(sessionData.service_charges || 0));
          }
        } else {
          setGstPercentage(parseFloat(gst));
          setServiceChargePercentage(parseFloat(serviceCharges));
        }
        
        setChargesFetched(true);
      } catch (error) {
        console.error("Error fetching charges:", error);
      }
    };

    fetchCharges();
  }, []);

  // Update handleAddItem to use the calculateItemTotal helper
  const handleAddItem = (item, selectedPortion) => {
    const portionSize = "Full"; // Always use "Full" as default
    
    setSelectedItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        prevItem => String(prevItem.menu_id) === String(item.menu_id)
      );

      if (existingItemIndex !== -1) {
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex];
        
        if (existingItem.quantity < 20) {
          existingItem.quantity += 1;
          existingItem.total_price = calculateItemTotal(
            Number(item.full_price),
            existingItem.quantity,
            Number(item.offer || 0)
          );
        }
        
        return updatedItems;
      }

      const newItem = {
        menu_id: item.menu_id,
        menu_name: item.menu_name || item.name,
        name: item.name || item.menu_name,
        price: Number(item.full_price),
        quantity: 1,
        portionSize,
        half_price: Number(item.half_price || 0),
        full_price: Number(item.full_price),
        offer: Number(item.offer || 0),
        specialInstructions: "",
        isNewlyAdded: true,
        total_price: calculateItemTotal(Number(item.full_price), 1, Number(item.offer || 0))
      };

      return [...prevItems, newItem];
    });

    // Clear search after adding
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  // Update the removeFromCart function
  const removeFromCart = (menuId, portionSize) => {
    console.log("Removing item from cart:", menuId, portionSize);
    console.log("Current items count:", selectedItems.length);
    console.log("Item to remove isNewlyAdded check:", 
      selectedItems.find(item => item.menu_id === menuId && item.portionSize === portionSize)?.isNewlyAdded);

    setSelectedItems((prevItems) => {
      const filteredItems = prevItems.filter((item) => {
        // Keep the item if:
        // 1. It's not the item we want to remove (different menu_id or portionSize)
        // 2. OR it's an existing item (not newly added)
        const shouldKeep = !(
          item.menu_id === menuId &&
          item.portionSize === portionSize &&
          item.isNewlyAdded
        );
        return shouldKeep;
      });
      console.log("Items remaining after removal:", filteredItems.length);
      return filteredItems;
    });
  };

  const initializeOrderDetails = async (orderData) => {
    console.log("Initializing order details:", orderData?.menu_details?.length);
    if (orderData?.menu_details) {
      const transformedItems = await Promise.all(
        orderData.menu_details.map(async (item) => {
          // Find the full menu item details from menuItems
          const menuItem = menuItems.find((m) => m.menu_id === item.menu_id);
          console.log("Processing menu item:", item.menu_id, item.menu_name);

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
      console.log("Transformed items count:", transformedItems.length);
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
      marginLeft={10}
      top= {1}
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
        px={0.1}
        py={0.1}
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
              fontSize="xs"
              fontWeight="medium"
              numberOfLines={1}
            >
              {params.orderType === "drive-through"
                ? "Drive Through"
                : params.orderType.charAt(0).toUpperCase() +
                  params.orderType.slice(1)}
            </Text>
          ) : (
            <>
              <Text
                color={params?.isOccupied === "1" ? "red.800" : "green.800"}
                fontSize="xs"
                fontWeight="bold"
                numberOfLines={1}
              >
                {params.sectionName} - {params.tableNumber}
              </Text>
              {params?.orderNumber && (
                <Text
                  color={params?.isOccupied === "1" ? "red.800" : "green.800"}
                  fontSize="xs"
                  fontWeight="medium"
                  numberOfLines={1}
                >
                  Bill #{params.orderNumber}
                </Text>
              )}
            </>
          )}
        </VStack>
      </Badge>
    </Box>
  );

  const calculateTotalDiscountPercentage = (items) => {
    if (items.length === 0) return 0;

    const totalAmount = items?.reduce((sum, item) => {
      const price =
        item.portionSize === "Half"
          ? Number(item.half_price || item.price)
          : Number(item.full_price || item.price);
      return sum + price * Number(item.quantity);
    }, 0);

    // Replace calculateDiscount with calculateItemDiscount
    const totalDiscount = calculateItemDiscount(items);

    return parseFloat(((totalDiscount / totalAmount) * 100).toFixed(2)) || 0;
  };

  // Update handlePrint to match handleKOT pattern exactly
  const handlePrint = async () => {
    try {
      if (selectedItems.length === 0) {
        Alert.alert("Error", "Please add items to cart before printing");
        return;
      }

      // Check printer connection first
      if (!printerConnected || !contextPrinterDevice) {
        Alert.alert(
          "Printer Not Connected",
          "You need to connect to a printer before printing.",
          [
            {
              text: "Connect Printer",
              onPress: () => {
                router.push("/profile/PrinterManagement");
              },
            },
            {
              text: "Skip Printer",
              onPress: async () => {
                try {
                  setIsProcessing(true);
                  setLoadingMessage("Creating order without printing...");
                  
                  // Create/update the order without printing
                  let orderResponse;
                  if (params?.orderId) {
                    // Update existing order and set status to "placed"
                    orderResponse = await createOrder("placed", true);
                  } else {
                    orderResponse = await createOrder("print_and_save", true);
                    if (!orderResponse?.order_id) {
                      throw new Error("Failed to create order");
                    }
                  }
                  
                  toast.show({
                    description: "Order saved successfully without printing",
                    status: "success",
                    duration: 3000,
                    placement: "bottom",
                  });
                  
                  // Navigate back to orders list after successful operation
                  router.replace({
                    pathname: "/(tabs)/tables",
                    params: {
                      refresh: Date.now()?.toString(),
                    },
                  });
                } catch (error) {
                  console.error("Order creation error:", error);
                  toast.show({
                    description: "Failed to create order",
                    status: "error",
                    duration: 3000,
                    placement: "bottom",
                  });
                } finally {
                  setIsProcessing(false);
                  setLoadingMessage("");
                }
              },
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        );
        return;
      }

      setIsProcessing(true);
      setLoadingMessage("Printing...");

      // First create/update the order
      let orderResponse;
      if (params?.orderId) {
        // Update existing order and set status to "placed"
        orderResponse = await createOrder("placed", true);  // Changed from "print" to "placed" and added returnResponse=true
      } else {
        orderResponse = await createOrder("print_and_save", true);
        if (!orderResponse?.order_id) {
          throw new Error("Failed to create order");
        }
      }

      // Continue with the rest of the printing functionality
      // Print receipt
      if (Platform.OS === "web") {
        const html = generateKOTHTML();
        await Print.printAsync({
          html,
          orientation: "portrait",
        });
      } else {
        await printReceipt(orderResponse);
      }

      toast.show({
        description: "Order printed successfully",
        status: "success",
        duration: 3000,
        placement: "bottom",
      });

      // Navigate back to orders list after successful operation
      router.replace({
        pathname: "/(tabs)/tables",
        params: {
          refresh: Date.now()?.toString(),
        },
      });
    } catch (error) {
      console.error("Print error:", error);
      
      // Check if error is related to printer connection
      if (error.message?.includes("printer") || !printerConnected || !contextPrinterDevice) {
        Alert.alert(
          "Printer Connection Error",
          "Failed to print. Would you like to check your printer connection?",
          [
            {
              text: "Go to Printer Settings",
              onPress: () => {
                router.push("/profile/PrinterManagement");
              },
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        );
      } else {
        toast.show({
          description: "Failed to print order",
          status: "error",
          duration: 3000,
          placement: "bottom",
        });
      }
    } finally {
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  // Update the scanForPrinters function to include Expo Go check
  // const scanForPrinters = async () => {
  //   try {
  //     // Check if running in Expo Go or web
  //     const isExpoGo = Constants.executionEnvironment === "storeClient";
  //     const isWeb = Platform.OS === "web";

     

  //     if (!bleManager) {
  //       Alert.alert(
  //         "Feature Not Available",
  //         "Bluetooth printing is only available in development or production builds."
  //       );
  //       return;
  //     }

  //     const hasPermissions = await requestPermissions(bleManager);
  //     if (!hasPermissions) {
  //       Alert.alert("Permission Error", "Bluetooth permissions not granted");
  //       return;
  //     }

  //     setIsScanning(true);
  //     setAvailableDevices([]);
  //     setIsModalVisible(true);

  //     bleManager.startDeviceScan(null, null, (error, device) => {
  //       if (error) {
  //         console.error("Scan error:", error);
  //         return;
  //       }
  //       if (device) {
  //         setAvailableDevices((prevDevices) => {
  //           if (!prevDevices.find((d) => d.id === device.id)) {
  //             return [...prevDevices, device];
  //           }
  //           return prevDevices;
  //         });
  //       }
  //     });
  //   } catch (error) {
  //     console.error("Scan error:", error);
  //     Alert.alert("Error", "Failed to start scanning");
  //   }
  // };

  // Update handleDeviceSelection to handle both KOT and receipt printing the same way
  const handleDeviceSelection = async (device) => {
    try {
      setIsConnecting(true);
      setConnectionStatus("Connecting...");

      const connectedDevice = await device.connect();
      const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();

      setPrinterDevice(discoveredDevice);
      setIsConnected(true);
      setConnectionStatus("Connected successfully!");

      // Add disconnect listener
      device.onDisconnected((error, disconnectedDevice) => {
        setIsConnected(false);
        setPrinterDevice(null);
        setConnectionStatus("Printer disconnected");
      });

      // After successful connection, try printing based on the current action
      setTimeout(async () => {
        setIsModalVisible(false);
        setConnectionStatus("");
        
        // Check which action triggered the connection and print accordingly
        if (loadingMessage === "Processing KOT...") {
          await printKOT();
        } else if (loadingMessage === "Printing...") {
          await printReceipt();
        }
      }, 1500);

    } catch (error) {
      console.error("Connection error:", error);
      setConnectionStatus("Connection failed");
      Alert.alert("Error", "Failed to connect to printer. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Update the sendToDevice function
  const sendToDevice = async (commands, device, isConnected) => {
    try {
      if (!device || !isConnected) {
        throw new Error("No printer connected");
      }

      // Get all services
      const services = await device.services();
      
      // Find the printer service
      const service = services.find((s) =>
        PRINTER_SERVICE_UUIDS.includes(s.uuid.toUpperCase())
      );

      if (!service) {
        throw new Error("Printer service not found");
      }

      // Get all characteristics
      const characteristics = await service.characteristics();
      
      // Find the print characteristic
      const printCharacteristic = characteristics.find((c) =>
        PRINTER_CHARACTERISTIC_UUIDS.includes(c.uuid.toUpperCase())
      );

      if (!printCharacteristic) {
        throw new Error("Printer characteristic not found");
      }

      // Add an initialization sequence at the start of each print job
      // This ensures the printer buffer is clear and ready for data
      try {
        // ESC @ command to initialize printer
        const initCommand = [0x1B, 0x40]; // ESC @
        
        // Send initialization command and wait for printer to process
        await printCharacteristic.writeWithoutResponse(
          base64.encode(String.fromCharCode(...initCommand))
        );
        
        // Allow printer to process init command
        await new Promise(resolve => setTimeout(resolve, 120));
      } catch (initError) {
        console.log("Printer init warning:", initError);
        // Continue even if init fails
      }

      // Increased chunk size for efficiency
      const CHUNK_SIZE = 200; // Increased from 150 for faster printing
      for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
        const chunk = commands.slice(i, Math.min(i + CHUNK_SIZE, commands.length));
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
        
        //? Reduced wait time between chunks for faster printing
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      
      //? Reduced final delay while still ensuring all data is processed
      await new Promise((resolve) => setTimeout(resolve, 250));
      
      console.log("All data sent successfully");
      return true;
    } catch (error) {
      console.error("Send to device error:", error);
      throw new Error(`Failed to send data to device: ${error.message}`);
    }
  };

  // Add enhanced permission checking
  const requestPermissions = async (bleManager) => {
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
  
  

  // Update the printReceipt function
  const printReceipt = async (orderData) => {
    try {
      console.log("Preparing receipt data...");

      // Check if printer is connected using PrinterContext
      if (!printerConnected || !contextPrinterDevice) {
        throw new Error("No printer connected");
      }

      // Get outlet details
      const [outletName, outletAddress, outletMobile, upiId] = await Promise.all([
        AsyncStorage.getItem("outlet_name"),
        AsyncStorage.getItem("outlet_address"),
        AsyncStorage.getItem("outlet_mobile"),
        AsyncStorage.getItem("upi_id"),
      ]);

      // Calculate totals
      const subtotal = calculateSubtotal(selectedItems);
      const itemDiscountAmount = calculateItemDiscount(selectedItems);
      const discountPercent = calculateTotalDiscountPercentage(selectedItems);
      
      // Calculate special discount and extra charges
      const specialDiscountAmount = parseFloat(specialDiscount) || 0;
      const extraChargesAmount = parseFloat(extraCharges) || 0;
      
      // Calculate subtotal after all discounts and extra charges
      const subtotalAfterDiscounts = subtotal - itemDiscountAmount - specialDiscountAmount;
      const subtotalAfterExtra = subtotalAfterDiscounts + extraChargesAmount;
      
      // Calculate service charge and GST
      const serviceAmount = calculateServiceCharges(subtotalAfterExtra, serviceChargePercentage);
      const gstAmount = calculateGST(subtotalAfterExtra + serviceAmount, gstPercentage);
      
      // Add tip amount
      const tipAmount = parseFloat(tip) || 0;
      
      // Calculate final total
      const total = subtotalAfterExtra + serviceAmount + gstAmount + tipAmount;

      // Format date
      const now = new Date();
      const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}, ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

      // Create UPI payment string
      const upiPaymentString = upiId ? 
        `upi://pay?pa=${upiId}&pn=${encodeURIComponent(outletName || "Restaurant")}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Bill #${params?.orderId || "New"}`)}` : 
        "8459719119-2@ibl";

      // Get order number with fallbacks
      const orderNumber = 
        orderData?.lists?.order_details?.order_number || // For existing orders (from API response)
        orderData?.order_number || // For new orders (from API response)
        params?.orderId || // Fallback to URL params
        "New"; 

      // Generate receipt commands
      const receiptData = [
        ...textToBytes("\x1B\x40"), // Initialize printer
        ...COMMANDS.LINE_SPACING_TIGHT, // Use tighter line spacing for entire receipt
        ...textToBytes("\x1B\x61\x01"), // Center alignment
        ...textToBytes("\x1B\x21\x08"), // Double width, double height
        ...textToBytes(`${outletName || "Restaurant"}\n`),
        ...textToBytes("\x1B\x21\x00"), // Normal text
        ...textToBytes(`${outletAddress || "Address"}\n`),
        ...textToBytes(`${outletMobile ? `+91 ${outletMobile}\n` : ""}`),

        ...textToBytes("\x1B\x61\x00"), // Left align
        ...textToBytes(`Bill Number: ${orderNumber}\n`),
        ...textToBytes(`Table: ${params?.sectionName || "Dining"}${params?.tableNumber ? ` - ${params.tableNumber}` : ''}\n`),
        ...textToBytes(`DateTime: ${orderData?.datetime || formattedDate}\n`),
        ...textToBytes("--------------------------------\n"),
        ...textToBytes("Item           Qty  Rate     Amt\n"),
        ...textToBytes("--------------------------------\n"),
      ];

      // Add items
      selectedItems.forEach((item) => {
        receiptData.push(...textToBytes(formatMenuItem(item)));
      });

      // Add totals and footer
      receiptData.push(
        ...textToBytes("--------------------------------\n"),
        ...textToBytes(formatAmountLine("Subtotal", subtotal)),
        ...textToBytes(formatAmountLine(`Discount(${discountPercent}%)`, itemDiscountAmount, "-")),
        specialDiscountAmount > 0 ? [...textToBytes(formatAmountLine("Special Discount", specialDiscountAmount, "-"))] : [],
        extraChargesAmount > 0 ? [...textToBytes(formatAmountLine("Extra Charges", extraChargesAmount, "+"))] : [],
        ...textToBytes(formatAmountLine(`Service(${serviceChargePercentage}%)`, serviceAmount, "+")),
        ...textToBytes(formatAmountLine(`GST(${gstPercentage}%)`, gstAmount, "+")),
        tipAmount > 0 ? [...textToBytes(formatAmountLine("Tip", tipAmount, "+"))] : [],
        ...textToBytes("--------------------------------\n"),
        ...textToBytes(formatAmountLine("Total", total)),
        ...textToBytes("\n"),
        ...textToBytes("\x1B\x61\x01"), // Center alignment
        ...textToBytes("------ Payment Options ------\n"),
        ...textToBytes("\x1B\x21\x00"), // Normal text
        ...textToBytes("PhonePe  GPay  Paytm  UPI\n"),
        ...generateQRCode(upiPaymentString),
        ...textToBytes("\n"),
        ...textToBytes(`Scan to Pay ${total.toFixed(2)}\n`),
        ...textToBytes("-----Thank You Visit Again!-----\n"),
        ...textToBytes("https://menumitra.com/\n"),
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper
      );

      // Use the PrinterContext's sendDataToPrinter function
      await sendDataToPrinter(receiptData);
      console.log("Receipt data sent successfully!");
    } catch (error) {
      console.error("Print receipt error:", error);
      throw error;
    }
  };

  // Add this function for thermal printing
 

  // Add KOT-specific command generator
  const generateKOTCommands = async (orderData) => {
    try {
      // Get order details with proper structure
      const orderDetails = orderData?.lists?.order_details || orderData;
    
      const orderNumber = 
        orderDetails?.order_number || 
        orderData?.order_number || 
        tableData?.order_number || 
        "New";

      const getCurrentDateTime = () => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const month = monthNames[now.getMonth()];
        const year = now.getFullYear();
        let hours = now.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        hours = String(hours).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
      };
      
      const [storedOutletName, storedOutletAddress, storedOutletNumber] = 
        await Promise.all([
          AsyncStorage.getItem("outlet_name"),
          AsyncStorage.getItem("outlet_address"),
          AsyncStorage.getItem("outlet_mobile"), 
        ]);
      
      const outletName = storedOutletName || "Restaurant";
      const outletAddress = storedOutletAddress || "";
      const outletNumber = storedOutletNumber || "";
      const getDottedLine = () => "-------------------------------\n";

      // Check if this is an existing order
      const isExistingOrder = Boolean(tableData?.order_id);
      
      // Get list of items to print based on whether it's a new or existing order
      let itemsToPrint = [];
      let totalQuantityToPrint = 0;
      
      console.log("Items for KOT:", selectedItems.map(item => 
        `${item.name || item.menu_name}: ${item.quantity} (${item.isNewItem ? 'new' : 'existing'}, orig: ${item.originalQuantity || 0})`
      ));
      
      if (isExistingOrder) {
        console.log("Existing order detected. Preparing incremental KOT");
        
        // Extract items with their isNewItem and other flags
        let hasChanges = false;
        
        itemsToPrint = selectedItems.map(item => {
          const currentQty = parseInt(item.quantity) || 0;
          const originalQty = parseInt(item.originalQuantity) || 0;
          
          // For new items
          if (item.isNewItem === true) {
            console.log(`Including new item: ${item.name || item.menu_name}, Qty: ${item.quantity}`);
            hasChanges = true;
            return {
              ...item,
              isNewItem: true,
              isQuantityChange: false
            };
          }
          
          // For items with increased quantities
          if (currentQty > originalQty) {
            const diff = currentQty - originalQty;
            console.log(`Including changed quantity item: ${item.name || item.menu_name}, Original: ${originalQty}, Current: ${currentQty}, Diff: ${diff}`);
            hasChanges = true;
            return {
              ...item,
              quantity: diff,
              isNewItem: false,
              isQuantityChange: true
            };
          }
          
          return null;
        }).filter(Boolean);
        
        if (!hasChanges || itemsToPrint.length === 0) {
          console.log("No changes detected. Printing all items from existing order");
          itemsToPrint = selectedItems.map(item => ({
            ...item,
            isExistingReprint: true
          }));
        }
          
        totalQuantityToPrint = itemsToPrint?.reduce((sum, item) => 
          sum + (parseInt(item.quantity) || 0), 0
        );
      } else {
        console.log("New order detected. Printing all items");
        itemsToPrint = selectedItems;
        totalQuantityToPrint = selectedItems?.reduce((sum, item) => 
          sum + (parseInt(item.quantity) || 0), 0
        );
      }
      
      const kotHeader = isExistingOrder 
        ? (itemsToPrint.some(item => item.isExistingReprint) 
            ? "*** REPRINT KOT ***\n\n" 
            : "*** ADDITIONAL KOT ***\n\n")
        : "*** KOT ***\n\n";

      return [
        ...textToBytes("\x1B\x40"),
        ...textToBytes("\x1B\x61\x01"),
        ...textToBytes("\x1B\x21\x10"),
        ...textToBytes(kotHeader),
        ...textToBytes(`${outletName}\n`),
        ...textToBytes("\x1B\x21\x00"),
        ...textToBytes(`${outletAddress}\n`),
        ...textToBytes(`${outletNumber}\n\n`),
        
        ...textToBytes("\x1B\x61\x00"),
        ...textToBytes(`Bill no: ${orderNumber}\n`),
        ...textToBytes(
          orderType === "dine-in"
            ? `Table: ${tableData?.section || tableData?.section_name || tableSectionName} - ${tableData?.table_number || tableNumber}\n`
            : `Type: ${orderType?.toUpperCase()}\n`
        ),
        ...textToBytes(`DateTime: ${getCurrentDateTime()}\n`),
        
        ...(customerDetails?.name ? [textToBytes(`Name: ${customerDetails.name}\n`)] : []),
        
        ...textToBytes(getDottedLine()),
        ...textToBytes("Item                    Qty\n"),
        ...textToBytes(getDottedLine()),
        
        ...itemsToPrint.map(item => {
          const name = item.name || item.menu_name || "";
          const qty = item.quantity?.toString() || "";
          
          let prefix = "";
          if (isExistingOrder && !item.isExistingReprint) {
            if (item.isNewItem) {
              prefix = "+ ";  // Add prefix for new items
            } else if (item.isQuantityChange) {
              prefix = "^ ";  // Add prefix for quantity changes
            }
          }
          
          let itemText = "";
          if ((prefix + name).length > 23) {
            const prefixLength = prefix.length;
            const firstLineMaxLength = 23 - prefixLength;
            const restMaxLength = 23;
            
            let lines = [];
            let remaining = name;
            
            lines.push(`${prefix}${remaining.substring(0, firstLineMaxLength)}`);
            remaining = remaining.substring(firstLineMaxLength);
            
            while (remaining.length > 0) {
              lines.push(remaining.substring(0, restMaxLength));
              remaining = remaining.substring(restMaxLength);
            }
            
            itemText = lines
              .map((line, index) =>
                index === 0
                  ? `${line.padEnd(23)} ${qty}\n`
                  : `${' '.repeat(prefixLength)}${line.padEnd(23 - prefixLength)}\n`
              )
              .join("");
          } else {
            itemText = `${prefix}${name.padEnd(23 - prefix.length)} ${qty}\n`;
          }

          if (item.portion && item.portion !== "full") {
            itemText += `   (${item.portion})\n`;
          }
          if (item.specialInstructions) {
            itemText += `   Note: ${item.specialInstructions}\n`;
          }

          return textToBytes(itemText);
        }).flat(),
        
        ...textToBytes(getDottedLine()),
        ...textToBytes(`${"Total Items:".padEnd(23)} ${totalQuantityToPrint}\n`),
        ...textToBytes("\n"),
        ...textToBytes("\x1D\x56\x42\x40"),
      ];
    } catch (error) {
      console.error("Error generating KOT commands:", error);
      throw error;
    }
  };

  // Add this function to generate receipt HTML
  

  // Add this function to generate KOT HTML

  // Add this component for the device selection modal
  const DeviceSelectionModal = ({ visible, devices, onSelect, onClose }) => {
    return (
      <Modal
        isOpen={visible}
        onClose={() => {
          onClose();
          setConnectionStatus("");
        }}
      >
        <Modal.Content maxW="90%" maxH="80%">
          <Modal.Header>
            <HStack justifyContent="space-between" alignItems="center" w="100%">
              <Text fontSize="lg" fontWeight="bold">
                Select Printer Device
              </Text>
              <IconButton
                icon={<Icon as={MaterialIcons} name="refresh" size="sm" />}
                onPress={() => {
                  setAvailableDevices([]);
                  bleManager?.stopDeviceScan();
                  scanForPrinters();
                  setConnectionStatus("");
                }}
                borderRadius="full"
                _icon={{
                  color: "blue.500",
                }}
              />
            </HStack>
          </Modal.Header>

          <Modal.Body>
            <VStack space={4}>
              {/* Connection Status */}
              {connectionStatus && (
                <Box
                  p={3}
                  borderRadius="md"
                  bg={
                    connectionStatus.includes("success")
                      ? "success.100"
                      : connectionStatus === "Connecting..."
                      ? "blue.100"
                      : "error.100"
                  }
                >
                  <Text
                    textAlign="center"
                    color={
                      connectionStatus.includes("success")
                        ? "success.700"
                        : connectionStatus === "Connecting..."
                        ? "blue.700"
                        : "error.700"
                    }
                    fontWeight="medium"
                  >
                    {connectionStatus}
                  </Text>
                </Box>
              )}

              {/* Scanning Indicator */}
              {isScanning && (
                <HStack space={2} justifyContent="center" alignItems="center">
                  <Spinner color="blue.500" />
                  <Text color="blue.500">Scanning for devices...</Text>
                </HStack>
              )}

              {/* Device List */}
              <ScrollView>
                <VStack space={2}>
                  {devices.length > 0 ? (
                    devices.map((device) => (
                      <Pressable
                        key={device.id}
                        onPress={() => onSelect(device)}
                        disabled={isConnecting}
                        opacity={isConnecting ? 0.5 : 1}
                      >
                        <Box
                          p={4}
                          bg="gray.100"
                          borderRadius="md"
                          borderWidth={1}
                          borderColor="gray.200"
                        >
                          <VStack>
                            <Text fontSize="md" fontWeight="600">
                              {device.name || "Unknown Device"}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {device.id}
                            </Text>
                          </VStack>
                        </Box>
                      </Pressable>
                    ))
                  ) : (
                    <Box py={10}>
                      <Text textAlign="center" color="gray.500">
                        {isScanning ? "Searching for devices..." : "No devices found"}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </ScrollView>
            </VStack>
          </Modal.Body>

          <Modal.Footer>
            <Button
              w="full"
              onPress={onClose}
              variant="subtle"
              colorScheme="blue"
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    );
  };

  const [connectionStatus, setConnectionStatus] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Add this state variable for controlling the additional options panel
  // const [isAdditionalOptionsOpen, setIsAdditionalOptionsOpen] = useState(false);

  const createOrder = async (orderStatus, returnResponse = false) => {
    try {
      if (selectedItems.length === 0) {
        toast.show({
          description: "Please add items to the order",
          status: "warning"
        });
        return;
      }

      const [storedUserId, storedOutletId] = await Promise.all([
        AsyncStorage.getItem("user_id"),
        AsyncStorage.getItem("outlet_id"),
      ]);

      if (!storedUserId || !storedOutletId) {
        throw new Error("Missing required information");
      }

      // If this is a new order for a table, check if the table is already occupied
      if (!params?.orderId && params?.tableNumber && params?.isOccupied !== "1") {
        try {
          const tableCheckResponse = await axiosInstance.post(
            onGetProductionUrl() + "check_table_is_reserved",
            {
              outlet_id: storedOutletId?.toString(),
              table_number: params.tableNumber?.toString(),
              section_id: params.sectionId?.toString(),
            }
          );
          
          if (tableCheckResponse.data.st === 0) {
            throw new Error(`Table ${params.tableNumber} is currently occupied`);
          }
        } catch (tableCheckError) {
          console.error("Table check error:", tableCheckError);
          if (tableCheckError.message?.includes("currently occupied")) {
            toast.show({
              description: `Table ${params.tableNumber} is already occupied. Please select another table.`,
              status: "error",
              duration: 4000,
              placement: "bottom",
            });
            throw tableCheckError;
          }
          // If it's some other error with the check, continue with order creation
          console.warn("Table check failed, proceeding with order creation:", tableCheckError.message);
        }
      }

      const orderItems = selectedItems.map((item) => ({
        menu_id: item.menu_id?.toString(),
        quantity: parseInt(item.quantity) || 1,
        comment: item.specialInstructions || "",
        half_or_full: (item.portionSize || "full").toLowerCase(),
        price: parseFloat(item.price) || 0,
        total_price: parseFloat(item.total_price) || 0,
      }));

      // Process payment and complementary statuses
      const paymentStatus = isPaid ? "paid" : (isComplementary ? "complementary" : "unpaid");
      const effectivePaymentMethod = isPaid ? selectedPaymentMethod.toLowerCase() : "";

      const orderData = {
        user_id: storedUserId?.toString(),
        outlet_id: storedOutletId?.toString(),
        order_type: params?.isSpecialOrder ? params.orderType : "dine-in",
        order_items: orderItems,
        grand_total: calculateGrandTotal(
          selectedItems,
          specialDiscount,
          extraCharges,
          serviceChargePercentage,
          gstPercentage,
          tip
        )?.toString(),
        action: orderStatus,
        is_paid: paymentStatus,
        payment_method: effectivePaymentMethod,
        special_discount: specialDiscount?.toString(),
        charges: extraCharges?.toString(),
        tip: tip?.toString(),
        customer_name: customerDetails.customer_name || "",
        customer_mobile: customerDetails.customer_mobile || "",
        customer_alternate_mobile: customerDetails.customer_alternate_mobile || "",
        customer_address: customerDetails.customer_address || "",
        customer_landmark: customerDetails.customer_landmark || "",
      };

      if (!params?.isSpecialOrder) {
        if (!params.tableNumber || !params.sectionId) {
          throw new Error("Missing table or section information for dine-in order");
        }
        orderData.tables = [params.tableNumber?.toString()];
        orderData.section_id = params.sectionId?.toString();
      }

      const endpoint = params?.orderId ? 
        onGetProductionUrl() + "update_order" : 
        onGetProductionUrl() + "create_order";

      if (params?.orderId) {
        orderData.order_id = params.orderId;
      }

      console.log(`Making request to ${endpoint}`);
      const response = await axiosInstance.post(endpoint, orderData);
      
      // Log whole response
      console.log(`${orderStatus} Response:`, response.data);

      if (response.data.st !== 1) {
        throw new Error(response.data.msg || "Failed to process order");
      }

      if (returnResponse) {
        return response.data;
      }

      toast.show({
        description: `Order ${params?.orderId ? "updated" : "created"} successfully`,
        status: "success",
        duration: 3000,
      });

      return true;
    } catch (error) {
      console.error(`${orderStatus} Error:`, error);
      
      if (error.message?.includes("currently occupied")) {
        toast.show({
          description: `Table is already occupied. Please select another table.`,
          status: "error",
          duration: 4000,
          placement: "bottom",
        });
      } else {
        if (!returnResponse) {
          toast.show({
            description: error.response?.data?.msg || error.message || "Failed to process order",
            status: "error",
            duration: 3000,
          });
        }
      }
      
      if (returnResponse) {
        throw error;
      }
      return false;
    }
  };

  // Add a useEffect to track selectedItems changes
  useEffect(() => {
    console.log("selectedItems state changed - new count:", selectedItems.length);
    if (selectedItems.length > 0) {
      console.log("First few items:", JSON.stringify(selectedItems.slice(0, 3)));
    }
  }, [selectedItems]);

  const handleForceCancel = async () => {
    try {
      if (!params?.orderId) {
        toast.show({
          description: "No order to cancel",
          status: "warning"
        });
        return;
      }

      const storedUserId = await AsyncStorage.getItem("user_id");
      if (!storedUserId) {
        toast.show({
          description: "User ID not found",
          status: "error"
        });
        return;
      }

      const response = await fetchWithAuth(`${getBaseUrl()}/force_cancel_order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: params.orderId,
          user_id: storedUserId
        })
      });

      if (response.st === 1) {
        toast.show({
          description: "Order cancelled successfully",
          status: "success"
        });
        router.replace("/(tabs)/tables/sections");
      } else {
        toast.show({
          description: response.msg || "Failed to cancel order",
          status: "error"
        });
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.show({
        description: "Failed to cancel order",
        status: "error"
      });
    }
  };


  

  return (
    <Box flex={1} bg="white" safeArea>
      <Header
        title={params?.orderId ? "Update Order" : "Create Order"}
        onBackPress={() => router.replace({
          pathname: "/screens/orders/menu-selection",
          params: {
            tableId: params.tableId,
            tableNumber: params.tableNumber,
            sectionId: params.sectionId,
            sectionName: params.sectionName,
            outletId: params.outletId,
            orderId: params.orderId,
            orderNumber: params.orderNumber,
            orderType: params.orderType || "dine-in",
            orderDetails: JSON.stringify({
              order_id: params.orderId,
              menu_items: selectedItems,
              grand_total: calculateTotal(selectedItems, serviceChargePercentage, gstPercentage),
              table_id: params.tableId,
              table_number: params.tableNumber,
              section_id: params.sectionId,
              section_name: params.sectionName,
              outlet_id: params.outletId,
            }),
          },
        })}
        rightComponent={
          <Box position="absolute" right={-5} top={-2}>
            <OrderBadge />    
          </Box>
          
        }
        
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
            
            {/* Add More Items Button */}
            <Button
              mb={2}
              leftIcon={<Icon as={MaterialIcons} name="add-shopping-cart" size="sm" color="white" />}
              bg="cyan.500"
              _text={{ color: "white", fontWeight: "semibold" }}
              _pressed={{ bg: "cyan.600" }}
              onPress={() => router.replace({
                pathname: "/screens/orders/menu-selection",
                params: {
                  tableId: params.tableId,
                  tableNumber: params.tableNumber,
                  sectionId: params.sectionId,
                  sectionName: params.sectionName,
                  outletId: params.outletId,
                  orderId: params.orderId,
                  orderNumber: params.orderNumber,
                  orderType: params.orderType || "dine-in",
                  orderDetails: JSON.stringify({
                    order_id: params.orderId,
                    menu_items: selectedItems,
                    grand_total: calculateTotal(selectedItems, serviceChargePercentage, gstPercentage),
                    table_id: params.tableId,
                    table_number: params.tableNumber,
                    section_id: params.sectionId,
                    section_name: params.sectionName,
                    outlet_id: params.outletId,
                  }),
                },
              })}
            >
              Add More Items
            </Button>
            
            {/* Customer Details Section */}
            <HStack space={2} mt={1} mb={1}>
             
              <Input
                flex={1}
                placeholder="Customer Name"
                value={customerDetails.customer_name}
                onChangeText={(text) => handleCustomerDetailsChange("customer_name", text)}
                borderColor="gray.300"
                bg="white"
                fontSize="sm"
              />
              <Input
                flex={1}
                placeholder="Mob no."
                value={customerDetails.customer_mobile}
                onChangeText={(text) => handleCustomerDetailsChange("customer_mobile", text)}
                keyboardType="numeric"
                maxLength={10}
                borderColor={customerDetails.customer_mobile && customerDetails.customer_mobile.length !== 10 ? "red.500" : "gray.300"}
                bg="white"
                fontSize="sm"
                InputRightElement={
                  customerDetails.customer_mobile && customerDetails.customer_mobile.length !== 10 ? (
                    <Icon
                      as={MaterialIcons}
                      name="error"
                      size="sm"
                      color="red.500"
                      mr={2}
                    />
                  ) : null
                }
              />
              <IconButton
                icon={<Icon as={MaterialIcons} name="add" size="sm" color="gray.600" />}
                borderRadius="md"
                bg="gray.100"
                borderWidth={1}
                borderColor="gray.300"
                onPress={() => setShowCustomerDetailsModal(true)}
              />
            </HStack>

            <Box flex={1}>
              <ScrollView
                flex={1}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{
                  paddingBottom: selectedItems.length > 0 ? 30 : 20,
                }}
                nestedScrollEnabled={true}
              >
                <VStack space={2} mb={selectedItems.length > 0 ? 280 : 0}>
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
                                  borderColor="gray.300"
                                  icon={
                                    <MaterialIcons
                                      name="remove"
                                      size={16}
                                      color="gray"
                                    />
                                  }
                                  size="xs"
                                  variant="outline"
                                  borderRadius="sm"
                                  bg="white"
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
                                  borderColor="gray.300"
                                  icon={
                                    <MaterialIcons
                                      name="add"
                                      size={16}
                                      color="gray"
                                    />
                                  }
                                  size="xs"
                                  variant="outline"
                                  borderRadius="sm"
                                  bg="white"
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
              <>
                {/* Card 1: Additional options/charges card */}
                <Box
                  position="fixed"
                  bottom={205}
                  bg="white"
                  borderWidth={1}   
                  borderColor="gray.200"
                  borderRadius="xl"
                  overflow="hidden"
                  shadow={1}
                  mb={8}
                  zIndex={1}
                >
                  <Pressable onPress={() => setIsAdditionalOptionsOpen(!isAdditionalOptionsOpen)}>
                    <Box py={2} borderBottomWidth={0}>
                      <Icon 
                        as={MaterialIcons} 
                        name={isAdditionalOptionsOpen ? "keyboard-arrow-down" : "keyboard-arrow-up"}
                        size="sm" 
                        alignSelf="center"
                        color="gray.500" 
                      />
                    </Box>
                  </Pressable>

                  {isAdditionalOptionsOpen && (
                    <Box p={4} pt={2}>
                      <VStack space={4}>
                        <HStack space={4} justifyContent="space-between">
                          <VStack flex={1}>
                            <Text fontSize="sm" color="gray.600" mb={1}>Special Discount</Text>
                            <Input 
                              value={specialDiscount || "0"}
                              onChangeText={setSpecialDiscount}
                              textAlign="center"
                              keyboardType="numeric"
                              borderRadius="md"
                              borderColor="gray.300"
                              h={10}
                              fontSize="md"
                            />
                          </VStack>
                          
                          <VStack flex={1}>
                            <Text fontSize="sm" color="gray.600" mb={1}>Extra Charges</Text>
                            <Input 
                              value={extraCharges || "0"}
                              onChangeText={setExtraCharges}
                              textAlign="center"
                              keyboardType="numeric" 
                              borderRadius="md"
                              borderColor="gray.300"
                              h={10}
                              fontSize="md"
                            />
                          </VStack>
                          
                          <VStack flex={1}>
                            <Text fontSize="sm" color="gray.600" mb={1}>Tip</Text>
                            <Input 
                              value={tip || "0"}
                              onChangeText={setTip}
                              textAlign="center"
                              keyboardType="numeric"
                              borderRadius="md"
                              borderColor="gray.300"
                              h={10}
                              fontSize="md"
                            />
                          </VStack>
                        </HStack>
                        
                        <HStack justifyContent="space-between" alignItems="center">
                          {!isPaid && (
                            <Checkbox 
                              colorScheme="blue" 
                              isChecked={isComplementary}
                              onChange={setIsComplementary}
                              borderRadius="sm" 
                              size="md"
                            >
                              <Text fontSize="sm">Complementary</Text>
                            </Checkbox>
                          )}
                          
                          {isPaid && (
                            <HStack space={4} flex={1}>
                              <Radio.Group 
                                name="paymentMethod" 
                                value={paymentMethod} 
                                onChange={setPaymentMethod}
                              >
                                <HStack space={4}>
                                  <Radio value="CASH" size="sm">
                                    <Text fontSize="sm">CASH</Text>
                                  </Radio>
                                  <Radio value="UPI" size="sm">
                                    <Text fontSize="sm">UPI</Text>
                                  </Radio>
                                  <Radio value="CARD" size="sm">
                                    <Text fontSize="sm">CARD</Text>
                                  </Radio>
                                </HStack>
                              </Radio.Group>
                            </HStack>
                          )}
                          
                          <Checkbox 
                            colorScheme="blue" 
                            isChecked={isPaid}
                            onChange={(newValue) => {
                              setIsPaid(newValue);
                              if (newValue) {
                                setIsComplementary(false);
                              }
                            }}
                            borderRadius="sm" 
                            size="md"
                          >
                            <Text fontSize="sm">Paid</Text>
                          </Checkbox>
                        </HStack>
                      </VStack>
                    </Box>
                  )}
                </Box>

                {/* Card 2: Price summary row */}
                <Box 
                  position="absolute"
                  bottom={125}
                  left={4}
                  right={4}
                  bg="white" 
                  borderWidth={1}
                  borderColor="gray.200"
                  borderRadius="xl"
                  overflow="hidden"
                  shadow={1}
                  p={3}
                  mb={3}
                  zIndex={10}
                >
                  <HStack space={0.5} justifyContent="space-between">
                    <VStack flex={1} alignItems="center">
                      <Text fontSize="13px" fontWeight="semibold" color="black">₹{calculateSubtotal(selectedItems).toFixed(2)}</Text>
                      <Text fontSize="xs" color="gray.500">Items Total</Text>
                    </VStack>

                    <VStack flex={1} alignItems="center">
                      <Text fontSize="13px" fontWeight="semibold" color="red.500">-₹{calculateItemDiscount(selectedItems).toFixed(2)}</Text>
                      <Text fontSize="xs" color="gray.500">Item Disc({specialDiscount}%)</Text>
                    </VStack>

                    <VStack flex={1} alignItems="center">
                      <Text fontSize="13px" fontWeight="semibold" color="black">+₹{calculateServiceCharges(
                        calculateTotalAfterDiscounts(selectedItems, specialDiscount) + parseFloat(extraCharges || 0),
                        serviceChargePercentage
                      ).toFixed(2)}</Text>
                      <Text fontSize="xs" color="gray.500">Service ({serviceChargePercentage}%)</Text>
                    </VStack>

                    <VStack flex={1} alignItems="center">
                      <Text fontSize="13px" fontWeight="semibold" color="black">+₹{calculateGST(
                        calculateTotalAfterDiscounts(selectedItems, specialDiscount) + 
                        parseFloat(extraCharges || 0) + 
                        calculateServiceCharges(
                          calculateTotalAfterDiscounts(selectedItems, specialDiscount) + parseFloat(extraCharges || 0),
                          serviceChargePercentage
                        ),
                        gstPercentage
                      ).toFixed(2)}</Text>
                      <Text fontSize="xs" color="gray.500">GST({gstPercentage}%)</Text>
                    </VStack>

                    <VStack flex={1} alignItems="center">
                      <Text fontSize="13px" fontWeight="semibold" color="green.500">₹{calculateGrandTotal(
                        selectedItems,
                        specialDiscount,
                        extraCharges,
                        serviceChargePercentage,
                        gstPercentage,
                        tip
                      ).toFixed(2)}</Text>
                      <Text fontSize="xs" color="gray.500">Grand Total</Text>
                    </VStack>
                  </HStack>
                </Box>
              </>
            )}

            {selectedItems.length > 0 && (
              <Box
                position="absolute"
                bottom={0}
                left={0}
                right={0}
                bg="white"
                px={4}
                py={4}
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
                {/* Updated button layout to match screenshot */}
                <VStack space={3}>
                  <HStack space={3} justifyContent="space-between">
                    <Button
                      flex={1}
                      bg="#FF9800"
                      leftIcon={<Icon as={MaterialIcons} name="print" size="sm" color="white" />}
                      _text={{ color: "white", fontWeight: "semibold" }}
                      onPress={handlePrint}
                      borderRadius="md"
                      py={2.5}
                      height={12}
                    >
                      Print & Save
                    </Button>

                  <Button
                    flex={1}
                    bg="black"
                      _text={{ color: "white", fontWeight: "semibold" }}
                    onPress={handleKOT}
                      borderRadius="md"
                      py={2.5}
                      height={12}
                    >
                      <HStack space={2} alignItems="center">
                        <Icon as={MaterialIcons} name="receipt" size="sm" color="white" />
                        <Text color="white" fontWeight="semibold">KOT</Text>
                      </HStack>
                  </Button>

                  <Button
                    flex={1}
                      bg="blue.500"
                      _text={{ color: "white", fontWeight: "semibold" }}
                      onPress={handleSettleOrder}  // Updated to use new handler
                      borderRadius="md"
                      py={2.5}
                      height={12}
                    >
                      <HStack space={2} alignItems="center">
                        <Icon as={MaterialIcons} name="check-circle" size="sm" color="white" />
                        <Text color="white" fontWeight="semibold">Settle</Text>
                      </HStack>
                    </Button>
                  </HStack>
                  
                  <HStack space={3} justifyContent="space-between">
                    <Button
                      flex={5}
                      bg="black"
                      _text={{ color: "white", fontWeight: "semibold" }}
                      onPress={() => {handleKOTAndSave();}}
                      borderRadius="md"
                      py={2.5}
                      height={12}
                    >
                      <HStack space={2} alignItems="center">
                        <Icon as={MaterialIcons} name="receipt" size="sm" color="white" />
                        <Text color="white" fontWeight="semibold">KOT & Save</Text>
                      </HStack>
                    </Button>

                    {params?.isOccupied === "1" && params?.orderId && (
                      <Button
                        flex={1}
                        bg="red.500"
                        _text={{ color: "white", fontWeight: "semibold" }}
                        onPress={handleForceCancel}
                        borderRadius="md"
                        py={2.5}
                        height={12}
                      >
                        <Icon as={MaterialIcons} name="close" size="sm" color="white" />
                      </Button>
                    )}
                  </HStack>
                </VStack>
              </Box>
            )}
          </VStack>
        </KeyboardAvoidingView>
      )}

      {/* Customer Details Modal */}
      <Modal isOpen={showCustomerDetailsModal} onClose={() => setShowCustomerDetailsModal(false)}>
        <Modal.Content maxW="90%">
          <Modal.Header>
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontSize="lg" fontWeight="bold">Additional Customer Details</Text>
              <IconButton 
                icon={<Icon as={MaterialIcons} name="close" size="sm" color="gray.500" />} 
                onPress={() => setShowCustomerDetailsModal(false)}
              />
            </HStack>
          </Modal.Header>
          <Modal.Body>
            <VStack space={3}>
              <FormControl>
                <FormControl.Label>Alternate Mobile</FormControl.Label>
                <Input
                  value={customerDetails.customer_alternate_mobile}
                  onChangeText={(text) => handleCustomerDetailsChange("customer_alternate_mobile", text)}
                  keyboardType="numeric"
                  maxLength={10}
                  borderColor={
                    customerDetails.customer_alternate_mobile && 
                    customerDetails.customer_alternate_mobile.length !== 10 ? 
                    "red.500" : "gray.300"
                  }
                  InputRightElement={
                    customerDetails.customer_alternate_mobile && 
                    customerDetails.customer_alternate_mobile.length !== 10 ? (
                      <Icon
                        as={MaterialIcons}
                        name="error"
                        size="sm"
                        color="red.500"
                        mr={2}
                      />
                    ) : null
                  }
                />
                {customerDetails.customer_alternate_mobile && 
                 customerDetails.customer_alternate_mobile.length !== 10 && (
                  <FormControl.HelperText color="red.500">
                    Mobile number must be 10 digits
                  </FormControl.HelperText>
                )}
              </FormControl>
              
              <FormControl>
                <FormControl.Label>Address</FormControl.Label>
                <Input
                  value={customerDetails.customer_address}
                  onChangeText={(text) => handleCustomerDetailsChange("customer_address", text)}
                  multiline
                  numberOfLines={3}
                  h={20}
                  textAlignVertical="top"
                />
              </FormControl>
              
              <FormControl>
                <FormControl.Label>Landmark</FormControl.Label>
                <Input
                  value={customerDetails.customer_landmark}
                  onChangeText={(text) => handleCustomerDetailsChange("customer_landmark", text)}
                />
              </FormControl>
            </VStack>
          </Modal.Body>
          <Modal.Footer>
            <Button.Group space={2}>
              <Button 
                variant="ghost" 
                colorScheme="blueGray" 
                onPress={() => setShowCustomerDetailsModal(false)}
              >
                Cancel
              </Button>
              <Button 
                colorScheme="blue" 
                onPress={() => setShowCustomerDetailsModal(false)}
              >
                Save
              </Button>
            </Button.Group>
          </Modal.Footer>
        </Modal.Content>
      </Modal>

      {isProcessing && (
        <>
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
        </>
      )}

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

      {/* Payment Selection Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} size="lg">
        <Modal.Content maxW="400px">
          <Modal.CloseButton />
          <Modal.Body py={6}>
            <VStack space={4}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="lg" fontWeight="bold">
                  Table: {params?.tableNumber || "4"}
                </Text>
                <Text fontSize="lg" fontWeight="bold">
                  Bill no: {params?.orderId || "141"}
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="green.500">
                  ₹{calculateGrandTotal(
                    selectedItems,
                    specialDiscount,
                    extraCharges,
                    serviceChargePercentage,
                    gstPercentage,
                    tip
                  ).toFixed(2)}
                </Text>
              </HStack>

              <Text fontSize="lg" fontWeight="semibold" mb={2}>
                Select Payment Method
              </Text>

              <Radio.Group
                name="paymentMethod"
                value={selectedPaymentMethod}
                onChange={setSelectedPaymentMethod}
              >
                <HStack space={6} flexWrap="wrap">
                  <Radio value="CASH" size="lg" isDisabled={!isPaidChecked}>
                    <Text fontSize="md">CASH</Text>
                  </Radio>
                  <Radio value="UPI" size="lg" isDisabled={!isPaidChecked}>
                    <Text fontSize="md">UPI</Text>
                  </Radio>
                  <Radio value="CARD" size="lg" isDisabled={!isPaidChecked}>
                    <Text fontSize="md">CARD</Text>
                  </Radio>
                </HStack>
              </Radio.Group>

              <Divider my={2} />

              <HStack alignItems="center" space={2}>
                <Checkbox
                  value="paid"
                  isChecked={isPaidChecked}
                  onChange={(isChecked) => {
                    setIsPaidChecked(isChecked);
                    // Reset payment method if unchecking paid
                    if (!isChecked) {
                      setSelectedPaymentMethod("CASH");
                    }
                  }}
                  size="lg"
                >
                  <Text fontSize="md">Paid</Text>
                </Checkbox>
              </HStack>

              <Button
                mt={4}
                size="lg"
                bg={isPaidChecked ? "blue.500" : "coolGray.400"}
                _pressed={{ bg: isPaidChecked ? "blue.600" : "coolGray.500" }}
                onPress={loadingMessage.includes("KOT") ? handlePaymentConfirm : handleSettlePaymentConfirm}
                isDisabled={!isPaidChecked}
                _disabled={{
                  bg: "coolGray.400",
                  opacity: 0.5
                }}
              >
                Settle
              </Button>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
      <Toast />
    </Box>
  );
}
