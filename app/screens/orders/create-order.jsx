import React, { useState, useEffect, useRef, useCallback } from "react";
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
  PermissionsAndroid,
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
import Constants from "expo-constants";
import base64 from "react-native-base64";
import { fetchWithAuth } from "../../../utils/apiInterceptor";
import { usePrinter } from "../../../context/PrinterContext";
import axios from "axios";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import PaymentModal from "../../components/PaymentModal";

// Helper function to get the API base URL with trailing slash
const onGetProductionUrl = () => {
  const baseUrl = getBaseUrl();
  // Ensure the URL ends with a slash
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
};

// Create axios instance with default config
const axiosInstance = axios.create({
  timeout: 15000, // 15 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to attach auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const accessToken = await AsyncStorage.getItem("access");
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    } catch (error) {
      console.error("Error in axios interceptor:", error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

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
  LINE_SPACING: [ESC, "3", 24], //? Reduced from 30 to 24 for tighter line spacing
  LINE_SPACING_TIGHT: [ESC, "3", 18], // Even tighter spacing for itemized sections ?(reduced from 24)
  LINE_SPACING_NORMAL: [ESC, "3", 30], // Normal spacing ?(reduced from 40)
  CUT_PAPER: [GS, "V", 1],
  MARGIN_BOTTOM: [ESC, "O", 1], //? Reduced bottom margin from 3 to 1
};

const getCurrentDate = () => {
  const date = new Date();

  // Get date in DD-MMM-YYYY format
  const formattedDate = date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, "-");

  // Get time in 12-hour format
  let hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  hours = String(hours).padStart(2, "0");

  // Get minutes
  const minutes = String(date.getMinutes()).padStart(2, "0");

  // Return formatted date and time
  return `${formattedDate} ${hours}:${minutes} ${ampm}`;
};

// Create a top-level function for consistent datetime formatting
const getCurrentDateTime = () => {
  const now = new Date();

  // Get the day as 2-digit
  const day = String(now.getDate()).padStart(2, "0");

  // Get the month name in uppercase
  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const month = monthNames[now.getMonth()];

  // Get the year
  const year = now.getFullYear();

  // Get hours and format for 12-hour clock
  let hours = now.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  hours = String(hours).padStart(2, "0");

  // Get minutes
  const minutes = String(now.getMinutes()).padStart(2, "0");

  // Format the final date string
  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
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

    // Get hours and minutes
    const hours = timeParts[0];
    const minutes = timeParts[1];

    // Return formatted date and time
    return `${date} ${hours}:${minutes} ${meridiem}`;
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

const safeNumberToString = (value) => {
  if (value === null || value === undefined) return "0";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  return "0";
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "₹0.00";
  return `₹${parseFloat(amount).toFixed(2)}`;
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

  // FIXED: Adjust column widths for 58mm printer (max 30-32 chars per line)
  // Standard 58mm printer can fit 30-32 characters per line
  // Format: name (12 chars), qty (2 chars), rate (4 chars), total (7 chars)
  // 12 + 2 + 4 + 7 + spaces = approx 28 chars total

  // Special handling for long item names
  if (name.length > 12) {
    const lines = splitLongText(name, 12);
    // First line contains the item name, qty, rate, and amount
    const firstLine = `${lines[0].padEnd(12)} ${qty.padStart(
      2
    )} ${rate.padStart(4)} ${total.padStart(7)}\n`;

    // If there are additional lines, format them with minimal spacing
    if (lines.length > 1) {
      // Combine all remaining lines where possible to minimize paper usage
      let remainingLines = [];
      let currentLine = "";

      for (let i = 1; i < lines.length; i++) {
        if (currentLine.length + lines[i].length + 1 <= 25) {
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
      const remainingText = remainingLines
        .map((line) => `  ${line}`)
        .join("\n");
      return firstLine + remainingText + "\n";
    }
    return firstLine;
  }

  return `${name.padEnd(12)} ${qty.padStart(2)} ${rate.padStart(
    4
  )} ${total.padStart(7)}\n`;
};

const formatAmountLine = (label, amount, symbol = "") => {
  // Format amount to 2 decimal places
  const formattedAmount = parseFloat(parseFloat(amount).toFixed(2));

  // FIXED: Use the owner app's approach with spaces instead of dots
  // For 58mm printer (30-32 chars max width)
  const totalWidth = 30; // Max width for 58mm printer
  const amountWidth = 10; // Space for amount with symbols

  // Calculate padding needed between label and amount
  const padding = Math.max(2, totalWidth - label.length - amountWidth);

  // Format with symbol and proper padding
  const amountWithSymbol = `${symbol}${formattedAmount}`;
  const amountPadded = amountWithSymbol.padStart(amountWidth);

  // Create line with spaces instead of dots
  const line = `${label}${" ".repeat(padding)}${amountPadded}`;

  return line + "\n";
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
  // Calculate the total price without discount
  const rawTotal = price * quantity;

  // Apply discount if offer percentage is provided
  const discount = (rawTotal * offer) / 100;

  // Return total after discount
  return rawTotal - discount;
};

// Add this helper function after other helper functions (around line 350)
const getUpiId = async () => {
  try {
    const upiId = await AsyncStorage.getItem("upi_id");
    return upiId || "No UPI ID found";
  } catch (error) {
    console.error("Error fetching UPI ID:", error);
    return "Error fetching UPI ID";
  }
};

export default function CreateOrderScreen() {
  const toast = useToast();
  const router = useRouter();
  const params = useLocalSearchParams();
  const isFocused = useIsFocused();

  // Settings state to control button visibility
  const [settings, setSettings] = useState({
    orderManagement: {
      print_and_save: true,
      KOT_and_save: true,
      settle: true,
      reserve_table: true,
      cancel: true,
    },
  });

  // Use PrinterContext for improved printer management
  const {
    isConnected: printerConnected,
    printerDevice: contextPrinterDevice,
    connectToPrinter,
    isScanning: printerScanning,
    scanForPrinters: contextScanForPrinters,
    availableDevices: printerDevices,
    sendDataToPrinter,
    reconnectPrinter,
    disconnectPrinter: contextDisconnectPrinter,
    autoReconnect,
    setAutoReconnect,
    isPrinting,
  } = usePrinter();

  // Printer state management
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [printerConnectionStatus, setPrinterConnectionStatus] = useState("");
  const [isDeviceSelectionModalVisible, setIsDeviceSelectionModalVisible] =
    useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Show printer connection status when focused
  useEffect(() => {
    if (isFocused) {
      if (printerConnected && contextPrinterDevice) {
        console.log("Printer connected:", contextPrinterDevice?.id);
        toast.show({
          description: `Printer connected: ${
            contextPrinterDevice?.name || "Unknown printer"
          }`,
          placement: "top",
          duration: 2000,
          status: "success",
        });
      }

      // Auto-reconnect to last printer if available
      if (!printerConnected && autoReconnect && !printerScanning) {
        reconnectPrinter().catch((error) => {
          console.log("Auto-reconnect error:", error);
        });
      }
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
    customer_landmark: "",
  });

  const [showCustomerDetailsModal, setShowCustomerDetailsModal] =
    useState(false);
  const [specialDiscount, setSpecialDiscount] = useState("0");
  const [extraCharges, setExtraCharges] = useState("0");
  const [tip, setTip] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isPaid, setIsPaid] = useState(false);
  const [isComplementary, setIsComplementary] = useState(false);
  const [isAdditionalOptionsOpen, setIsAdditionalOptionsOpen] = useState(false);

  // Add the missing state variable for discount panel
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);

  // Add this validation function near the top of your component
  const validateMobileNumber = (number) => {
    // Only allow digits
    const numberRegex = /^\d*$/;
    if (!numberRegex.test(number)) return false;

    // Check if first digit is valid for Indian mobile numbers
    if (number.length === 1 && !["6", "7", "8", "9"].includes(number))
      return false;

    // Check if length is valid (10 or less)
    if (number.length > 10) return false;

    return true;
  };

  // Add validationErrors state
  const [validationErrors, setValidationErrors] = useState({});

  // Update the validateName function
  const validateName = (name) => {
    // Allow letters, spaces, and dots (for names like "Dr. John Smith")
    const nameRegex = /^[a-zA-Z\s.]*$/;
    return nameRegex.test(name);
  };

  // Update the handleCustomerDetailsChange function
  const handleCustomerDetailsChange = (field, value) => {
    if (field === "customer_name") {
      // Only update if the name is valid or empty
      if (validateName(value) || value === "") {
        setCustomerDetails((prevDetails) => ({
          ...prevDetails,
          [field]: value,
        }));
      }
    } else if (
      field === "customer_mobile" ||
      field === "customer_alternate_mobile"
    ) {
      // Only update if the mobile number is valid
      if (validateMobileNumber(value)) {
        setCustomerDetails((prevDetails) => ({
          ...prevDetails,
          [field]: value,
        }));
      }
    } else if (field === "customer_address") {
      // Allow alphanumeric, spaces, commas, dots, hyphens, forward slash, hash
      const addressRegex = /^[a-zA-Z0-9\s,.-/#]*$/;
      if (addressRegex.test(value) && value.length <= 200) {
        setCustomerDetails((prevDetails) => ({
          ...prevDetails,
          [field]: value,
        }));
      }
    } else if (field === "customer_landmark") {
      // Allow alphanumeric, spaces, commas, dots, hyphens
      const landmarkRegex = /^[a-zA-Z0-9\s,.-]*$/;
      if (landmarkRegex.test(value) && value.length <= 100) {
        setCustomerDetails((prevDetails) => ({
          ...prevDetails,
          [field]: value,
        }));
      }
    } else {
      // For other fields, update normally
      setCustomerDetails((prevDetails) => ({
        ...prevDetails,
        [field]: value,
      }));
    }
  };

  // Update the useEffect for session handling

  // Add this function to fetch order details
  const fetchOrderDetails = async (orderId) => {
    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      const deviceToken = await AsyncStorage.getItem("device_token");

      const data = await fetchWithAuth(`${onGetProductionUrl()}order_view`, {
        method: "POST",
        body: JSON.stringify({
          order_id: orderId,
          order_number: params.orderNumber || "", // Add required parameter
          outlet_id: storedOutletId, // Add required parameter
          device_token: deviceToken, // Keep this
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

        // Get the userName and userMobile from params, if available
        const userNameFromParams = params.userName || "";
        const userMobileFromParams = params.userMobile || "";
        console.log(
          "User data from params:",
          userNameFromParams,
          userMobileFromParams
        );

        // Update customer details with user data if available
        if (
          userNameFromParams ||
          userMobileFromParams ||
          params.customer_address ||
          params.customer_alternate_mobile ||
          params.customer_landmark
        ) {
          setCustomerDetails((prev) => ({
            ...prev,
            customer_name: userNameFromParams || prev.customer_name,
            customer_mobile: userMobileFromParams || prev.customer_mobile,
            customer_address: params.customer_address || prev.customer_address,
            customer_alternate_mobile:
              params.customer_alternate_mobile ||
              prev.customer_alternate_mobile,
            customer_landmark:
              params.customer_landmark || prev.customer_landmark,
          }));
        }

        const data = await fetchWithAuth(`${onGetProductionUrl()}order_view`, {
          method: "POST",
          body: JSON.stringify({
            order_id: params.orderId,
            order_number: params.orderNumber || "",
            outlet_id: storedOutletId,
            device_type: "captain",
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
              parseFloat(
                orderDetails.order_details.service_charges_percent || 0
              )
            );
            setGstPercentage(
              parseFloat(orderDetails.order_details.gst_percent || 0)
            );

            // Set customer details, preserving params values if API response is empty
            setCustomerDetails((prev) => ({
              customer_name:
                orderDetails.order_details.customer_name ||
                userNameFromParams ||
                prev.customer_name,
              customer_mobile:
                orderDetails.order_details.customer_mobile ||
                userMobileFromParams ||
                prev.customer_mobile,
              customer_alternate_mobile:
                orderDetails.order_details.customer_alternate_mobile ||
                params.customer_alternate_mobile ||
                prev.customer_alternate_mobile,
              customer_address:
                orderDetails.order_details.customer_address ||
                params.customer_address ||
                prev.customer_address,
              customer_landmark:
                orderDetails.order_details.customer_landmark ||
                params.customer_landmark ||
                prev.customer_landmark,
            }));

            // Set additional charges
            setSpecialDiscount(
              orderDetails.order_details.special_discount?.toString() || "0"
            );
            setExtraCharges(
              orderDetails.order_details.charges?.toString() || "0"
            );
            setTip(orderDetails.order_details.tip?.toString() || "0");

            // Set payment information
            if (orderDetails.order_details.is_paid === "paid") {
              setIsPaid(true);
              setIsComplementary(false);
              setPaymentMethod(
                orderDetails.order_details.payment_method?.toUpperCase() ||
                  "cash"
              );
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
  }, [
    params?.orderId,
    params?.orderNumber,
    params.userName,
    params.userMobile,
  ]); // Add proper dependencies

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cash");
  const [isPaidChecked, setIsPaidChecked] = useState(false);

  // Update handleKOT function to check for printer connection properly

  const handleKOT = async (
    modalPaymentMethod = null,
    modalIsPaidValue = null
  ) => {
    try {
      // Use modal values if provided
      const effectiveIsPaid =
        modalIsPaidValue !== null ? modalIsPaidValue : isPaid;
      const effectivePaymentMethod = modalPaymentMethod || paymentMethod;

      // Check if we're connected to a printer
      if (!printerConnected || !contextPrinterDevice) {
        Alert.alert(
          "Printer Not Connected",
          "Do you want to connect a printer?",
          [
            {
              text: "Yes",
              onPress: () => setIsDeviceSelectionModalVisible(true),
            },
            {
              text: "Skip Printing",
              style: "cancel",
              onPress: async () => {
                // Just save the order without printing
                try {
                  setIsProcessing(true);
                  setLoadingMessage("Saving order...");

                  // Save order without printing
                  const savedOrder = await createOrder("KOT_and_save");

                  if (savedOrder) {
                    toast.show({
                      description: "Order saved successfully",
                      status: "success",
                      duration: 2000,
                    });

                    // Navigate back to tables view
                    router.replace({
                      pathname: "/(tabs)/tables/sections",
                      params: {
                        refresh: Date.now().toString(),
                        status: "completed",
                      },
                    });
                  }
                } catch (error) {
                  console.error("Save order error:", error);
                  toast.show({
                    description: "Error saving order: " + error.message,
                    status: "error",
                    duration: 3000,
                  });
                } finally {
                  setIsProcessing(false);
                  setLoadingMessage("");
                }
              },
            },
          ]
        );
        return;
      }

      // Verify printer connection is stable before KOT printing
      try {
        if (contextPrinterDevice.isConnected) {
          const isDeviceConnected = await contextPrinterDevice.isConnected();
          if (!isDeviceConnected) {
            console.log(
              "Device reports as not connected for KOT despite context state"
            );
            throw new Error("Printer connection not stable for KOT");
          }
          console.log("Printer verified as ready for KOT");
        }
      } catch (connectionError) {
        console.error("KOT printer verification error:", connectionError);
        Alert.alert(
          "Printer Connection Error",
          "Please disconnect and reconnect your printer before printing KOT",
          [
            {
              text: "Reconnect Printer",
              onPress: () => setIsDeviceSelectionModalVisible(true),
            },
            {
              text: "Skip Printing and Save",
              style: "cancel",
              onPress: async () => {
                // Just save the order without printing
                try {
                  setIsProcessing(true);
                  setLoadingMessage("Saving order...");

                  // Save order without printing
                  const savedOrder = await createOrder("create_order");

                  if (savedOrder) {
                    toast.show({
                      description: "Order saved successfully",
                      status: "success",
                      duration: 2000,
                    });

                    // Navigate back to tables view
                    router.replace({
                      pathname: "/(tabs)/tables/sections",
                      params: {
                        refresh: Date.now().toString(),
                        status: "completed",
                      },
                    });
                  }
                } catch (error) {
                  console.error("Save order error:", error);
                  toast.show({
                    description: "Error saving order: " + error.message,
                    status: "error",
                    duration: 3000,
                  });
                } finally {
                  setIsProcessing(false);
                  setLoadingMessage("");
                }
              },
            },
          ]
        );
        return;
      }

      // Continue with KOT and Save logic
      if (selectedItems.length === 0) {
        toast.show({
          description: "Please add items to the order",
          status: "warning",
          duration: 2000,
        });
        return;
      }

      setIsProcessing(true);
      setLoadingMessage("Processing KOT and saving order...");

      try {
        // Create order with "KOT_and_save" status
        const apiResponse = await createOrder("KOT_and_save", true);
        if (!apiResponse || apiResponse.st !== 1) {
          throw new Error(apiResponse?.msg || "Failed to save order");
        }

        console.log(
          "API Response for KOT_and_save:",
          JSON.stringify(apiResponse)
        );
        console.log(
          "Order number from API KOT response:",
          apiResponse?.order_number ||
            apiResponse?.lists?.order_details?.order_number ||
            "Not found in KOT API response"
        );

        // First print KOT
        try {
          setLoadingMessage("Printing KOT...");
          await printKOT(apiResponse);

          toast.show({
            description: "KOT printed successfully, please cut the paper...",
            status: "success",
            duration: 2000,
          });

          // Only proceed with bill printing if payment is confirmed
          if (effectiveIsPaid) {
            setLoadingMessage("Waiting to print receipt... Please cut the paper");
            
            // Wait for 3 seconds to allow user to cut the paper
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Now print the receipt
            setLoadingMessage("Printing receipt...");
            await printReceipt(apiResponse);
            
            toast.show({
              description: "Order paid and receipt printed successfully",
              status: "success",
              duration: 2000,
            });
          }
        } catch (printError) {
          console.error("Print error:", printError);
          toast.show({
            description: "Order saved but printing failed: " + printError.message,
            status: "warning",
            duration: 3000,
          });
        }

        // Navigate back to tables screen
        router.replace({
          pathname: "/(tabs)/tables/sections",
          params: {
            refresh: Date.now().toString(),
            status: "completed",
          },
        });
      } catch (error) {
        console.error("KOT and Save error:", error);
        toast.show({
          description: "Error saving order: " + error.message,
          status: "error",
          duration: 3000,
        });
      } finally {
        setIsProcessing(false);
        setLoadingMessage("");
      }
    } catch (error) {
      console.error("KOT and Save error:", error);
      toast.show({
        description: "Error: " + error.message,
        status: "error",
        duration: 3000,
      });
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  // Update the printKOT function to use the PrinterContext
  const printKOT = async (orderData) => {
    try {
      // Check printer connection
      if (!printerConnected || !contextPrinterDevice) {
        throw new Error("No printer connected");
      }

      console.log("Generating KOT commands...");

      // ADDED: Debug log for KOT printing order number
      console.log("Order Data for KOT printing:", {
        orderNumber:
          orderData?.order_number ||
          orderData?.lists?.order_details?.order_number ||
          "not found",
        paramOrderId: params?.orderId,
        paramOrderNumber: params?.orderNumber,
        completeOrderData: JSON.stringify(orderData).substring(0, 500) + "...", // Truncated for readability
      });

      // Generate KOT commands with error handling
      let kotCommands;
      try {
        kotCommands = await generateKOTCommands(orderData);
        if (!kotCommands || !Array.isArray(kotCommands)) {
          throw new Error("Invalid KOT commands generated");
        }
        console.log("KOT commands generated successfully");
      } catch (genError) {
        console.error("Error generating KOT commands:", genError);
        throw new Error("Failed to prepare KOT data: " + genError.message);
      }

      console.log("Sending KOT to printer...");

      // Send commands to printer using PrinterContext
      try {
        await sendDataToPrinter(kotCommands);
        console.log("KOT data sent to printer successfully");
      } catch (printError) {
        console.error("Error sending data to printer:", printError);
        throw new Error(
          "Failed to send KOT data to printer: " + printError.message
        );
      }

      console.log("KOT printed successfully");
      return true;
    } catch (error) {
      console.error("KOT printing error:", error);

      // Check if error is related to printer connection
      if (
        error.message?.includes("connection") ||
        error.message?.includes("printer") ||
        error.message?.includes("connected")
      ) {
        throw new Error(
          "Printer connection lost. Please reconnect your printer and try again."
        );
      }

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
        status: "warning",
      });
      return;
    }

    // Set the current action to 'settle'
    setCurrentAction("settle");

    // Set isPaidChecked to false by default for the modal
    setIsPaidChecked(false);

    // Set default payment method if not already set
    if (!selectedPaymentMethod) {
      setSelectedPaymentMethod("cash");
    }

    // Show the payment modal
    setShowPaymentModal(true);
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
      const price =
        item.portionSize === "Half"
          ? Number(item.half_price || item.price)
          : Number(item.full_price || item.price);
      return sum + price * Number(item.quantity);
    }, 0);
  };

  const calculateItemDiscount = (items) => {
    return items?.reduce((sum, item) => {
      const price =
        item.portionSize === "Half"
          ? Number(item.half_price || item.price)
          : Number(item.full_price || item.price);
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

  const calculateTotalAfterExtraCharges = (
    totalAfterDiscounts,
    extraCharges
  ) => {
    const extraChargesAmount = parseFloat(extraCharges) || 0;
    return totalAfterDiscounts + extraChargesAmount;
  };

  const calculateServiceCharges = (amount, serviceChargePercentage) => {
    return (amount * serviceChargePercentage) / 100;
  };

  const calculateGST = (amount, gstPercentage) => {
    return (amount * gstPercentage) / 100;
  };

  const calculateGrandTotal = (
    selectedItems,
    specialDiscount,
    extraCharges,
    serviceChargePercentage,
    gstPercentage,
    tip
  ) => {
    // 1. Start with items total
    const itemsTotal = calculateSubtotal(selectedItems);

    // 2. Subtract item discounts
    const itemDiscounts = calculateItemDiscount(selectedItems);

    // 3. Subtract special discount
    const specialDiscountAmount = parseFloat(specialDiscount) || 0;

    // 4. Add extra charges
    const extraChargesAmount = parseFloat(extraCharges) || 0;

    // 5. Calculate subtotal after discounts and extra charges
    const subtotalAfterDiscountsAndExtra =
      itemsTotal - itemDiscounts - specialDiscountAmount + extraChargesAmount;

    // 6. Calculate and add service charges
    const serviceCharges = calculateServiceCharges(
      subtotalAfterDiscountsAndExtra,
      serviceChargePercentage
    );

    // 7. Calculate and add GST
    const gst = calculateGST(
      subtotalAfterDiscountsAndExtra + serviceCharges,
      gstPercentage
    );

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
    console.log(
      "Rendering SelectedItemsList with items:",
      selectedItems.length
    );
    console.log(
      "Items with isNewlyAdded flag:",
      selectedItems.filter((item) => item.isNewlyAdded).length
    );

    return (
      <Box
        bg="white"
        borderWidth={1}
        borderColor="gray.200"
        borderRadius="md"
        p={3}
      >
        <VStack space={2}>
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontSize="md" fontWeight="bold">
              Selected Items
            </Text>
            {selectedItems.length > 0 && (
              <Badge rounded="full" colorScheme="cyan">
                {selectedItems.length}
              </Badge>
            )}
          </HStack>
          {selectedItems.map((item, index) => {
            console.log(
              `Item ${index} details:`,
              JSON.stringify({
                id: item.menu_id,
                name: item.name,
                menu_name: item.menu_name,
                isNewlyAdded: item.isNewlyAdded,
                price: item.price,
                quantity: item.quantity,
              })
            );
            return (
              <Box
                key={index}
                borderBottomWidth={1}
                borderColor="gray.200"
                pb={2}
              >
                <HStack justifyContent="space-between" alignItems="center">
                  <VStack flex={1}>
                    <Text fontWeight={600} fontSize={16}>
                      {item.menu_name}
                      {item.offer > 0 && (
                        <Text color="green.600"> ({item.offer}% OFF)</Text>
                      )}
                    </Text>
                  </VStack>
                  <Pressable
                    onPress={() =>
                      removeFromCart(item.menu_id, item.portion_size)
                    }
                    hitSlop={8}
                  >
                    <Icon
                      as={MaterialIcons}
                      name="close"
                      size="sm"
                      color="gray.500"
                    />
                  </Pressable>
                </HStack>
                <HStack
                  mt={2}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <HStack space={3} alignItems="center">
                    <IconButton
                      icon={<Icon as={MaterialIcons} name="remove" size="xs" />}
                      borderRadius="full"
                      variant="outline"
                      borderColor="gray.300"
                      size="sm"
                      p={0}
                      onPress={() => {
                        if (item.quantity > 1) {
                          decreaseQuantity(item);
                        } else {
                          // When quantity is 1, remove the item completely
                          removeFromCart(
                            item.menu_id,
                            item.portionSize || item.portion_size
                          );
                        }
                      }}
                    />
                    <Text>{item.quantity}</Text>
                    <IconButton
                      icon={<Icon as={MaterialIcons} name="add" size="xs" />}
                      borderRadius="full"
                      variant="outline"
                      borderColor="gray.300"
                      size="sm"
                      p={0}
                      onPress={() => increaseQuantity(item)}
                    />
                  </HStack>
                  <Text>
                    Full: ₹
                    {calculateItemTotal(
                      item.price,
                      item.quantity,
                      item.offer
                    ).toFixed(2)}
                  </Text>
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
        const existingNewItems = selectedItems.filter(
          (item) => item.isNewlyAdded
        );

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
        existingNewItems.forEach((newItem) => {
          const existingItemIndex = mergedItems.findIndex(
            (item) => item.menu_id === newItem.menu_id
          );

          if (existingItemIndex === -1) {
            // Item doesn't exist in order, add it
            mergedItems.push({
              ...newItem,
              isNewlyAdded: true,
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
            parseFloat(orderData.order_details.service_charges_percent || 0)
          );
          setGstPercentage(
            parseFloat(orderData.order_details.gst_percent || 0)
          );

          // Set customer details
          if (orderData.order_details.customer_name) {
            setCustomerDetails({
              customer_name: orderData.order_details.customer_name || "",
              customer_mobile: orderData.order_details.customer_mobile || "",
              customer_alternate_mobile:
                orderData.order_details.customer_alternate_mobile || "",
              customer_address: orderData.order_details.customer_address || "",
              customer_landmark:
                orderData.order_details.customer_landmark || "",
            });
          }

          // Set additional charges
          setSpecialDiscount(
            orderData.order_details.special_discount?.toString() || "0"
          );
          setExtraCharges(orderData.order_details.charges?.toString() || "0");
          setTip(orderData.order_details.tip?.toString() || "0");

          // Set payment information
          if (orderData.order_details.is_paid === "paid") {
            setIsPaid(true);
            setIsComplementary(false);
            setPaymentMethod(
              orderData.order_details.payment_method?.toUpperCase() || "cash"
            );
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

        const hasExistingOrder =
          params?.isOccupied === "1" && params?.orderNumber;
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
                setServiceChargePercentage(
                  parseFloat(
                    orderData.order_details.service_charges_percent || 0
                  )
                );
                setGstPercentage(
                  parseFloat(orderData.order_details.gst_percent || 0)
                );

                if (orderData.order_details.customer_name) {
                  setCustomerDetails({
                    customer_name: orderData.order_details.customer_name || "",
                    customer_mobile:
                      orderData.order_details.customer_mobile || "",
                    customer_alternate_mobile:
                      orderData.order_details.customer_alternate_mobile || "",
                    customer_address:
                      orderData.order_details.customer_address || "",
                    customer_landmark:
                      orderData.order_details.customer_landmark || "",
                  });
                }

                setSpecialDiscount(
                  orderData.order_details.special_discount?.toString() || "0"
                );
                setExtraCharges(
                  orderData.order_details.charges?.toString() || "0"
                );
                setTip(orderData.order_details.tip?.toString() || "0");

                if (orderData.order_details.is_paid === "paid") {
                  setIsPaid(true);
                  setIsComplementary(false);
                  setPaymentMethod(
                    orderData.order_details.payment_method?.toUpperCase() ||
                      "cash"
                  );
                } else if (
                  orderData.order_details.is_paid === "complementary"
                ) {
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
                const newItems = orderDetailsObj.menu_items.map((item) => ({
                  menu_id: item.menu_id,
                  menu_name: item.name,
                  name: item.name,
                  price: parseFloat(item.price),
                  quantity: parseInt(item.quantity) || 1,
                  total_price:
                    parseFloat(item.price) * (parseInt(item.quantity) || 1),
                  portionSize: item.portion === "half" ? "Half" : "Full",
                  offer: parseFloat(item.offer) || 0,
                  specialInstructions: item.specialInstructions || "",
                  isNewlyAdded: true,
                  half_price: parseFloat(item.half_price) || 0,
                  full_price:
                    parseFloat(item.full_price) || parseFloat(item.price),
                }));

                setSelectedItems((prevItems) => {
                  if (!hasExistingOrder) return newItems;

                  const existingItemsMap = {};
                  prevItems.forEach((item) => {
                    existingItemsMap[item.menu_id] = item;
                  });

                  const mergedItems = [...prevItems];
                  newItems.forEach((newItem) => {
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
            if (sessionData.gst)
              await AsyncStorage.setItem("gst", sessionData.gst?.toString());
            if (sessionData.service_charges)
              await AsyncStorage.setItem(
                "service_charges",
                sessionData.service_charges?.toString()
              );

            setGstPercentage(parseFloat(sessionData.gst || 0));
            setServiceChargePercentage(
              parseFloat(sessionData.service_charges || 0)
            );
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

    setSelectedItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex(
        (prevItem) => String(prevItem.menu_id) === String(item.menu_id)
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
        total_price: calculateItemTotal(
          Number(item.full_price),
          1,
          Number(item.offer || 0)
        ),
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

    setSelectedItems((prevItems) => {
      const filteredItems = prevItems.filter((item) => {
        // Remove the item completely if it matches the menu_id and portionSize
        // Regardless of whether it's newly added or not
        return !(
          item.menu_id === menuId &&
          (item.portionSize === portionSize ||
            item.portion_size === portionSize)
        );
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
      top={-20}
      borderWidth={1}
      borderStyle="dashed"
      borderColor={
        params?.isSpecialOrder ||
        (params?.orderType && params?.orderType !== "dine-in")
          ? params.orderType === "parcel"
            ? "amber.500"
            : params.orderType === "drive-through"
            ? "purple.500"
            : params.orderType === "delivery"
            ? "teal.500"
            : params.orderType === "counter"
            ? "blue.500"
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
          params?.isSpecialOrder ||
          (params?.orderType && params?.orderType !== "dine-in")
            ? params.orderType === "parcel"
              ? "amber.100"
              : params.orderType === "drive-through"
              ? "purple.100"
              : params.orderType === "delivery"
              ? "teal.100"
              : params.orderType === "counter"
              ? "blue.100"
              : "indigo.100"
            : params?.isOccupied === "1"
            ? "red.100"
            : "green.100"
        }
        rounded="lg"
        px={2}
        py={1}
      >
        <VStack alignItems="center">
          {params?.isSpecialOrder ||
          (params?.orderType && params?.orderType !== "dine-in") ? (
            <>
              <Text
                color={
                  params.orderType === "parcel"
                    ? "amber.800"
                    : params.orderType === "drive-through"
                    ? "purple.800"
                    : params.orderType === "delivery"
                    ? "teal.800"
                    : params.orderType === "counter"
                    ? "blue.800"
                    : "indigo.800"
                }
                fontSize="xs"
                fontWeight="medium"
                numberOfLines={1}
              >
                {params.orderType === "drive-through"
                  ? "Drive Through"
                  : params.orderType === "counter"
                  ? "Counter"
                  : params.orderType === "delivery"
                  ? "Delivery"
                  : params.orderType === "parcel"
                  ? "Parcel"
                  : params.orderType.charAt(0).toUpperCase() +
                    params.orderType.slice(1)}
              </Text>
              {params?.orderNumber && (
                <Text
                  color={
                    params.orderType === "parcel"
                      ? "amber.800"
                      : params.orderType === "drive-through"
                      ? "purple.800"
                      : params.orderType === "delivery"
                      ? "teal.800"
                      : params.orderType === "counter"
                      ? "blue.800"
                      : "indigo.800"
                  }
                  fontSize="xs"
                  fontWeight="medium"
                  numberOfLines={1}
                >
                  Bill #{params.orderNumber}
                </Text>
              )}
            </>
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

    // Check if we have a Poha item with 25% discount
    let totalDiscount = 0;
    let totalAmount = 0;

    for (const item of items) {
      // Get the original price (before discount) per unit
      const originalUnitPrice =
        item.offer > 0 ? item.price / (1 - item.offer / 100) : item.price;

      // Calculate total original amount
      const originalAmount = originalUnitPrice * item.quantity;
      totalAmount += originalAmount;

      // Calculate discount amount
      const discountAmount = (originalAmount * item.offer) / 100;
      totalDiscount += discountAmount;
    }

    // Return the weighted average discount percentage
    return totalAmount > 0 ? (totalDiscount / totalAmount) * 100 : 0;
  };

  // Update handlePrint to use the PrinterContext
  const handlePrint = async () => {
    try {
      // Check if we're connected to a printer
      if (!printerConnected || !contextPrinterDevice) {
        Alert.alert(
          "Printer Not Connected",
          "Do you want to connect a printer?",
          [
            {
              text: "Yes",
              onPress: () => setIsDeviceSelectionModalVisible(true),
            },
            {
              text: "Skip Printing",
              style: "cancel",
              onPress: async () => {
                // Still place the order even when skipping printing
                try {
                  setIsProcessing(true);
                  setLoadingMessage("Placing order...");

                  // Verify authentication token is present
                  const token = await AsyncStorage.getItem("access");
                  if (!token) {
                    throw new Error(
                      "Authentication token missing. Please log in again."
                    );
                  }

                  // Create order without printing
                  const apiResponse = await createOrder("print_and_save", true);

                  if (!apiResponse || apiResponse.st !== 1) {
                    throw new Error(
                      apiResponse?.msg || "Failed to place order"
                    );
                  }

                  // Show success message
                  toast.show({
                    description: "Order placed successfully (printing skipped)",
                    status: "success",
                    duration: 2000,
                  });

                  // Navigate back to tables screen using the standard pattern
                  router.replace({
                    pathname: "/(tabs)/tables/sections",
                    params: {
                      refresh: Date.now().toString(),
                      status: "completed",
                    },
                  });
                } catch (error) {
                  console.error("Order placement error:", error);
                  toast.show({
                    description: `Error: ${error.message}`,
                    status: "error",
                    duration: 3000,
                  });
                } finally {
                  setIsProcessing(false);
                  setLoadingMessage("");
                }
              },
            },
          ]
        );
        return;
      }

      // Verify printer connection is stable before receipt printing
      try {
        if (contextPrinterDevice.isConnected) {
          const isDeviceConnected = await contextPrinterDevice.isConnected();
          if (!isDeviceConnected) {
            console.log(
              "Device reports as not connected for receipt despite context state"
            );
            throw new Error("Printer connection not stable for receipt");
          }
          console.log("Printer verified as ready for receipt");
        }
      } catch (connectionError) {
        console.error("Receipt printer verification error:", connectionError);
        Alert.alert(
          "Printer Connection Error",
          "Please disconnect and reconnect your printer before printing receipt",
          [
            {
              text: "Reconnect Printer",
              onPress: () => setIsDeviceSelectionModalVisible(true),
            },
            {
              text: "Skip Printing",
              style: "cancel",
              onPress: async () => {
                // Still place the order even when skipping printing due to connection issues
                try {
                  setIsProcessing(true);
                  setLoadingMessage("Placing order...");

                  // Verify authentication token is present
                  const token = await AsyncStorage.getItem("access");
                  if (!token) {
                    throw new Error(
                      "Authentication token missing. Please log in again."
                    );
                  }

                  // Create order without printing
                  const apiResponse = await createOrder("print_and_save", true);

                  if (!apiResponse || apiResponse.st !== 1) {
                    throw new Error(
                      apiResponse?.msg || "Failed to place order"
                    );
                  }

                  // Show success message
                  toast.show({
                    description: "Order placed successfully (printing skipped)",
                    status: "success",
                    duration: 2000,
                  });

                  // Navigate back to tables screen using the standard pattern
                  router.replace({
                    pathname: "/(tabs)/tables/sections",
                    params: {
                      refresh: Date.now().toString(),
                      status: "completed",
                    },
                  });
                } catch (error) {
                  console.error("Order placement error:", error);
                  toast.show({
                    description: `Error: ${error.message}`,
                    status: "error",
                    duration: 3000,
                  });
                } finally {
                  setIsProcessing(false);
                  setLoadingMessage("");
                }
              },
            },
          ]
        );
        return;
      }

      setIsProcessing(true);
      setLoadingMessage("Processing print request...");

      // Get order data to print
      let apiResponse;
      try {
        console.log("Starting print process - verifying authentication");

        // Verify authentication token is present
        const token = await AsyncStorage.getItem("access");
        if (!token) {
          throw new Error("Authentication token missing. Please log in again.");
        }

        // First save the order data if not already saved
        // IMPORTANT: Using "print_and_save" action type - matches owner app (OrderCreate.js)
        apiResponse = await createOrder("print_and_save", true);

        if (!apiResponse || apiResponse.st !== 1) {
          throw new Error(apiResponse?.msg || "Failed to save order data");
        }

        console.log(
          "Order saved successfully for printing, response:",
          JSON.stringify(apiResponse)
        );

        // Set to printing state
        setLoadingMessage("Printing receipt...");

        // Print the receipt
        await printReceipt(apiResponse);

        // Success
        toast.show({
          description: "Receipt printed successfully",
          status: "success",
          duration: 2000,
        });

        // Navigate back to tables screen using the standard pattern
        router.replace({
          pathname: "/(tabs)/tables/sections",
          params: {
            refresh: Date.now().toString(),
            status: "completed",
          },
        });
      } catch (error) {
        console.error("Print and save error:", error);
        toast.show({
          description: `Error: ${error.message}`,
          status: "error",
          duration: 3000,
        });
      } finally {
        setIsProcessing(false);
        setLoadingMessage("");
      }
    } catch (error) {
      console.error("Print error:", error);
      toast.show({
        description: `Error: ${error.message}`,
        status: "error",
        duration: 3000,
      });
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  // Update the scanForPrinters function to include Expo Go check
  const scanForPrinters = async () => {
    try {
      // Request permissions first
      const hasPermissions = await requestPermissions(bleManager);
      if (!hasPermissions) {
        Alert.alert(
          "Permission Required",
          "Bluetooth permission is needed to connect to printer",
          [{ text: "OK" }]
        );
        return;
      }

      setPrinterConnectionStatus("Checking Bluetooth...");
      setIsProcessing(true);

      const state = await bleManager.state();
      if (state !== "PoweredOn") {
        Alert.alert(
          "Bluetooth Required",
          "Please turn on Bluetooth to connect to printer",
          [
            {
              text: "Open Settings",
              onPress: () => Linking.openSettings(),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
        setIsProcessing(false);
        setPrinterConnectionStatus("");
        return;
      }

      // Use the context scanner function instead of local implementation
      contextScanForPrinters();

      // Show the device selection modal
      setIsDeviceSelectionModalVisible(true);
      setPrinterConnectionStatus("Scanning for printers...");
    } catch (error) {
      console.error("Scan error:", error);
      toast.show({
        description: "Failed to scan for printers: " + error.message,
        status: "error",
        duration: 3000,
      });
      setPrinterConnectionStatus("");
      setIsProcessing(false);
    }
  };
  // Update handleDeviceSelection to handle both KOT and receipt printing the same way
  const handleDeviceSelection = async (device) => {
    try {
      setPrinterConnectionStatus("Connecting to printer...");

      // Use the context's connectToPrinter function instead of localConnectToPrinter
      const success = await connectToPrinter(device);

      if (success) {
        setPrinterConnectionStatus("Connected successfully!");
        toast.show({
          description: `Connected to printer: ${
            device.name || "Unknown device"
          }`,
          status: "success",
          duration: 3000,
          placement: "top",
        });

        // Close the modal after successful connection
        setTimeout(() => {
          setIsDeviceSelectionModalVisible(false);
          setPrinterConnectionStatus("");
        }, 1000);
      } else {
        setPrinterConnectionStatus("Connection failed");
        toast.show({
          description: "Failed to connect to printer",
          status: "error",
          duration: 3000,
          placement: "top",
        });
      }
    } catch (error) {
      console.error("Connection error:", error);
      setPrinterConnectionStatus("Connection error: " + error.message);
      toast.show({
        description: "Printer connection error",
        status: "error",
        duration: 3000,
        placement: "top",
      });
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
        const initCommand = [0x1b, 0x40]; // ESC @

        // Send initialization command and wait for printer to process
        await printCharacteristic.writeWithoutResponse(
          base64.encode(String.fromCharCode(...initCommand))
        );

        // Allow printer to process init command
        await new Promise((resolve) => setTimeout(resolve, 120));
      } catch (initError) {
        console.log("Printer init warning:", initError);
        // Continue even if init fails
      }

      // Increased chunk size for efficiency
      const CHUNK_SIZE = 200; // Increased from 150 for faster printing
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
    if (!printerConnected || !contextPrinterDevice) {
      throw new Error("No printer connected");
    }

    try {
      // Set processing indicator
      setIsProcessing(true);
      setLoadingMessage("Generating receipt...");

      // Generate printer commands for the receipt
      const commands = await generatePrinterCommands(orderData);

      // Set to printing state
      setLoadingMessage("Printing receipt...");

      // Use the context's sendDataToPrinter function
      await sendDataToPrinter(commands);

      return true;
    } catch (error) {
      console.error("Receipt printing error:", error);

      // Check if error is related to printer connection
      if (
        error.message?.includes("connection") ||
        error.message?.includes("printer") ||
        error.message?.includes("connected")
      ) {
        throw new Error(
          "Printer connection lost. Please reconnect your printer and try again."
        );
      }

      throw error;
    } finally {
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  // Add a function to open the printer selection modal
  const openPrinterSelectionModal = () => {
    // If we're already connected, show an alert with options
    if (printerConnected && contextPrinterDevice) {
      Alert.alert(
        "Printer Connected",
        `You are connected to ${
          contextPrinterDevice.name || "Unknown printer"
        }`,
        [
          {
            text: "Disconnect",
            onPress: async () => {
              await contextDisconnectPrinter();
              toast.show({
                description: "Printer disconnected",
                status: "info",
                duration: 2000,
                placement: "top",
              });
            },
          },
          {
            text: "Print Test",
            onPress: () => {
              handlePrint();
            },
          },
          {
            text: "Connect to Another",
            onPress: () => {
              contextDisconnectPrinter();
              setTimeout(() => {
                setIsDeviceSelectionModalVisible(true);
                scanForPrinters();
              }, 500);
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    // If not connected, open the selection modal
    setIsDeviceSelectionModalVisible(true);
    scanForPrinters();
  };

  // Update the generatePrinterCommands function
  const generatePrinterCommands = async (orderData) => {
    try {
      console.log(
        "Generating printer commands with data:",
        JSON.stringify(orderData)
      );

      // Initialize commands with printer reset
      let commands = [...COMMANDS.INITIALIZE];

      // Get outlet details
      const [outletName, outletAddress, outletMobile] = await Promise.all([
        AsyncStorage.getItem("outlet_name"),
        AsyncStorage.getItem("outlet_address"),
        AsyncStorage.getItem("outlet_mobile"),
        // AsyncStorage.getItem("upi_id"),
      ]);

      const upiId = await AsyncStorage.getItem("upi_id");

      // Calculate totals
      const subtotal = calculateSubtotal(selectedItems);
      const itemDiscountAmount = calculateItemDiscount(selectedItems);
      const discountPercent = getDiscountPercentage(); // FIXED: Use getDiscountPercentage instead of calculateTotalDiscountPercentage

      // Calculate special discount and extra charges
      const specialDiscountAmount = parseFloat(specialDiscount) || 0;
      const extraChargesAmount = parseFloat(extraCharges) || 0;

      // Calculate subtotal after all discounts and extra charges
      const subtotalAfterDiscounts =
        subtotal - itemDiscountAmount - specialDiscountAmount;
      const subtotalAfterExtra = subtotalAfterDiscounts + extraChargesAmount;

      // Calculate service charge and GST
      const serviceAmount = calculateServiceCharges(
        subtotalAfterExtra,
        serviceChargePercentage
      );
      const gstAmount = calculateGST(
        subtotalAfterExtra + serviceAmount,
        gstPercentage
      );

      // Add tip amount
      const tipAmount = parseFloat(tip) || 0;

      // Calculate final total
      const total = subtotalAfterExtra + serviceAmount + gstAmount + tipAmount;

      // Format date
      const now = new Date();
      const formattedDate = `${now.getDate()}/${
        now.getMonth() + 1
      }/${now.getFullYear()}, ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

      // Create UPI payment string
      const upiPaymentString = upiId
        ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
            outletName || "Restaurant"
          )}&am=${total.toFixed(2)}&cu=INR`
        : ``;

      // FIXED: Get order number with enhanced fallbacks to match owner app
      // Get order number with fallbacks, adapting to various response formats
      const orderNumber =
        orderData?.lists?.order_details?.order_number || // Old format from API
        orderData?.order_details?.order_number || // Format from order details
        orderData?.order_number || // Direct format for new orders
        params?.orderNumber || // URL param fallback (adds this case)
        params?.orderId || // Last fallback
        "New";

      console.log("Using order number for receipt:", orderNumber, "Source:", {
        fromOrderDetails: orderData?.lists?.order_details?.order_number,
        fromOtherDetails: orderData?.order_details?.order_number,
        fromDirectProperty: orderData?.order_number,
        fromParamsOrderNumber: params?.orderNumber,
        fromParamsOrderId: params?.orderId,
      });

      // Determine order type
      const orderType = params?.orderType || "dine-in";
      const orderTypeFormatted =
        orderTypeMap[orderType] ||
        orderType.charAt(0).toUpperCase() + orderType.slice(1);

      // Create header
      commands.push(
        ...COMMANDS.LINE_SPACING_TIGHT, // Use tighter line spacing for entire receipt
        ...textToBytes("\x1B\x61\x01"), // Center alignment
        ...textToBytes("\x1B\x21\x08"), // Double width, double height
        ...textToBytes(`${outletName || "Restaurant"}\n`),
        ...textToBytes("\x1B\x21\x00"), // Normal text
        ...textToBytes(`${outletAddress || "Address"}\n`),
        ...textToBytes(`${outletMobile ? `+91 ${outletMobile}\n` : ""}`),

        ...textToBytes("\x1B\x61\x00"), // Left align
        ...textToBytes(`Bill No: ${orderNumber}\n`)
      );

      // Show different order information based on order type
      if (orderType === "dine-in") {
        // For dine-in orders, show section and table number
        commands.push(
          ...textToBytes(
            `Table: ${params?.sectionName || "Dining"}${
              params?.tableNumber ? ` - ${params.tableNumber}` : ""
            }\n`
          )
        );
      } else {
        // For other order types (parcel, counter, delivery, drive-through), show the type
        commands.push(...textToBytes(`Type: ${orderTypeFormatted}\n`));
      }

      commands.push(
        ...textToBytes(
          `DateTime: ${
            orderData?.datetime
              ? formatTime(orderData.datetime)
              : getCurrentDateTime()
          }\n`
        ),
        ...textToBytes("------------------------------\n"),
        ...textToBytes("Item         Qty Rate    Amt\n"),
        ...textToBytes("------------------------------\n")
      );

      // Add items
      selectedItems.forEach((item) => {
        commands.push(...textToBytes(formatMenuItem(item)));
      });

      // Add totals and footer
      commands.push(...textToBytes("------------------------------\n"));

      // Only add discount line if discount amount is not zero
      if (itemDiscountAmount > 0) {
        commands.push(
          ...textToBytes(
            formatAmountLine(
              `Discount(${discountPercent}%)`,
              itemDiscountAmount,
              "-"
            )
          )
        );
      }

      // Only add special discount if amount is greater than zero - MOVED UP
      if (specialDiscountAmount > 0) {
        commands.push(
          ...textToBytes(
            formatAmountLine("Special Discount", specialDiscountAmount, "-")
          )
        );
      }

      // Only add extra charges if amount is greater than zero - MOVED UP
      if (extraChargesAmount > 0) {
        commands.push(
          ...textToBytes(
            formatAmountLine("Extra Charges", extraChargesAmount, "+")
          )
        );
      }

      // Subtotal MOVED AFTER special discount and extra charges
      commands.push(...textToBytes(formatAmountLine("Subtotal", subtotal)));

      // Only add service charge if percentage or amount is greater than zero
      if (serviceChargePercentage > 0 && serviceAmount > 0) {
        commands.push(
          ...textToBytes(
            formatAmountLine(
              `Service(${serviceChargePercentage}%)`,
              serviceAmount,
              "+"
            )
          )
        );
      }

      // Only add GST if percentage or amount is greater than zero
      if (gstPercentage > 0 && gstAmount > 0) {
        commands.push(
          ...textToBytes(
            formatAmountLine(`GST(${gstPercentage}%)`, gstAmount, "+")
          )
        );
      }

      // Only add tip if amount is greater than zero - MOVED TO END
      if (tipAmount > 0) {
        commands.push(...textToBytes(formatAmountLine("Tip", tipAmount, "+")));
      }

      // Add QR code for UPI payment
      // if (upiPaymentString) {
      commands.push(
        ...textToBytes("\x1B\x61\x01"), // Center align
        ...textToBytes("------ Payment Options ------\n\n"),
        ...textToBytes("\x1B\x21\x00"), // Normal text
        ...textToBytes("PhonePe  GPay  Paytm  UPI\n"),
        ...textToBytes("------------------------\n"),
        ...generateQRCode(upiPaymentString),
        ...textToBytes("\n\n"),
        ...textToBytes(`Scan to Pay ${total.toFixed(2)}\n\n`)
        // ...textToBytes("UPI ID: " + upiId + "\n\n")
      );
      // }

      // Add footer
      commands.push(
        ...textToBytes("\x1B\x61\x01"), // Center align
        ...textToBytes("-----Thank You Visit Again!-----\n"),
        ...textToBytes("https://menumitra.com\n"),
        ...textToBytes("\x1D\x56\x42\x40") // Cut paper
      );

      return commands;
    } catch (error) {
      console.error("Error generating printer commands:", error);
      throw error;
    }
  };

  // Add this function for thermal printing

  // Add KOT-specific command generator
  const generateKOTCommands = async (orderData) => {
    try {
      // Initialize with printer reset
      let commands = [...COMMANDS.INITIALIZE];

      // Get restaurant name and current date/time
      const [outletName, outletAddress, outletMobile] = await Promise.all([
        AsyncStorage.getItem("outlet_name"),
        AsyncStorage.getItem("outlet_address"),
        AsyncStorage.getItem("outlet_mobile"),
      ]);

      // Use the top-level getCurrentDateTime function

      // FIXED: Get order number with enhanced fallbacks to match owner app
      const orderNumber =
        orderData?.lists?.order_details?.order_number || // Old format from API
        orderData?.order_details?.order_number || // Format from order details
        orderData?.order_number || // Direct format for new orders
        params?.orderNumber || // URL param fallback (adds this case)
        params?.orderId || // Last fallback
        "New";

      console.log("Using order number for KOT:", orderNumber);

      // Determine order type
      const orderType = params?.orderType || "dine-in";
      const orderTypeFormatted =
        orderTypeMap[orderType] ||
        orderType.charAt(0).toUpperCase() + orderType.slice(1);

      const getDottedLine = () => "------------------------------\n";

      // Create header
      commands.push(
        ...textToBytes("\x1B\x61\x01"), // Center alignment
        ...textToBytes("\x1B\x21\x10"), // Double height
        ...textToBytes("*** KOT ***\n\n"),
        ...textToBytes("\x1B\x21\x00"), // Normal text
        ...textToBytes(`${outletName || "Restaurant"}\n`),
        ...textToBytes(`${outletAddress || ""}\n`),
        ...textToBytes(`${outletMobile || ""}\n\n`),

        ...textToBytes("\x1B\x61\x00"), // Left align
        ...textToBytes(`Bill no: ${orderNumber}\n`)
      );

      // Show different order information based on order type
      if (orderType === "dine-in") {
        // For dine-in orders, show table information
        commands.push(
          ...textToBytes(
            `Table: ${params?.sectionName || ""}${
              params?.tableNumber ? ` - ${params.tableNumber}` : ""
            }\n`
          )
        );
      } else {
        // For other order types, show the order type
        commands.push(...textToBytes(`Type: ${orderTypeFormatted}\n`));
      }

      commands.push(
        ...textToBytes(
          `DateTime: ${
            orderData?.datetime
              ? formatTime(orderData.datetime)
              : getCurrentDateTime()
          }\n`
        ),

        ...(customerDetails?.customer_name
          ? [textToBytes(`Name: ${customerDetails.customer_name}\n`)]
          : []),

        ...textToBytes(getDottedLine()),
        ...textToBytes("Item                    Qty\n"),
        ...textToBytes(getDottedLine())
      );

      // Add menu items
      let totalQty = 0;

      // Use the items from the order, if available
      const items = selectedItems || [];

      // Make sure items exist and handle safely
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item) continue;

          try {
            const itemName = item.menu_name || item.name || "Unknown Item";
            const quantity = parseInt(item.quantity) || 0;
            totalQty += quantity;

            // Format item line (left-aligned item name, right-aligned quantity)
            let line = itemName;

            // Append portion size if applicable
            if (item.portionSize && item.portionSize.toLowerCase() !== "full") {
              line += ` (${item.portionSize})`;
            }

            // Add instructions if available
            let instructions = "";
            if (item.specialInstructions) {
              instructions = `  * ${item.specialInstructions}`;
            }

            // Truncate and pad the line
            if (line.length > 22) {
              line = line.substring(0, 19) + "...";
            }

            // Pad with spaces to align quantity
            const padding = 22 - line.length;
            line += " ".repeat(padding > 0 ? padding : 1) + quantity.toString();

            commands.push(...textToBytes(line + "\n"));

            // Add instructions on next line if present
            if (instructions) {
              commands.push(
                ...textToBytes("\x1B\x21\x00"), // Normal size
                ...textToBytes(instructions + "\n")
              );
            }
          } catch (itemError) {
            console.error("Error processing item for KOT:", itemError);
            // Continue with next item instead of crashing
            continue;
          }
        }
      }

      // Add footer
      commands.push(
        ...textToBytes(getDottedLine()),
        ...textToBytes(`Total Items: ${totalQty}\n\n`),
        ...textToBytes("\x1B\x61\x01"), // Center alignment
        ...textToBytes("*** KITCHEN COPY ***\n\n\n"),
        ...textToBytes("\x1D\x56\x42\x40") // Cut paper
      );

      return commands;
    } catch (error) {
      console.error("Error generating KOT commands:", error);
      throw new Error(
        "Failed to generate KOT data: " + (error.message || "Unknown error")
      );
    }
  };

  // Add this function to generate receipt HTML

  // Add this function to generate KOT HTML

  // Add this component for the device selection modal
  const DeviceSelectionModal = ({ visible, onClose }) => {
    if (!visible) return null;

    return (
      <Modal isOpen={visible} onClose={onClose} avoidKeyboard size="lg">
        <Modal.Content>
          <Modal.CloseButton />
          <Modal.Header>Select Printer</Modal.Header>
          <Modal.Body>
            {printerScanning ? (
              <HStack
                space={2}
                justifyContent="center"
                alignItems="center"
                my={4}
              >
                <Spinner size="sm" color="blue.500" />
                <Text>Scanning for printers...</Text>
              </HStack>
            ) : printerDevices.length === 0 ? (
              <VStack space={4} alignItems="center">
                <Text>No printers found.</Text>
                <Button
                  leftIcon={
                    <Icon as={MaterialIcons} name="refresh" size="sm" />
                  }
                  onPress={() => {
                    scanForPrinters();
                  }}
                >
                  Scan Again
                </Button>
              </VStack>
            ) : (
              <VStack space={3}>
                <Text mb={2}>Available Printers:</Text>
                <ScrollView maxH="300px">
                  {printerDevices.map((device) => (
                    <Pressable
                      key={device.id}
                      onPress={() => handleDeviceSelection(device)}
                      bg="coolGray.100"
                      _pressed={{ bg: "coolGray.200" }}
                      px={4}
                      py={3}
                      borderRadius="md"
                      mb={2}
                    >
                      <HStack
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <VStack>
                          <Text fontWeight="500">
                            {device.name || "Unknown Device"}
                          </Text>
                          <Text fontSize="xs" color="coolGray.500">
                            {device.id}
                          </Text>
                        </VStack>
                        <Icon
                          as={MaterialIcons}
                          name="print"
                          size="sm"
                          color="blue.500"
                        />
                      </HStack>
                    </Pressable>
                  ))}
                </ScrollView>
                <Button
                  mt={2}
                  leftIcon={
                    <Icon as={MaterialIcons} name="refresh" size="sm" />
                  }
                  variant="outline"
                  onPress={() => {
                    scanForPrinters();
                  }}
                >
                  Scan Again
                </Button>
              </VStack>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button.Group space={2}>
              <Button variant="ghost" colorScheme="blueGray" onPress={onClose}>
                Cancel
              </Button>
            </Button.Group>
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
      // Critical check for valid input
      if (selectedItems.length === 0) {
        toast.show({
          description: "Please add items to the order",
          status: "warning",
        });
        return;
      }

      // Standard action check - determine if status update needed
      const shouldUpdateStatus = [
        "KOT_and_save",
        "print_and_save",
        "settle",
      ].includes(orderStatus);

      // Get required authentication and device info
      const [accessToken, storedUserId, storedOutletId, deviceToken] =
        await Promise.all([
          AsyncStorage.getItem("access"),
          AsyncStorage.getItem("user_id"),
          AsyncStorage.getItem("outlet_id"),
          AsyncStorage.getItem("device_token"),
        ]);

      // Standard validation
      if (!storedUserId || !storedOutletId) {
        throw new Error("Missing required information");
      }

      // Payment status handling matching Owner App
      const paymentStatus = isPaid
        ? "paid"
        : isComplementary
        ? "complementary"
        : "unpaid";
      const effectivePaymentMethod = isPaid ? paymentMethod.toLowerCase() : "";

      // Log order type for debugging
      console.log("Processing order type:", orderType);

      // Build order data with all required fields
      const orderData = {
        user_id: storedUserId?.toString(),
        outlet_id: storedOutletId?.toString(),
        order_type: orderType,
        order_items: selectedItems.map((item) => ({
          menu_id: item.menu_id?.toString(),
          quantity: parseInt(item.quantity) || 1,
          comment: item.specialInstructions || "",
          half_or_full: (item.portionSize || "full").toLowerCase(),
          price: parseFloat(item.price) || 0,
          total_price: parseFloat(item.total_price) || 0,
        })),
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
        customer_alternate_mobile:
          customerDetails.customer_alternate_mobile || "",
        customer_address: customerDetails.customer_address || "",
        customer_landmark: customerDetails.customer_landmark || "",
        device_token: deviceToken || "", // Include device token
      };

      // Add table info based on order type
      if (orderType === "dine-in") {
        if (!params.tableNumber || !params.sectionId) {
          throw new Error(
            "Missing table or section information for dine-in order"
          );
        }
        orderData.tables = [params.tableNumber?.toString()];
        orderData.section_id = params.sectionId?.toString();
        console.log("Added table/section info for dine-in order");
      } else if (orderType === "counter") {
        // For counter orders, explicitly set no table/section
        console.log("Processing counter order - no table/section required");
      } else if (
        orderType === "delivery" ||
        orderType === "drive-through" ||
        orderType === "parcel"
      ) {
        // For other order types, no table/section needed
        console.log(
          `Processing ${orderType} order - no table/section required`
        );
      } else {
        // Invalid order type
        throw new Error(`Invalid order type: ${orderType}`);
      }

      // Add order_id for updates
      if (params?.orderId) {
        orderData.order_id = params.orderId?.toString();
      }

      // Before making the API call
      const isExistingOrder = Boolean(params?.orderId);
      const endpoint = isExistingOrder
        ? onGetProductionUrl() + "update_order"
        : onGetProductionUrl() + "create_order";

      console.log("Order operation:", isExistingOrder ? "Update" : "Create");
      console.log("Order ID:", params?.orderId);

      // Make API request
      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      // Error handling
      if (response.st !== 1) {
        throw new Error(response.msg || "Failed to process order");
      }

      // Status update for certain actions (matching Owner App)
      if (shouldUpdateStatus) {
        try {
          const statusRequestBody = {
            outlet_id: storedOutletId?.toString(),
            order_id: params?.orderId || response.order_id,
            order_status:
              orderStatus === "KOT_and_save"
                ? "placed"
                : isPaid
                ? "paid"
                : orderStatus === "settle"
                ? "paid"
                : "placed",
            user_id: storedUserId?.toString(),
            action: orderStatus,
            // For KOT orders, don't change payment status
            is_paid: orderStatus === "KOT_and_save" ? null : paymentStatus,
            payment_method:
              orderStatus === "KOT_and_save" ? "" : effectivePaymentMethod,
            device_token: deviceToken || "",
            customer_name: customerDetails.customer_name || "",
            customer_mobile: customerDetails.customer_mobile || "",
            user_name: customerDetails.customer_name || params.userName || "",
            user_mobile:
              customerDetails.customer_mobile || params.userMobile || "",
            tip: tip?.toString(),
            special_discount: specialDiscount?.toString(),
            charges: extraCharges?.toString(),
            order_type: orderType, // Add order type to status update
          };

          // Only add table/section info for dine-in orders in status update
          if (orderType === "dine-in") {
            if (!params.tableNumber || !params.sectionId) {
              throw new Error(
                "Missing table or section information for dine-in order"
              );
            }
            statusRequestBody.tables = [params.tableNumber?.toString()];
            statusRequestBody.section_id = params.sectionId?.toString();
          }

          console.log("Updating order status with:", {
            orderStatus,
            isPaid,
            paymentStatus: statusRequestBody.is_paid,
            orderType,
          });

          const statusResponse = await fetchWithAuth(
            onGetProductionUrl() + "update_order_status",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(statusRequestBody),
            }
          );

          if (statusResponse.st !== 1) {
            console.warn("Order status update warning:", statusResponse.msg);
          }
        } catch (statusError) {
          console.error("Failed to update order status:", statusError);
        }
      }

      // Return response for callers that need it
      if (returnResponse) {
        return response;
      }

      // Success message
      const actionMessages = {
        create_order: `Order ${
          params?.orderId ? "updated" : "created"
        } successfully`,
        saved: "Order saved successfully",
        settle: "Order settled successfully",
        KOT_and_save: "Order saved with KOT successfully",
        print_and_save: "Order saved for printing successfully",
      };

      toast.show({
        description:
          actionMessages[orderStatus] || "Order processed successfully",
        status: "success",
        duration: 3000,
      });

      return response;
    } catch (error) {
      console.error(`${orderStatus} Error:`, error);
      throw error;
    }
  };

  // Add a useEffect to track selectedItems changes
  useEffect(() => {
    console.log(
      "selectedItems state changed - new count:",
      selectedItems.length
    );
    if (selectedItems.length > 0) {
      console.log(
        "First few items:",
        JSON.stringify(selectedItems.slice(0, 3))
      );
    }
  }, [selectedItems]);

  const handleForceCancel = async () => {
    try {
      if (!params?.orderId) {
        toast.show({
          description: "No order to cancel",
          status: "warning",
        });
        return;
      }

      const storedUserId = await AsyncStorage.getItem("user_id");
      if (!storedUserId) {
        toast.show({
          description: "User ID not found",
          status: "error",
        });
        return;
      }

      const response = await fetchWithAuth(
        `${onGetProductionUrl()}force_cancel_order`,
        {
          method: "POST",
          body: JSON.stringify({
            order_id: params.orderId,
            user_id: storedUserId,
          }),
        }
      );

      if (response.st === 1) {
        toast.show({
          description: "Order cancelled successfully",
          status: "success",
        });
        router.replace("/(tabs)/tables/sections");
      } else {
        toast.show({
          description: response.msg || "Failed to cancel order",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.show({
        description: "Failed to cancel order",
        status: "error",
      });
    }
  };

  // Add Printer Status Indicator component
  const PrinterStatusIndicator = () => (
    <Pressable
      onPress={openPrinterSelectionModal}
      position="absolute"
      top={4}
      right={4}
      flexDirection="row"
      alignItems="center"
      bg={printerConnected ? "success.100" : "coolGray.100"}
      px={3}
      py={2}
      borderRadius="full"
      zIndex={999}
    >
      <Icon
        as={MaterialIcons}
        name="print"
        size="sm"
        color={printerConnected ? "success.600" : "coolGray.500"}
        mr={1}
      />
      <Text
        fontSize="xs"
        color={printerConnected ? "success.600" : "coolGray.500"}
      >
        {printerConnected
          ? `Printer: ${
              contextPrinterDevice?.name?.substring(0, 15) || "Connected"
            }`
          : "Connect Printer"}
      </Text>
    </Pressable>
  );

  const getDottedLine = () => "------------------------------\n";

  const centerText = (text) => {
    // For standard 58mm receipt printers (32 characters per line)
    const maxLength = 32;

    if (text.length >= maxLength) {
      return text;
    }

    const padLength = Math.floor((maxLength - text.length) / 2);
    return " ".repeat(padLength) + text + "\n";
  };

  // Add this function after the handleKOT function
  const handleKOTAndSave = async () => {
    try {
      // Check if we're connected to a printer
      if (!printerConnected || !contextPrinterDevice) {
        Alert.alert(
          "Printer Not Connected",
          "Do you want to connect a printer?",
          [
            {
              text: "Yes",
              onPress: () => setIsDeviceSelectionModalVisible(true),
            },
            {
              text: "Skip Printing",
              style: "cancel",
              onPress: async () => {
                // Just save the order without printing
                try {
                  setIsProcessing(true);
                  setLoadingMessage("Saving order...");

                  // Save order without printing
                  const savedOrder = await createOrder("KOT_and_save");

                  if (savedOrder) {
                    toast.show({
                      description: "Order saved successfully",
                      status: "success",
                      duration: 2000,
                    });

                    // Navigate back to tables view
                    router.replace({
                      pathname: "/(tabs)/tables/sections",
                      params: {
                        refresh: Date.now().toString(),
                        status: "completed",
                      },
                    });
                  }
                } catch (error) {
                  console.error("Save order error:", error);
                  toast.show({
                    description: "Error saving order: " + error.message,
                    status: "error",
                    duration: 3000,
                  });
                } finally {
                  setIsProcessing(false);
                  setLoadingMessage("");
                }
              },
            },
          ]
        );
        return;
      }

      // Verify printer connection is stable before KOT printing
      try {
        if (contextPrinterDevice.isConnected) {
          const isDeviceConnected = await contextPrinterDevice.isConnected();
          if (!isDeviceConnected) {
            console.log(
              "Device reports as not connected for KOT despite context state"
            );
            throw new Error("Printer connection not stable for KOT");
          }
          console.log("Printer verified as ready for KOT");
        }
      } catch (connectionError) {
        console.error("KOT printer verification error:", connectionError);
        Alert.alert(
          "Printer Connection Error",
          "Please disconnect and reconnect your printer before printing KOT",
          [
            {
              text: "Reconnect Printer",
              onPress: () => setIsDeviceSelectionModalVisible(true),
            },
            {
              text: "Skip Printing and Save",
              style: "cancel",
              onPress: async () => {
                // Continue with just saving logic...
              },
            },
          ]
        );
        return;
      }

      // Continue with original KOT and Save logic
      if (selectedItems.length === 0) {
        toast.show({
          description: "Please add items to the order",
          status: "warning",
          duration: 2000,
        });
        return;
      }

      setIsProcessing(true);
      setLoadingMessage("Processing KOT and saving order...");

      try {
        // Create order with "save" status
        const apiResponse = await createOrder("KOT_and_save", true);
        if (!apiResponse || apiResponse.st !== 1) {
          throw new Error(apiResponse?.msg || "Failed to save order");
        }

        // ADDED: Enhanced debugging for KOT order number issue
        console.log(
          "API Response for KOT_and_save:",
          JSON.stringify(apiResponse)
        );
        console.log(
          "Order number from API KOT response:",
          apiResponse?.order_number ||
            apiResponse?.lists?.order_details?.order_number ||
            "Not found in KOT API response"
        );
        console.log("KOT Params:", {
          orderIdParam: params?.orderId,
          orderNumberParam: params?.orderNumber,
        });

        // Print KOT
        try {
          setLoadingMessage("Printing KOT...");
          await printKOT(apiResponse);

          toast.show({
            description: "Order saved and KOT printed successfully",
            status: "success",
            duration: 2000,
          });
        } catch (printError) {
          console.error("KOT print error:", printError);
          // Continue even with print error
          toast.show({
            description:
              "Order saved but KOT printing failed: " + printError.message,
            status: "warning",
            duration: 3000,
          });
        }

        // Navigate back to tables screen
        router.replace({
          pathname: "/(tabs)/tables/sections",
          params: {
            refresh: Date.now().toString(),
            status: "completed",
          },
        });
      } catch (error) {
        console.error("KOT and Save error:", error);
        toast.show({
          description: "Error saving order: " + error.message,
          status: "error",
          duration: 3000,
        });
      } finally {
        setIsProcessing(false);
        setLoadingMessage("");
      }
    } catch (error) {
      console.error("KOT and Save error:", error);
      toast.show({
        description: "Error: " + error.message,
        status: "error",
        duration: 3000,
      });
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  // Update this function to handle table reservation properly
  const handleTableReservation = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage("Reserving table...");

      // Get stored outlet ID and user ID
      const [storedOutletId, storedUserId] = await Promise.all([
        AsyncStorage.getItem("outlet_id"),
        AsyncStorage.getItem("user_id"),
      ]);

      if (!storedOutletId || !params.tableId || !storedUserId) {
        throw new Error("Missing outlet, user, or table data");
      }

      // Call the API to reserve the table
      const response = await fetchWithAuth(
        onGetProductionUrl() + "table_is_reserved",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            table_id: params.tableId.toString(),
            table_number: params.tableNumber.toString(),
            outlet_id: storedOutletId.toString(),
            is_reserved: true,
            user_id: storedUserId.toString(),
          }),
        }
      );

      if (response.st === 1) {
        toast.show({
          description: "Table has been reserved",
          status: "success",
          duration: 2000,
        });

        // Navigate to tables screen to refresh
        router.replace({
          pathname: "/(tabs)/tables",
          params: {
            refresh: Date.now().toString(),
            status: "completed",
          },
        });
      } else {
        toast.show({
          description: response.msg || "Failed to reserve table",
          status: "error",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error reserving table:", error);
      toast.show({
        description: "Failed to reserve table",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleSaveOrder = async () => {
    try {
      if (selectedItems.length === 0) {
        toast.show({
          description: "Please add items to the order",
          status: "warning",
          duration: 2000,
        });
        return;
      }

      setIsProcessing(true);
      setLoadingMessage("Saving order...");

      // Create order with "save" status
      const apiResponse = await createOrder("save", true);

      if (!apiResponse || apiResponse.st !== 1) {
        throw new Error(apiResponse?.msg || "Failed to save order");
      }

      // Update the order status to "cooking" via a separate call
      try {
        const [storedUserId, storedOutletId, deviceToken] = await Promise.all([
          AsyncStorage.getItem("user_id"),
          AsyncStorage.getItem("outlet_id"),
          AsyncStorage.getItem("device_token"),
        ]);

        // Prepare status update body
        const statusRequestBody = {
          outlet_id: storedOutletId?.toString(),
          order_id: params?.orderId || apiResponse.order_id,
          order_status: "cooking", // Set status to cooking
          user_id: storedUserId?.toString(),
          action: "save",
          device_token: deviceToken || "",
          customer_name: customerDetails.customer_name || "",
          customer_mobile: customerDetails.customer_mobile || "",
          user_name: customerDetails.customer_name || params.userName || "",
          user_mobile: customerDetails.customer_mobile || params.userMobile || "",
          tip: tip?.toString(),
          special_discount: specialDiscount?.toString(),
          charges: extraCharges?.toString(),
          order_type: params?.orderType || "dine-in",
        };

        // Add table/section info for dine-in orders
        if ((params?.orderType === "dine-in" || !params?.orderType) && params.tableNumber && params.sectionId) {
          statusRequestBody.tables = [params.tableNumber?.toString()];
          statusRequestBody.section_id = params.sectionId?.toString();
        }

        await fetchWithAuth(onGetProductionUrl() + "update_order_status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(statusRequestBody),
        });

        console.log("Order status updated to cooking");
      } catch (statusError) {
        console.error("Failed to update order status to cooking:", statusError);
        // Continue even if status update fails
      }

      toast.show({
        description: "Order saved and set to cooking",
        status: "success",
        duration: 2000,
      });

      // Navigate back to tables screen
      router.replace({
        pathname: "/(tabs)/tables/sections",
        params: {
          refresh: Date.now().toString(),
          status: "completed",
        },
      });
    } catch (error) {
      console.error("Save order error:", error);
      toast.show({
        description: "Error saving order: " + error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  // Add the missing quantity functions if they don't exist
  const decreaseQuantity = (item) => {
    const updatedItems = selectedItems.map((i) => {
      if (
        i.menu_id === item.menu_id &&
        (i.portionSize === item.portionSize ||
          i.portion_size === item.portion_size)
      ) {
        if (i.quantity > 1) {
          return {
            ...i,
            quantity: i.quantity - 1,
            total_price: calculateItemTotal(i.price, i.quantity - 1, i.offer),
          };
        } else {
          // Return null when quantity is 1 to remove the item
          return null;
        }
      }
      return i;
    });

    // Filter out null values (removed items)
    const filteredItems = updatedItems.filter((item) => item !== null);
    setSelectedItems(filteredItems);
  };

  const increaseQuantity = (item) => {
    if (item.quantity < 20) {
      const updatedItems = selectedItems.map((i) => {
        if (
          i.menu_id === item.menu_id &&
          i.portion_size === item.portion_size
        ) {
          return {
            ...i,
            quantity: i.quantity + 1,
            total_price: calculateItemTotal(i.price, i.quantity + 1, i.offer),
          };
        }
        return i;
      });
      setSelectedItems(updatedItems);
    }
  };

  // Add a new function to navigate to tables
  const navigateToTables = () => {
    if (selectedItems.length > 0) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to leave?",
        [
          {
            text: "Stay",
            style: "cancel",
          },
          {
            text: "Leave",
            onPress: () => router.replace("/screens/tables"),
          },
        ]
      );
    } else {
      router.replace("/screens/tables");
    }
  };

  // Add state for tracking the current action and modal state
  const [currentAction, setCurrentAction] = useState(""); // "kot" or "settle"

  // Add the handleSettlePaymentConfirm function inside the component
  const handleSettlePaymentConfirm = async (
    modalPaymentMethod = null,
    modalIsPaidValue = null
  ) => {
    try {
      // Use modal values if provided
      const effectiveIsPaid =
        modalIsPaidValue !== null ? modalIsPaidValue : isPaid;
      const effectivePaymentMethod = modalPaymentMethod || paymentMethod;

      setIsLoading(true);
      setLoadingMessage("Processing settlement...");
      setShowPaymentModal(false);

      const [storedUserId, storedOutletId, deviceToken] = await Promise.all([
        AsyncStorage.getItem("user_id"),
        AsyncStorage.getItem("outlet_id"),
        AsyncStorage.getItem("device_token"),
      ]);

      if (!storedUserId || !storedOutletId) {
        throw new Error("Missing required information");
      }

      if (!deviceToken) {
        throw new Error("Device token is required. Please restart the app.");
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
      const paymentStatus = effectiveIsPaid
        ? "paid"
        : isComplementary
        ? "complementary"
        : "unpaid";

      // Log order type for debugging
      console.log("Processing settlement for order type:", params?.orderType);

      const orderData = {
        user_id: storedUserId?.toString(),
        outlet_id: storedOutletId?.toString(),
        order_type: params?.orderType || "dine-in", // Use the actual order type
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
        customer_alternate_mobile:
          customerDetails.customer_alternate_mobile || "",
        customer_address: customerDetails.customer_address || "",
        customer_landmark: customerDetails.customer_landmark || "",
        device_token: deviceToken,
      };

      // Add table info based on order type
      if (params?.orderType === "dine-in") {
        if (!params.tableNumber || !params.sectionId) {
          throw new Error(
            "Missing table or section information for dine-in order"
          );
        }
        orderData.tables = [params.tableNumber?.toString()];
        orderData.section_id = params.sectionId?.toString();
        console.log("Added table/section info for dine-in order");
      } else if (params?.orderType === "counter") {
        // For counter orders, explicitly set no table/section
        console.log("Processing counter order - no table/section required");
      } else if (
        ["delivery", "drive-through", "parcel"].includes(params?.orderType)
      ) {
        // For other order types, no table/section needed
        console.log(
          `Processing ${params?.orderType} order - no table/section required`
        );
      } else {
        // Invalid order type
        throw new Error(`Invalid order type: ${params?.orderType}`);
      }

      const endpoint = params?.orderId
        ? `${onGetProductionUrl()}update_order`
        : `${onGetProductionUrl()}create_order`;

      if (params?.orderId) {
        orderData.order_id = params.orderId?.toString();
      }

      console.log(
        `Making request to ${endpoint} with device_token: ${deviceToken.substring(
          0,
          10
        )}...`
      );
      // Use fetchWithAuth instead of axiosInstance to ensure proper token handling
      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (response.st !== 1) {
        throw new Error(response.msg || "Failed to settle order");
      }

      toast.show({
        description: "Order settled successfully",
        status: "success",
        duration: 3000,
      });

      // Refresh order details
      await refreshOrderDetails();

      // Navigate back to tables
      router.replace({
        pathname: "/(tabs)/tables/sections",
        params: {
          refresh: Date.now().toString(),
          status: "completed",
        },
      });
    } catch (error) {
      console.error("Error settling order:", error);
      toast.show({
        description:
          error.response?.data?.msg ||
          error.message ||
          "Failed to settle order",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // Add a handlePaymentModalConfirm function similar to the owner app
  const handlePaymentModalConfirm = () => {
    // Validate payment method selection
    if (isPaidChecked && !selectedPaymentMethod) {
      toast.show({
        description: "Please select a payment method",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    // Store values before closing modal
    const modalIsPaid = isPaidChecked;
    const modalPaymentMethod = selectedPaymentMethod;

    // Close the modal
    setShowPaymentModal(false);

    // Update isPaid state
    setIsPaid(modalIsPaid);

    // Call appropriate handler with modal values (matching Owner App)
    if (currentAction === "kot") {
      handleKOT(modalPaymentMethod, modalIsPaid);
    } else if (currentAction === "settle") {
      handleSettlePaymentConfirm(modalPaymentMethod, modalIsPaid);
    }
    // Note: Print & Save doesn't use the payment modal in Owner App
  };

  // Add handler for KOT button press
  const onKOTPress = () => {
    if (selectedItems.length === 0) {
      toast.show({
        description: "Please add items to the order",
        status: "warning",
      });
      return;
    }

    // Set the current action to 'kot'
    setCurrentAction("kot");

    // Set isPaidChecked to false by default for the modal
    setIsPaidChecked(false);

    // Show the payment modal
    setShowPaymentModal(true);
  };

  // Add handler for Settle button press
  const onSettlePress = () => {
    if (selectedItems.length === 0) {
      toast.show({
        description: "Please add items to the order",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    // Set the current action to 'settle'
    setCurrentAction("settle");

    // Set isPaidChecked to true by default for the modal
    setIsPaidChecked(true);

    // Show the payment modal
    setShowPaymentModal(true);
  };

  // Add handleCancelOrder function after handleKOTAndSave
  const handleCancelOrder = async () => {
    // Show confirmation dialog
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      {
        text: "No",
        style: "cancel",
      },
      {
        text: "Yes",
        onPress: async () => {
          try {
            setIsLoading(true);
            setLoadingMessage("Cancelling order...");

            // Check if there's a valid order_id to cancel
            const orderIdToCancel = params?.orderId;

            if (orderIdToCancel) {
              const [userId, accessToken] = await Promise.all([
                AsyncStorage.getItem("user_id"),
                AsyncStorage.getItem("access"),
              ]);

              // Use force_cancel_order API
              const response = await fetchWithAuth(
                onGetProductionUrl() + "force_cancel_order",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    order_id: orderIdToCancel.toString(),
                    user_id: userId.toString(),
                  }),
                }
              );

              if (response.st === 1) {
                toast.show({
                  description: "Order has been cancelled",
                  status: "success",
                  duration: 3000,
                });

                // Navigate to tables screen
                router.replace({
                  pathname: "/(tabs)/tables/sections",
                  params: {
                    refresh: Date.now().toString(),
                  },
                });
              } else {
                toast.show({
                  description: response.msg || "Failed to cancel order",
                  status: "error",
                  duration: 3000,
                });
              }
            } else {
              // If no existing order, just go back
              toast.show({
                description: "No valid order ID found to cancel",
                status: "warning",
                duration: 3000,
              });
              router.back();
            }
          } catch (error) {
            console.error("Error cancelling order:", error);
            toast.show({
              description:
                error.response?.data?.msg ||
                error.message ||
                "Failed to cancel the order",
              status: "error",
              duration: 3000,
            });
          } finally {
            setIsLoading(false);
            setLoadingMessage("");
          }
        },
      },
    ]);
  };

  // Add after scanForPrinters function
  const localConnectToPrinter = async (device) => {
    try {
      console.log("Attempting to connect to:", device.name || "Unknown device");
      setPrinterConnectionStatus(
        `Connecting to ${device.name || "printer"}...`
      );
      setIsProcessing(true);

      const connectedDevice = await device.connect({
        // Add these options to maintain connection
        requestMTU: 512,
        autoConnect: true,
      });

      // Monitor connection state
      device.onDisconnected((error, disconnectedDevice) => {
        if (!isDisconnecting) {
          console.log("Unexpected disconnect, attempting to reconnect...");
          // Update UI state
          toast.show({
            description: "Printer disconnected. Attempting to reconnect...",
            status: "warning",
            duration: 3000,
          });

          // Attempt to reconnect
          localConnectToPrinter(device).catch(console.error);
        }
      });

      console.log("Connected to device");
      setPrinterConnectionStatus("Discovering services...");
      const discoveredDevice =
        await connectedDevice.discoverAllServicesAndCharacteristics();

      // Update state with connected device
      setContextPrinterDevice(discoveredDevice);
      setPrinterConnected(true);
      setIsProcessing(false);
      setPrinterConnectionStatus("Connected");

      return true;
    } catch (error) {
      console.error("Connection error:", error);
      setIsProcessing(false);
      setPrinterConnectionStatus("");

      toast.show({
        description: `Failed to connect to printer: ${error.message}`,
        status: "error",
        duration: 3000,
      });

      return false;
    }
  };

  const disconnectPrinter = async () => {
    try {
      if (!contextPrinterDevice) {
        return false;
      }

      setIsDisconnecting(true);
      setPrinterConnectionStatus("Disconnecting...");

      // Use the context's disconnect function
      await contextDisconnectPrinter();

      setPrinterConnectionStatus("");

      toast.show({
        description: "Printer disconnected",
        status: "info",
        duration: 2000,
      });

      return true;
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.show({
        description: "Error disconnecting printer",
        status: "error",
        duration: 2000,
      });
      return false;
    } finally {
      setIsDisconnecting(false);
    }
  };

  const localDisconnectPrinter = async () => {
    try {
      if (!contextPrinterDevice) {
        return false;
      }

      setIsDisconnecting(true);
      setPrinterConnectionStatus("Disconnecting...");

      // Use the context's disconnect function
      await contextDisconnectPrinter();

      setPrinterConnectionStatus("");

      toast.show({
        description: "Printer disconnected",
        status: "info",
        duration: 2000,
      });

      return true;
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.show({
        description: "Error disconnecting printer",
        status: "error",
        duration: 2000,
      });
      return false;
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Add useEffect to load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem("app_settings");
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          setSettings({
            orderManagement: {
              print_and_save: parsedSettings.print_and_save,
              KOT_and_save: parsedSettings.KOT_and_save,
              settle: parsedSettings.settle,
              reserve_table: parsedSettings.reserve_table,
              cancel: parsedSettings.cancel,
            },
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    loadSettings();
  }, []);

  // Add this function to match the owner app's calculation
  const getDiscountPercentage = () => {
    // Using the formula provided in the requirements (sum of all offers)
    return selectedItems.reduce((acc, item) => {
      const offer = parseFloat(item.offer) || 0;
      return acc + offer; // Simply summing up all offers
    }, 0);
  };

  // Handler for Print & Save button
  const onPrintAndSavePress = () => {
    if (selectedItems.length === 0) {
      toast.show({
        description: "Please add items to the order",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    // Direct call matching Owner App - no payment modal
    handlePrintAndSave();
  };

  // Consolidated print & save function
  const handlePrintAndSave = async () => {
    try {
      setIsProcessing(true);
      setLoadingMessage("Processing print and save...");

      // Check printer - could be extracted to a util function
      if (!printerConnected || !contextPrinterDevice) {
        Alert.alert(
          "Printer Not Connected",
          "Do you want to connect a printer?",
          [
            {
              text: "Yes",
              onPress: () => setIsDeviceSelectionModalVisible(true),
            },
            {
              text: "Skip Printing",
              style: "cancel",
              onPress: async () => {
                try {
                  const savedOrder = await createOrder("print_and_save");
                  if (savedOrder) {
                    toast.show({
                      description: "Order saved successfully",
                      status: "success",
                      duration: 2000,
                    });
                    router.replace({
                      pathname: "/(tabs)/tables/sections",
                      params: {
                        refresh: Date.now().toString(),
                        status: "completed",
                      },
                    });
                  }
                } catch (error) {
                  console.error("Save order error:", error);
                  toast.show({
                    description: "Error saving order: " + error.message,
                    status: "error",
                    duration: 3000,
                  });
                } finally {
                  setIsProcessing(false);
                  setLoadingMessage("");
                }
              },
            },
          ]
        );
        return;
      }

      // Create order with print_and_save status
      const apiResponse = await createOrder("print_and_save", true);

      // ADDED: Enhanced debugging for order number issue
      console.log(
        "API Response for print_and_save:",
        JSON.stringify(apiResponse)
      );
      console.log(
        "Order number from API response:",
        apiResponse?.order_number ||
          apiResponse?.lists?.order_details?.order_number ||
          "Not found in API response"
      );
      console.log("Params for order number:", {
        orderIdParam: params?.orderId,
        orderNumberParam: params?.orderNumber,
      });

      // Print receipt
      try {
        setLoadingMessage("Printing receipt...");
        await printReceipt(apiResponse);
        toast.show({
          description: "Order saved and receipt printed successfully",
          status: "success",
          duration: 2000,
        });
      } catch (printError) {
        console.error("Print error:", printError);
        toast.show({
          description: "Order saved but printing failed: " + printError.message,
          status: "warning",
          duration: 3000,
        });
      }

      // Navigate back to tables
      router.replace({
        pathname: "/(tabs)/tables/sections",
        params: { refresh: Date.now().toString(), status: "completed" },
      });
    } catch (error) {
      console.error("Print and Save error:", error);
      toast.show({
        description: "Error: " + error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  // Add this useEffect after your state declarations
  useEffect(() => {
    // Parse the orderDetails from params
    if (params.orderDetails) {
      try {
        const orderDetailsObj = JSON.parse(params.orderDetails);

        // Set the values from params, with proper type handling
        setSpecialDiscount(orderDetailsObj.special_discount?.toString() || "0");
        setExtraCharges(orderDetailsObj.charges?.toString() || "0");
        setTip(orderDetailsObj.tip?.toString() || "0");

        console.log("Initialized values from params:", {
          special_discount: orderDetailsObj.special_discount,
          charges: orderDetailsObj.charges,
          tip: orderDetailsObj.tip,
        });
      } catch (error) {
        console.error("Error parsing orderDetails:", error);
      }
    }
  }, [params.orderDetails]); // Only run when orderDetails changes

  // Then update the input section to handle the values properly:
  {
    showDiscountPanel && (
      <Box px={4} pb={4}>
        <HStack space={2} justifyContent="space-between" mb={3}>
          <VStack flex={1}>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Special Discount
            </Text>
            <Input
              keyboardType="numeric"
              value={specialDiscount}
              onChangeText={(text) => {
                // Ensure we handle empty input and non-numeric values
                const value = text.trim() === "" ? "0" : text;
                if (/^\d*\.?\d*$/.test(value)) {
                  setSpecialDiscount(value);
                }
              }}
              variant="outline"
              size="sm"
              bg="white"
              placeholder="0"
              borderColor="gray.300"
            />
          </VStack>

          <VStack flex={1}>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Extra Charges
            </Text>
            <Input
              keyboardType="numeric"
              value={extraCharges}
              onChangeText={(text) => {
                const value = text.trim() === "" ? "0" : text;
                if (/^\d*\.?\d*$/.test(value)) {
                  setExtraCharges(value);
                }
              }}
              variant="outline"
              size="sm"
              bg="white"
              placeholder="0"
              borderColor="gray.300"
            />
          </VStack>

          <VStack flex={1}>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Tip
            </Text>
            <Input
              keyboardType="numeric"
              value={tip}
              onChangeText={(text) => {
                const value = text.trim() === "" ? "0" : text;
                if (/^\d*\.?\d*$/.test(value)) {
                  setTip(value);
                }
              }}
              variant="outline"
              size="sm"
              bg="white"
              placeholder="0"
              borderColor="gray.300"
            />
          </VStack>
        </HStack>

        {/* Rest of your checkbox code remains the same */}
      </Box>
    );
  }

  // Validate order type and params on mount
  useEffect(() => {
    // Get the order type from params or default to dine-in
    const currentOrderType = params.orderType || "dine-in";

    // Log the validation (once)
    console.log("Validating order type:", currentOrderType);

    // Only update state if the order type has changed
    if (orderType !== currentOrderType) {
      setOrderType(currentOrderType);
    }

    // Only validate table/section for dine-in orders
    if (currentOrderType === "dine-in") {
      if (!params.tableNumber || !params.sectionId) {
        console.warn("Missing table/section info for dine-in order");
      }
    } else if (currentOrderType === "counter") {
      // For counter orders, clear any table/section info
      // Only update if current values don't match
      if (
        currentTableNumber !== "" ||
        currentSectionId !== "" ||
        currentSectionName !== ""
      ) {
        setCurrentTableNumber("");
        setCurrentSectionId("");
        setCurrentSectionName("");
      }
      console.log("Counter order - cleared table/section info");
    }

    // This function doesn't need to be recreated on every render
  }, [params?.orderType, orderType, params?.tableNumber, params?.sectionId]); // Specific dependencies

  // Add this useEffect after the state declarations
  useEffect(() => {
    // Initialize customer details from params
    if (params) {
      setCustomerDetails((prevDetails) => ({
        ...prevDetails,
        customer_address: params.customer_address || "",
        customer_alternate_mobile: params.customer_alternate_mobile || "",
        customer_landmark: params.customer_landmark || "",
      }));
    }
  }, [params]); // Only run when params change

  // Add this state for UPI ID after other state declarations
  const [displayUpiId, setDisplayUpiId] = useState("Loading UPI ID...");

  // Add this useEffect to fetch and display UPI ID
  useEffect(() => {
    const fetchUpiId = async () => {
      const upiId = await getUpiId();
      setDisplayUpiId(upiId);
    };

    fetchUpiId();
  }, []);

  return (
    <Box flex={1} bg="white" safeArea>
      <Header
        title={
          params?.orderId
            ? "Update Order"
            : params?.orderType
            ? `Create ${
                params.orderType === "drive-through"
                  ? "Drive"
                  : params.orderType
                      .split("-")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" ")
              } Order`
            : "Create Order"
        }
        onBackPress={() =>
          router.replace({
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
                grand_total: calculateTotal(
                  selectedItems,
                  serviceChargePercentage,
                  gstPercentage
                ),
                table_id: params.tableId,
                table_number: params.tableNumber,
                section_id: params.sectionId,
                section_name: params.sectionName,
                outlet_id: params.outletId,
              }),
            },
          })
        }
        rightComponent={
          <Box position="relative">
            <OrderBadge />
          </Box>
        }
      />

      {/* Display UPI ID for testing purposes */}
      {/* <Box bg="coolGray.100" px={4} py={2} mb={2}>
        <HStack alignItems="center" space={2}>
          <Icon as={MaterialIcons} name="account-balance-wallet" size="sm" color="blue.500" />
          <Text fontWeight="medium">UPI ID: <Text color="blue.600">{displayUpiId}</Text></Text>
        </HStack>
      </Box> */}

      {/* <PrinterStatusIndicator /> */}

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

            {/* Add More Items Button - make it blue and full-width */}
            <Button
              mb={2}
              leftIcon={
                <Icon as={MaterialIcons} name="add" size="sm" color="white" />
              }
              bg="#00B0F0"
              _text={{ color: "white", fontWeight: "semibold" }}
              _pressed={{ bg: "#00A0E0" }}
              onPress={() =>
                router.replace({
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
                      grand_total: calculateTotal(
                        selectedItems,
                        serviceChargePercentage,
                        gstPercentage
                      ),
                      table_id: params.tableId,
                      table_number: params.tableNumber,
                      section_id: params.sectionId,
                      section_name: params.sectionName,
                      outlet_id: params.outletId,
                    }),
                  },
                })
              }
              borderRadius="md"
              height={12}
              w="100%"
            >
              Add More Items
            </Button>

            {/* Customer Details Section - adjust to match screenshot */}
            <HStack space={2} mt={1} mb={3}>
              <Input
                flex={1}
                placeholder="Customer Name"
                value={customerDetails.customer_name}
                onChangeText={(text) =>
                  handleCustomerDetailsChange("customer_name", text)
                }
                borderColor={
                  customerDetails.customer_name &&
                  !validateName(customerDetails.customer_name)
                    ? "red.500"
                    : "gray.300"
                }
                bg="white"
                fontSize="sm"
                height={12}
                borderRadius="md"
              />
              <Input
                flex={1}
                placeholder="Mobile Number"
                value={customerDetails.customer_mobile}
                onChangeText={(text) => {
                  // Check if first digit is between 0-5
                  if (text.length > 0 && /^[0-5]/.test(text)) {
                    // Clear the entire input if it starts with 0-5
                    text = "";
                    // Set validation error message
                    setValidationErrors((prev) => ({
                      ...prev,
                      invalidMobileStart: true,
                    }));
                  } else if (text.length > 0) {
                    // Clear the validation error when valid digit entered
                    setValidationErrors((prev) => ({
                      ...prev,
                      invalidMobileStart: false,
                    }));
                  }
                  handleCustomerDetailsChange("customer_mobile", text);
                }}
                keyboardType="numeric"
                maxLength={10}
                borderColor={
                  customerDetails.customer_mobile &&
                  (!validateMobileNumber(customerDetails.customer_mobile) ||
                    customerDetails.customer_mobile.length !== 10 ||
                    validationErrors?.invalidMobileStart)
                    ? "red.500"
                    : "gray.300"
                }
                bg="white"
                fontSize="sm"
                height={12}
                borderRadius="md"
              />
              <IconButton
                icon={
                  <Icon
                    as={MaterialIcons}
                    name="add"
                    size="sm"
                    color="gray.600"
                  />
                }
                borderRadius="md"
                bg="gray.100"
                borderWidth={1}
                borderColor="gray.300"
                onPress={() => setShowCustomerDetailsModal(true)}
                height={12}
                width={12}
              />
            </HStack>
            {validationErrors?.invalidMobileStart && (
              <Text color="red.500" fontSize="xs" mt={-1} mb={2}>
                Mobile number cannot start with digits 0-5
              </Text>
            )}

            <Box flex={1}>
              <ScrollView
                flex={1}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{
                  paddingBottom: selectedItems.length > 0 ? 150 : 20,
                }}
                nestedScrollEnabled={true}
              >
                <VStack space={2} mb={0}>
                  {/* Add Items Count and Clear All row */}
                  <HStack
                    justifyContent="space-between"
                    alignItems="center"
                    pb={2}
                    pt={2}
                  >
                    <Text color="gray.700">
                      {selectedItems.length}{" "}
                      {selectedItems.length === 1 ? "Item" : "Items"}
                    </Text>
                    {!isExistingOrder && selectedItems.length > 0 && (
                      <Pressable
                        onPress={() => {
                          setSelectedItems([]);
                          toast.show({
                            description: "All items cleared",
                            status: "info",
                            duration: 2000,
                          });
                        }}
                      >
                        <Text color="gray.500">Clear All</Text>
                      </Pressable>
                    )}
                  </HStack>

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
                      <MaterialIcons name="store" size={48} color="gray" />
                      <Text color="coolGray.400" mt={2}>
                        No items added to order
                      </Text>
                    </Box>
                  ) : (
                    <>
                      {/* Simplified item display */}
                      {selectedItems.map((item, index) => (
                        <Box
                          key={index}
                          bg="white"
                          px={4}
                          py={3}
                          mb={1}
                          borderBottomWidth={1}
                          borderBottomColor="gray.200"
                        >
                          <HStack
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <VStack flex={1}>
                              <Text fontWeight="bold" fontSize={16}>
                                {item.menu_name || item.name}
                              </Text>
                              {item.offer > 0 && (
                                <Text color="green.600" fontSize="xs" ml={1}>
                                  ({item.offer}% OFF)
                                </Text>
                              )}
                              <HStack alignItems="center" mt={2}>
                                <Pressable
                                  onPress={() => decreaseQuantity(item)}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: "#f0f0f0",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginRight: 8,
                                  }}
                                >
                                  <Text fontSize={18}>-</Text>
                                </Pressable>
                                <Text fontSize={16} fontWeight="bold" mx={1}>
                                  {item.quantity}
                                </Text>
                                <Pressable
                                  onPress={() => increaseQuantity(item)}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: "#f0f0f0",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginLeft: 8,
                                  }}
                                >
                                  <Text fontSize={18}>+</Text>
                                </Pressable>
                              </HStack>
                            </VStack>
                            <VStack alignItems="flex-end" ml={4}>
                              <Text color="gray.500" fontSize="sm">
                                Price :{" "}
                                <Text color="blue.600" fontWeight="bold">
                                  ₹{item.price.toFixed(2)}
                                </Text>
                              </Text>
                              <Text color="gray.500" fontSize="sm">
                                Total :{" "}
                                <Text color="blue.600" fontWeight="bold">
                                  ₹{(item.price * item.quantity).toFixed(2)}
                                </Text>
                              </Text>
                            </VStack>
                            <Pressable
                              onPress={() =>
                                removeFromCart(item.menu_id, item.portion_size)
                              }
                              ml={2}
                            >
                              <Icon
                                as={MaterialIcons}
                                name="close"
                                size="sm"
                                color="red.500"
                              />
                            </Pressable>
                          </HStack>
                        </Box>
                      ))}
                    </>
                  )}
                </VStack>
              </ScrollView>
            </Box>

            {/* Update the collapsible section with discount fields */}
            {selectedItems.length > 0 && (
              <Box width="100%">
                {/* Collapsible discount panel */}
                <Box
                  width="100%"
                  bg="white"
                  borderRadius="lg"
                  shadow={2}
                  mb={2}
                >
                  <Pressable
                    onPress={() => setShowDiscountPanel(!showDiscountPanel)}
                    py={2}
                    alignItems="center"
                  >
                    <Icon
                      as={MaterialIcons}
                      name={
                        showDiscountPanel
                          ? "keyboard-arrow-up"
                          : "keyboard-arrow-down"
                      }
                      size="md"
                      color="gray.500"
                    />
                  </Pressable>

                  {showDiscountPanel && (
                    <Box px={4} pb={4}>
                      <HStack space={2} justifyContent="space-between" mb={3}>
                        <VStack flex={1}>
                          <Text fontSize="xs" color="gray.500" mb={1}>
                            Special Discount
                          </Text>
                          <Input
                            keyboardType="numeric"
                            value={specialDiscount?.toString()}
                            onChangeText={(text) =>
                              setSpecialDiscount(text ? parseFloat(text) : 0)
                            }
                            variant="outline"
                            size="sm"
                            bg="white"
                            placeholder="0"
                            borderColor="gray.300"
                          />
                        </VStack>

                        <VStack flex={1}>
                          <Text fontSize="xs" color="gray.500" mb={1}>
                            Extra Charges
                          </Text>
                          <Input
                            keyboardType="numeric"
                            value={extraCharges?.toString()}
                            onChangeText={(text) =>
                              setExtraCharges(text ? parseFloat(text) : 0)
                            }
                            variant="outline"
                            size="sm"
                            bg="white"
                            placeholder="0"
                            borderColor="gray.300"
                          />
                        </VStack>

                        <VStack flex={1}>
                          <Text fontSize="xs" color="gray.500" mb={1}>
                            Tip
                          </Text>
                          <Input
                            keyboardType="numeric"
                            value={tip?.toString()}
                            onChangeText={(text) =>
                              setTip(text ? parseFloat(text) : 0)
                            }
                            variant="outline"
                            size="sm"
                            bg="white"
                            placeholder="0"
                            borderColor="gray.300"
                          />
                        </VStack>
                      </HStack>

                      <HStack
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Checkbox
                          value="complementary"
                          isChecked={isComplementary}
                          onChange={(value) => {
                            setIsComplementary(value);
                            if (value) {
                              setIsPaid(false);
                            }
                          }}
                          size="sm"
                          colorScheme="green"
                        >
                          <Text fontSize="sm">Complementary</Text>
                        </Checkbox>

                        <Checkbox
                          value="paid"
                          isChecked={isPaid}
                          onChange={(isChecked) => {
                            setIsPaidChecked(isChecked);
                          }}
                          size="lg"
                        >
                          <Text fontSize="md">Paid</Text>
                        </Checkbox>
                      </HStack>
                    </Box>
                  )}
                </Box>

                {/* Bottom section with pricing and buttons */}
                <Box
                  width="100%"
                  bg="white"
                  pb={Platform.OS === "ios" ? 8 : 4}
                  borderTopWidth={1}
                  borderTopColor="gray.200"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -3 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 3,
                  }}
                >
                  {/* Price summary row */}
                  <HStack justifyContent="space-between" mb={2} p={2}>
                    <VStack alignItems="center">
                      <Text fontWeight="semibold" fontSize="xs">
                        ₹{calculateSubtotal(selectedItems).toFixed(2)}
                      </Text>
                      <Text fontSize="2xs" color="gray.500">
                        Total
                      </Text>
                    </VStack>

                    <VStack alignItems="center">
                      <Text fontWeight="semibold" fontSize="xs" color="red.500">
                        -₹{calculateItemDiscount(selectedItems).toFixed(2)}
                      </Text>
                      <Text fontSize="2xs" color="gray.500">
                        Disc ({formatCurrency(getDiscountPercentage())}%)
                      </Text>
                    </VStack>

                    <VStack alignItems="center">
                      <Text fontWeight="semibold" fontSize="xs">
                        +₹
                        {calculateServiceCharges(
                          calculateTotalAfterDiscounts(
                            selectedItems,
                            specialDiscount
                          ) + parseFloat(extraCharges || 0),
                          serviceChargePercentage
                        ).toFixed(2)}
                      </Text>
                      <Text fontSize="2xs" color="gray.500">
                        Service ({Math.round(serviceChargePercentage)}%)
                      </Text>
                    </VStack>

                    <VStack alignItems="center">
                      <Text fontWeight="semibold" fontSize="xs">
                        +₹
                        {calculateGST(
                          calculateTotalAfterDiscounts(
                            selectedItems,
                            specialDiscount
                          ) +
                            parseFloat(extraCharges || 0) +
                            calculateServiceCharges(
                              calculateTotalAfterDiscounts(
                                selectedItems,
                                specialDiscount
                              ) + parseFloat(extraCharges || 0),
                              serviceChargePercentage
                            ),
                          gstPercentage
                        ).toFixed(2)}
                      </Text>
                      <Text fontSize="2xs" color="gray.500">
                        GST ({Math.round(gstPercentage)}%)
                      </Text>
                    </VStack>

                    <VStack alignItems="center">
                      <Text
                        fontWeight="semibold"
                        fontSize="xs"
                        color="green.500"
                      >
                        ₹
                        {calculateGrandTotal(
                          selectedItems,
                          specialDiscount,
                          extraCharges,
                          serviceChargePercentage,
                          gstPercentage,
                          tip
                        ).toFixed(2)}
                      </Text>
                      <Text fontSize="2xs" color="gray.500">
                        Grand Total
                      </Text>
                    </VStack>
                  </HStack>

                  {/* Buttons */}
                  <VStack space={1} p={2} pt={0}>
                    {/* Top row - 3 buttons, matching screenshot */}
                    <HStack space={1}>
                      {settings.orderManagement.print_and_save && (
                        <Button
                          flex={1}
                          h={10}
                          bg="#FF9800"
                          _pressed={{ bg: "#F57C00" }}
                          borderRadius="md"
                          leftIcon={
                            <Icon
                              as={MaterialIcons}
                              name="print"
                              size="sm"
                              color="white"
                            />
                          }
                          onPress={onPrintAndSavePress}
                          py={0}
                        >
                          <Text color="white" fontSize="xs">
                            Print & Save
                          </Text>
                        </Button>
                      )}

                      <Button
                        flex={1}
                        h={10}
                        bg="black"
                        _pressed={{ bg: "#333" }}
                        borderRadius="md"
                        leftIcon={
                          <Icon
                            as={MaterialIcons}
                            name="receipt"
                            size="sm"
                            color="white"
                          />
                        }
                        onPress={onKOTPress}
                        py={0}
                      >
                        <Text color="white" fontSize="xs">
                          KOT
                        </Text>
                      </Button>

                      {settings.orderManagement.settle && (
                        <Button
                          flex={1}
                          h={10}
                          bg="#00B0F0"
                          _pressed={{ bg: "#0099CC" }}
                          borderRadius="md"
                          onPress={handleSettleOrder}
                          py={0}
                        >
                          <Text color="white" fontSize="xs">
                            Settle
                          </Text>
                        </Button>
                      )}
                    </HStack>

                    {/* Middle row - Lock icon and KOT & Save */}
                    <HStack space={1}>
                      {settings.orderManagement.reserve_table && (
                        <Button
                          w="33%"
                          h={10}
                          bg="green.500"
                          _pressed={{ bg: "green.600" }}
                          borderRadius="md"
                          py={0}
                          onPress={handleSaveOrder}
                          alignItems="center"
                          justifyContent="center"
                          leftIcon={
                            <Icon
                              as={MaterialIcons}
                              name="save"
                              size="sm"
                              color="white"
                            />
                          }
                        >
                          <Text color="white">Save</Text>
                        </Button>
                      )}

                      {settings.orderManagement.KOT_and_save && (
                        <Button
                          flex={1}
                          h={10}
                          bg="black"
                          _pressed={{ bg: "#333" }}
                          borderRadius="md"
                          leftIcon={
                            <Icon
                              as={MaterialIcons}
                              name="receipt"
                              size="sm"
                              color="white"
                            />
                          }
                          onPress={handleKOTAndSave}
                          py={0}
                        >
                          <Text color="white" fontSize="xs">
                            KOT & Save
                          </Text>
                        </Button>
                      )}

                      {/* Add Cancel Order button for existing orders */}
                      {params?.orderId && settings.orderManagement.cancel && (
                        <Button
                          w="36px"
                          h={10}
                          bg="red.600"
                          _pressed={{ bg: "red.700" }}
                          borderRadius="md"
                          py={0}
                          ml={1}
                          onPress={handleCancelOrder}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Icon
                            as={MaterialIcons}
                            name="close"
                            size="sm"
                            color="white"
                          />
                        </Button>
                      )}
                    </HStack>

                    {/* Reserve Table Button - conditional */}
                    {/* {params?.orderType === "dine-in" && params?.isOccupied !== "1" && (
                      <Button
                        w="100%"
                        h={10}
                        bg="#00A67E"
                        _pressed={{ bg: "#00916A" }}
                        borderRadius="md"
                        py={0}
                        mt={1}
                        leftIcon={<Icon as={MaterialIcons} name="event-seat" size="sm" color="white" />}
                        onPress={handleTableReservation}
                      >
                        <Text color="white" fontSize="xs">Reserve Table</Text>
                      </Button>
                    )} */}
                  </VStack>
                </Box>
              </Box>
            )}
          </VStack>
        </KeyboardAvoidingView>
      )}

      {/* Customer Details Modal */}
      <Modal
        isOpen={showCustomerDetailsModal}
        onClose={() => setShowCustomerDetailsModal(false)}
      >
        <Modal.Content maxW="90%">
          <Modal.Header>
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontSize="lg" fontWeight="bold">
                Additional Customer Details
              </Text>
              <IconButton
                icon={
                  <Icon
                    as={MaterialIcons}
                    name="close"
                    size="sm"
                    color="gray.500"
                  />
                }
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
                  onChangeText={(text) =>
                    handleCustomerDetailsChange(
                      "customer_alternate_mobile",
                      text
                    )
                  }
                  keyboardType="numeric"
                  maxLength={10}
                  borderColor={
                    customerDetails.customer_alternate_mobile &&
                    customerDetails.customer_alternate_mobile.length !== 10
                      ? "red.500"
                      : "gray.300"
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
                  onChangeText={(text) =>
                    handleCustomerDetailsChange("customer_address", text)
                  }
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
                  onChangeText={(text) =>
                    handleCustomerDetailsChange("customer_landmark", text)
                  }
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
        visible={isDeviceSelectionModalVisible}
        onClose={() => setIsDeviceSelectionModalVisible(false)}
      />

      {/* Payment Selection Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        tableData={{
          order_type: params?.orderType || "dine-in",
          table_number: params?.tableNumber || "",
          order_number: params?.orderNumber || "",
          grand_total: calculateGrandTotal(
            selectedItems,
            specialDiscount,
            extraCharges,
            serviceChargePercentage,
            gstPercentage,
            tip
          ),
        }}
        paymentSuccess={false}
        paymentLoading={isLoading}
        selectedPaymentMethod={selectedPaymentMethod}
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        isPaid={isPaidChecked}
        setIsPaid={setIsPaidChecked}
        onSettlePayment={handlePaymentModalConfirm}
      />
      <Toast />
    </Box>
  );
}
