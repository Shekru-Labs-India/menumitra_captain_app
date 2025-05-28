import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Platform,
  PermissionsAndroid,
  Share,
  Linking,
} from "react-native";
import RemixIcon from "react-native-remix-icon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomTabBar from "../CustomTabBar";
import CustomHeader from "../../components/CustomHeader";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import axios from "axios";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { BleManager } from "react-native-ble-plx";
import base64 from "react-native-base64";
import Constants from "expo-constants";
import * as Application from "expo-application";
import { NetworkInfo } from "react-native-network-info";
import { useFocusEffect } from "@react-navigation/native";
import { usePrinter } from "../../contexts/PrinterContext";
import axiosInstance from "../../utils/axiosConfig";

// Printer Constants (same across all files)
const PRINTER_SERVICE_UUIDS = [
  "49535343-FE7D-4AE5-8FA9-9FAFD205E455",
  "E7810A71-73AE-499D-8C15-FAA9AEF0C3F2",
  "000018F0-0000-1000-8000-00805F9B34FB",
];

const PRINTER_CHARACTERISTIC_UUIDS = [
  "49535343-8841-43F4-A8D4-ECBE34729BB3",
  "BEF8D6C9-9C21-4C9E-B632-BD58C1009F9F",
];

// ESC/POS Commands
const ESC = 0x1b;
const GS = 0x1d;
const COMMANDS = {
  INITIALIZE: [ESC, "@"],
  TEXT_NORMAL: [ESC, "!", 0],
  TEXT_CENTERED: [ESC, "a", 1],
  LINE_SPACING: [ESC, "3", 60],
  CUT_PAPER: [GS, "V", 1],
};

const OrderDetails = ({ route, navigation }) => {
  // Extract parameters
  const { order_id, status: initialStatus, from, order_number } = route.params;
  
  // Common state declarations for all order types
  const [orderDetails, setOrderDetails] = useState(null);
  const [menu_details, setMenuDetails] = useState([]);
  const [order_details, setOrder_details] = useState(null);  // Fix: renamed from setOrderDetails to avoid duplicate
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [timelineData, setTimelineData] = useState([]);
  const [isTimelineModalVisible, setIsTimelineModalVisible] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  
  // BLE Printer states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [printerDevice, setPrinterDevice] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  // Get printer context
  const {
    isConnected: printerConnected,
    printerDevice: contextPrinterDevice,
    connectToPrinter: contextConnectPrinter,
  } = usePrinter();
  
  // Initialize BLE manager conditionally
  const [bleManager] = useState(() => {
    if (!Constants.appOwnership || Constants.appOwnership !== "expo") {
      return new BleManager();
    }
    return null;
  });
  
  // Helper function to convert text to bytes
  const textToBytes = (text) => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(text));
  };
  
  // Helper for zero checking
  const isZero = (value) => {
    return parseFloat(value) === 0 || value === "" || value === null || value === undefined;
  };
  
  // Fetch order details on component mount or refresh
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      // Get restaurant ID and access token
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);
      
      // Make API request for order details using order_view endpoint
      const response = await axiosInstance.post(
        onGetProductionUrl() + "order_view",
        {
          outlet_id: restaurantId,
          order_id: order_id,
          order_number: order_number || "" // Include order_number parameter
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      console.log("Order details response:", response.data); // Debug log
      
      if (response.data && response.data.st === 1) {
        // Update state with order details
        setOrderDetails(response.data.lists); // Set full order details
        setMenuDetails(response.data.lists?.menu_details || []); // Set menu details
        setOrder_details(response.data.lists?.order_details || {}); // Set order_details using renamed state updater
        
        // Set paid status based on response
        setIsPaid(
          response.data.lists?.order_details?.is_paid === "1" || 
          response.data.lists?.order_details?.is_paid === "complementary"
        );
        
        // Set remaining time if status is placed
        if (response.data.lists?.order_details?.order_status?.toLowerCase() === "placed") {
          setTimerIfNeeded(response.data.lists.order_details);
        }
      } else {
        Alert.alert("Error", "Failed to load order details.");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      Alert.alert("Error", "Failed to load order details. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Set timer for placed orders
  const setTimerIfNeeded = (orderData) => {
    if (orderData.order_status?.toLowerCase() === "placed") {
      const orderTime = new Date(orderData.datetime).getTime();
      const currentTime = new Date().getTime();
      const elapsedSeconds = Math.floor((currentTime - orderTime) / 1000);
      const timeRemaining = Math.max(0, 300 - elapsedSeconds); // 5 minutes (300 seconds)
      
      setRemainingTime(timeRemaining);
      
      // Start timer if time is remaining
      if (timeRemaining > 0) {
        const timerId = setInterval(() => {
          setRemainingTime((prevTime) => {
            const newTime = prevTime - 1;
            if (newTime <= 0) {
              clearInterval(timerId);
              return 0;
            }
            return newTime;
          });
        }, 1000);
        
        return () => clearInterval(timerId);
      }
    }
  };
  
  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchOrderDetails();
  };
  
  // Fetch order details on component mount
  useEffect(() => {
    fetchOrderDetails();
  }, [order_id]);
  
  // Timer for auto-refresh (especially for placed orders)
  useEffect(() => {
    if (order_details?.order_status?.toLowerCase() === "placed") {
      const intervalId = setInterval(() => {
        fetchOrderDetails();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [order_details?.order_status]);
  
  // Permission request for Bluetooth scanning
  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      try {
        let permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
        
        // Add Bluetooth permissions for Android 12+ (API 31+)
        if (Platform.Version >= 31) {
          permissions = [
            ...permissions,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ];
        }
        
        const results = await PermissionsAndroid.requestMultiple(permissions);
        
        // Check if all permissions are granted
        return Object.values(results).every(
          (result) => result === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (error) {
        console.error("Permission error:", error);
        return false;
      }
    } else {
      return true; // iOS doesn't need explicit permissions for BLE
    }
  };
  
  // Scan for BLE printers
  const scanForPrinters = async () => {
    // Check if running in Expo Go
    if (Constants.appOwnership === "expo") {
      Alert.alert(
        "Not Available",
        "Printer functionality is only available in production build.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      // Request permissions first
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert(
          "Permission Required",
          "Bluetooth permission is needed to connect to printer",
          [{ text: "OK" }]
        );
        return;
      }

      setIsLoading(true);
      setLoadingMessage("Checking Bluetooth...");

      const state = await bleManager.state();
      if (state !== "PoweredOn") {
        Alert.alert(
          "Bluetooth Required",
          "Please turn on Bluetooth to connect to printer",
          [{ text: "OK" }]
        );
        setIsLoading(false);
        return;
      }

      setIsScanning(true);
      setLoadingMessage("Scanning for printers...");

      // Only clear devices and show modal on initial scan
      if (availableDevices.length === 0) {
        setAvailableDevices([]);
        setIsModalVisible(true);
      }

      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error("Scan error:", error);
          return;
        }

        if (device) {
          // Add device if not already in list using state updater
          setAvailableDevices((prevDevices) => {
            const deviceExists = prevDevices.some((d) => d.id === device.id);
            if (!deviceExists) {
              return [...prevDevices, device];
            }
            return prevDevices;
          });
        }
      });
    } catch (error) {
      console.error("Scan error:", error);
      Alert.alert(
        "Connection Error",
        "Unable to scan for printers. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle device selection
  const handleDeviceSelection = async (device) => {
    try {
      setConnectionStatus("Connecting...");
      bleManager?.stopDeviceScan();
      setIsScanning(false);

      // Attempt to connect to the printer
      await contextConnectPrinter(device);

      // Check if the connection was successful
      if (printerConnected && contextPrinterDevice) {
        setConnectionStatus("Connected successfully!");
        setPrinterDevice(contextPrinterDevice);
        setIsConnected(true);

        // Show success message and close modal after delay
        setTimeout(() => {
          setIsModalVisible(false);
          setConnectionStatus("");
          bleManager?.stopDeviceScan();
        }, 2000);
      } else {
        setConnectionStatus("Connection failed. Please try again.");
        setIsConnected(false);
        setPrinterDevice(null);
      }
    } catch (error) {
      console.error("Device selection error:", error);
      setConnectionStatus("Connection failed. Please try again.");
      setIsConnected(false);
      setPrinterDevice(null);

      // Restart scanning on failure
      setTimeout(() => {
        scanForPrinters();
      }, 1000);
    }
  };
  
  // Handle printer shortcut
  const handleScanPrinters = async () => {
    if (printerConnected) {
      printReceipt();
      return;
    }

    try {
      setIsModalVisible(true);
      setAvailableDevices([]);
      setIsScanning(true);
      scanForPrinters();
    } catch (error) {
      console.error("Scanning error:", error);
      Alert.alert("Error", "Failed to scan for printers");
      setIsScanning(false);
    }
  };
  
  // Generate receipt data for thermal printer
  const generateReceiptData = async () => {
    try {
      if (!orderDetails || !orderDetails.order_details) {
        throw new Error("Order details not available");
      }
      
      // Get the required values from order details
      const {
        total_bill_amount: subtotal,
        discount_amount: discount,
        discount_percent: discountPercent,
        special_discount: specialDiscount = 0,
        extra_charges: extraCharges = 0,
        total_bill_with_discount: totalWithDiscount,
        service_charges_amount: serviceCharges,
        service_charges_percent: serviceChargesPercent,
        gst_amount: gstAmount,
        gst_percent: gstPercent,
        tip = 0,
        grand_total: grandTotal,
        outlet_name: outletName,
        outlet_address: outletAddress,
        outlet_mobile: outletMobile,
        order_number,
        datetime: orderDateTime,
        customer_name: customerName = "",
        customer_mobile: customerMobile = "",
        customer_address: customerAddress = "",
        customer_landmark: customerLandmark = "",
        payment_method: paymentMethod = "CASH",
        order_type: orderType
      } = orderDetails.order_details;

      const upiId = (await AsyncStorage.getItem("upi_id")) || "merchant@upi";
      const websiteUrl = (await AsyncStorage.getItem("website_url")) || "menumitra.com";

      // Generate QR code data
      const qrData = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(outletName)}&am=${grandTotal.toFixed(2)}`;
      
      // Helper functions for formatting
      const getDottedLine = () => "--------------------------------\n";

      const formatMenuItem = (item) => {
        const name = item.menu_name || "";
        const qty = item.quantity.toString();
        const rate = Math.floor(item.price).toString();
        const total = item.menu_sub_total.toFixed(2);

        if (name.length > 14) {
          const lines = name.match(/.{1,14}/g) || [];
          const firstLine = `${lines[0].padEnd(14)} ${qty.padStart(2)} ${rate.padStart(5)} ${total.padStart(8)}\n`;
          if (lines.length > 1) {
            const remainingLines = lines
              .slice(1)
              .map((line) => `${line.padEnd(14)}\n`)
              .join("");
            return firstLine + remainingLines;
          }
          return firstLine;
        }
        return `${name.padEnd(14)} ${qty.padStart(2)} ${rate.padStart(5)} ${total.padStart(8)}\n`;
      };

      const formatAmountLine = (label, amount, symbol = "") => {
        const amountStr = Math.abs(amount).toFixed(2);
        const totalWidth = 32;
        const amountWidth = 12;
        const padding = Math.max(2, totalWidth - label.length - amountWidth);
        const amountWithSymbol = `${symbol}${amountStr}`;
        const amountPadded = amountWithSymbol.padStart(amountWidth);
        return `${label}${" ".repeat(padding)}${amountPadded}\n`;
      };

      const getOrderTypeText = () => {
        if (orderType === "dine-in") {
          const tableNumber = orderDetails.order_details.table_number;
          const section = orderDetails.order_details.section;
          return `Table: ${section ? `${section} - ` : ""}${tableNumber}\n`;
        } else {
          return `Type: ${orderType.charAt(0).toUpperCase() + orderType.slice(1)}\n`;
        }
      };

      const generateQRCode = (data) => {
        return [
          ...textToBytes("\x1D\x28\x6B\x04\x00\x31\x41\x32\x00"), // QR Code: Select the model
          ...textToBytes("\x1D\x28\x6B\x03\x00\x31\x43\x08"), // QR Code: Set the size of module
          ...textToBytes("\x1D\x28\x6B\x03\x00\x31\x45\x30"), // QR Code: Select the error correction level
          ...textToBytes(
            `\x1D\x28\x6B${String.fromCharCode(
              data.length + 3,
              0
            )}\x31\x50\x30${data}`
          ), // QR Code: Store the data in the symbol storage area
          ...textToBytes("\x1D\x28\x6B\x03\x00\x31\x51\x30"), // QR Code: Print the symbol data in the symbol storage area
        ];
      };

      return [
        // Header section - centered
        ...textToBytes("\x1B\x61\x01"), // Center align
        ...textToBytes("\x1B\x21\x08"), // Double height
        ...textToBytes(`${outletName}\n`),
        ...textToBytes("\x1B\x21\x00"), // Normal height
        ...textToBytes(`${outletAddress}\n`),
        ...textToBytes(`${outletMobile ? `+91 ${outletMobile}\n` : ""}\n`),

        // Order details - left aligned
        ...textToBytes("\x1B\x61\x00"),
        ...textToBytes(`Bill Number: ${order_number}\n`),
        ...textToBytes(getOrderTypeText()),
        ...textToBytes(`DateTime: ${orderDateTime}\n`),
        
        // Add customer details if present
        ...(customerName ? [textToBytes(`Customer: ${customerName}\n`)] : []),
        ...(customerMobile ? [textToBytes(`Mobile: ${customerMobile}\n`)] : []),
        ...(customerAddress ? [textToBytes(`Address: ${customerAddress}\n`)] : []),
        ...(customerLandmark ? [textToBytes(`Landmark: ${customerLandmark}\n`)] : []),
        
        // Payment method
        ...textToBytes(`Payment: ${paymentMethod.toUpperCase()}\n`),
        
        ...textToBytes(getDottedLine()),

        // Column headers - aligned with data columns
        ...textToBytes("Item           Qty  Rate     Amt\n"),
        ...textToBytes(getDottedLine()),

        // Menu items
        ...orderDetails.menu_details.flatMap((item) => textToBytes(formatMenuItem(item))),
        ...textToBytes(getDottedLine()),

        // Amount section - aligned with last column
        ...textToBytes(formatAmountLine("Total", subtotal)),

        // Only add discount if it exists
        ...(discount > 0 
          ? [textToBytes(formatAmountLine(`Discount(${discountPercent}%)`, discount, "-"))]
          : []),

        // Only add special discount if it exists
        ...(specialDiscount > 0 
          ? [textToBytes(formatAmountLine("Special Discount", specialDiscount, "-"))]
          : []),

        // Only add extra charges if they exist
        ...(extraCharges > 0 
          ? [textToBytes(formatAmountLine("Extra Charges", extraCharges, "+"))]
          : []),

        ...textToBytes(formatAmountLine("Subtotal", totalWithDiscount)),

        // Only add service charges if they exist
        ...(serviceCharges > 0 
          ? [textToBytes(formatAmountLine(`Service(${serviceChargesPercent}%)`, serviceCharges, "+"))]
          : []),

        // Only add GST if it exists
        ...(gstAmount > 0 
          ? [textToBytes(formatAmountLine(`GST(${gstPercent}%)`, gstAmount, "+"))]
          : []),

        // Only add tip if it exists
        ...(tip > 0 
          ? [textToBytes(formatAmountLine("Tip", tip, "+"))]
          : []),

        ...textToBytes(getDottedLine()),
        ...textToBytes(formatAmountLine("Grand Total", grandTotal)),
        ...textToBytes("\n"),

        // Footer - centered
        ...textToBytes("\x1B\x61\x01"), // Center align
        ...textToBytes("PhonePe  GPay  Paytm  UPI\n\n"),
        ...textToBytes("------------------------\n"),
        
        ...generateQRCode(qrData),
        ...textToBytes('\n\n'),
        ...textToBytes(`Scan to Pay ${grandTotal.toFixed(2)}\n`),
        ...textToBytes("-----Thank You Visit Again!-----"),
        ...textToBytes("https://menumitra.com/\n\n\n\n"),
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper
      ];
    } catch (error) {
      console.error("Error generating receipt data:", error);
      throw error;
    }
  };
  
  // Generate KOT data for thermal printer
  const generateKOTData = () => {
    try {
      if (!orderDetails || !orderDetails.order_details) {
        throw new Error("Order details not available");
      }

      const outletName = orderDetails.order_details.outlet_name || "";
      const orderNumber = orderDetails.order_details.order_number || "";
      const orderDateTime = orderDetails.order_details.datetime || new Date().toLocaleString();
      const orderStatus = orderDetails.order_details.order_status || "";
      const orderType = orderDetails.order_details.order_type || "";
      const tableNumber = orderDetails.order_details.table_number || "";
      const section = orderDetails.order_details.section || "";
      const comment = orderDetails.order_details.comment || "";

      // Format for KOT items
      const formatKOTItem = (item, index) => {
        const itemNumber = (index + 1).toString().padEnd(2);
        const name = item.menu_name || "";
        const qty = item.quantity.toString().padStart(2);
        const portion = item.half_or_full ? ` (${item.half_or_full})` : "";
        const itemComment = item.comment ? `\n   Note: ${item.comment}` : "";

        return `${itemNumber}. ${name}${portion} x${qty}${itemComment}\n`;
      };

      // Order type display
      const getOrderTypeForKOT = () => {
        if (orderType === "dine-in") {
          return `Table: ${section ? `${section} - ` : ""}${tableNumber}\n`;
        } else {
          return `Type: ${orderType.charAt(0).toUpperCase() + orderType.slice(1)}\n`;
        }
      };

      // KOT header
      return [
        ...textToBytes("\x1B\x61\x01"), // Center align
        ...textToBytes("\x1B\x21\x10"), // Double width, double height
        ...textToBytes("**** KOT ****\n"),
        ...textToBytes("\x1B\x21\x00"), // Normal
        ...textToBytes(`${outletName}\n`),
        ...textToBytes("--------------------------------\n"),
        ...textToBytes("\x1B\x61\x00"), // Left align
        ...textToBytes(`Order #: ${orderNumber}\n`),
        ...textToBytes(`Status: ${orderStatus}\n`),
        ...textToBytes(`Date: ${orderDateTime}\n`),
        ...textToBytes(getOrderTypeForKOT()),
        ...textToBytes("--------------------------------\n"),
        ...textToBytes("\x1B\x21\x08"), // Emphasized
        ...textToBytes("ITEMS:\n"),
        ...textToBytes("\x1B\x21\x00"), // Normal
        
        // Print each menu item
        ...orderDetails.menu_details.flatMap((item, index) => 
          textToBytes(formatKOTItem(item, index))
        ),
        
        // Print order comment if exists
        ...(comment 
          ? [
              textToBytes("--------------------------------\n"),
              textToBytes("Order Notes:\n"),
              textToBytes(`${comment}\n`)
            ] 
          : []
        ),
        
        ...textToBytes("--------------------------------\n"),
        ...textToBytes("\x1B\x61\x01"), // Center align
        ...textToBytes(`Total Items: ${orderDetails.menu_details.length}\n`),
        ...textToBytes("\n\n\n"), // Extra space at end
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper
      ];
    } catch (error) {
      console.error("Error generating KOT data:", error);
      throw error;
    }
  };

  // Print receipt function
  const printReceipt = async () => {
    if (!printerConnected || !contextPrinterDevice) {
      Alert.alert(
        "Printer Not Connected",
        "Please connect a printer first",
        [
          { text: "Connect Printer", onPress: handleScanPrinters },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage("Printing receipt...");

      const receiptData = await generateReceiptData();
      const CHUNK_SIZE = 100;
      
      const services = await contextPrinterDevice.services();
      const service = services.find(svc => 
        PRINTER_SERVICE_UUIDS.some(uuid => 
          svc.uuid.toLowerCase().includes(uuid.toLowerCase())
        )
      );

      if (!service) throw new Error("Printer service not found");

      const characteristics = await service.characteristics();
      const foundCharacteristic = characteristics.find(char => 
        PRINTER_CHARACTERISTIC_UUIDS.some(uuid => 
          char.uuid.toLowerCase().includes(uuid.toLowerCase())
        )
      );

      if (!foundCharacteristic) throw new Error("Printer characteristic not found");

      // Send data in chunks
      for (let i = 0; i < receiptData.length; i += CHUNK_SIZE) {
        const chunk = receiptData.slice(i, i + CHUNK_SIZE);
        await foundCharacteristic.writeWithResponse(
          base64.encode(String.fromCharCode(...chunk))
        );
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      Alert.alert("Success", "Receipt printed successfully");
    } catch (error) {
      console.error("Receipt print error:", error);
      Alert.alert("Error", "Failed to print receipt. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // Print KOT function
  const printKOT = async () => {
    if (!printerConnected || !contextPrinterDevice) {
      Alert.alert(
        "Printer Not Connected",
        "Please connect a printer first",
        [
          { text: "Connect Printer", onPress: handleScanPrinters },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage("Printing KOT...");

      const kotData = generateKOTData();
      const CHUNK_SIZE = 100;
      
      const services = await contextPrinterDevice.services();
      const service = services.find(svc => 
        PRINTER_SERVICE_UUIDS.some(uuid => 
          svc.uuid.toLowerCase().includes(uuid.toLowerCase())
        )
      );

      if (!service) throw new Error("Printer service not found");

      const characteristics = await service.characteristics();
      const foundCharacteristic = characteristics.find(char => 
        PRINTER_CHARACTERISTIC_UUIDS.some(uuid => 
          char.uuid.toLowerCase().includes(uuid.toLowerCase())
        )
      );

      if (!foundCharacteristic) throw new Error("Printer characteristic not found");

      // Send data in chunks
      for (let i = 0; i < kotData.length; i += CHUNK_SIZE) {
        const chunk = kotData.slice(i, i + CHUNK_SIZE);
        await foundCharacteristic.writeWithResponse(
          base64.encode(String.fromCharCode(...chunk))
        );
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      Alert.alert("Success", "KOT printed successfully");
    } catch (error) {
      console.error("KOT print error:", error);
      Alert.alert("Error", "Failed to print KOT. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };
  
  // Generate receipt HTML for sharing
  const generateReceiptHTML = async () => {
    if (!orderDetails) return "";
    
    try {
      const { order_details } = orderDetails;
      
      // Create menu item HTML
      let menuItemsHTML = "";
      orderDetails.menu_details.forEach((item) => {
        menuItemsHTML += `
          <div class="menu-item">
            <div class="item-row">
              <div class="item-name">${item.menu_name} ${
          item.half_or_full ? `(${item.half_or_full})` : ""
        }</div>
              <div class="item-qty">x${item.quantity}</div>
            </div>
            ${
              item.comment
                ? `<div class="item-note">Note: ${item.comment}</div>`
                : ""
            }
            <div class="item-price-row">
              <div class="item-price">₹${parseFloat(item.price).toFixed(
                2
              )}</div>
              ${
                parseFloat(item.offer) > 0
                  ? `<div class="item-discount">${item.offer}% off</div>`
                  : ""
              }
              <div class="item-total">₹${parseFloat(
                item.menu_sub_total
              ).toFixed(2)}</div>
            </div>
          </div>
        `;
      });
      
      // Helper function for order type display
      const orderTypeDisplay = () => {
        if (order_details.order_type === "dine-in") {
          return `
            <div class="order-type">
              <i class="icon">🍽️</i>
              Table ${order_details.table_number} - ${order_details.section || "Main"}
            </div>
          `;
        } else {
          return `
            <div class="order-type">
              <i class="icon">${
                order_details.order_type === "parcel" ? "📦" : 
                order_details.order_type === "drive-through" ? "🚗" : "🛍️"
              }</i>
              ${order_details.order_type.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </div>
          `;
        }
      };
      
      // Get status specific styling
      const getStatusColor = () => {
        switch (order_details.order_status?.toLowerCase()) {
          case "placed": return "#4b89dc";
          case "ongoing": return "#FF9800";
          case "served": return "#009688";
          case "completed": return "#4CAF50";
          case "cancelled": return "#e74c3c";
          default: return "#333333";
        }
      };
      
      const getStatusBanner = () => {
        return order_details.order_status?.toUpperCase() || "ORDER";
      };
      
      // Generate full HTML
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
              color: #333;
            }
            .receipt {
              max-width: 600px;
              margin: 20px auto;
              background-color: white;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background-color: ${getStatusColor()};
              color: white;
              padding: 20px;
              text-align: center;
            }
            .restaurant-name {
              font-size: 24px;
              font-weight: bold;
              margin: 0;
              padding-bottom: 5px;
            }
            .restaurant-info {
              font-size: 14px;
              margin: 0;
              padding-bottom: 2px;
            }
            .order-info {
              padding: 15px;
              border-bottom: 1px dashed #ddd;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .order-number {
              font-size: 16px;
              font-weight: bold;
            }
            .order-date {
              font-size: 14px;
              color: #666;
            }
            .order-type {
              display: flex;
              align-items: center;
              gap: 5px;
              font-size: 14px;
              margin-top: 5px;
            }
            .status-banner {
              background-color: ${getStatusColor()};
              color: white;
              text-align: center;
              padding: 10px;
              font-weight: bold;
              font-size: 16px;
            }
            .dotted-divider {
              height: 1px;
              border-bottom: 1px dashed #ddd;
              margin: 10px 0;
            }
            .menu-item {
              padding: 15px;
              border-bottom: 1px solid #eee;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
            }
            .item-name {
              font-weight: bold;
              flex: 1;
            }
            .item-qty {
              font-weight: bold;
              min-width: 40px;
              text-align: right;
            }
            .item-note {
              font-size: 13px;
              color: #666;
              font-style: italic;
              margin-top: 5px;
            }
            .item-price-row {
              display: flex;
              justify-content: space-between;
              margin-top: 8px;
              font-size: 14px;
            }
            .item-discount {
              color: #4CAF50;
            }
            .item-total {
              font-weight: bold;
            }
            .divider {
              height: 1px;
              background-color: #ddd;
              margin: 10px 0;
            }
            .totals-section {
              padding: 15px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .grand-total {
              font-weight: bold;
              font-size: 18px;
              border-top: 2px solid #ddd;
              padding-top: 8px;
              margin-top: 8px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              background-color: #f9f9f9;
              font-size: 14px;
            }
            .qr-section {
              text-align: center;
              padding: 15px;
            }
            .qr-code {
              width: 150px;
              height: 150px;
              margin: 0 auto;
              background-color: #f5f5f5;
                           display: flex;
              align-items: center;
              justify-content: center;
            }
            .payment-info {
              margin-top: 10px;
              text-align: center;
              font-weight: bold;
            }
            .customer-info {
              background-color: #f9f9f9;
              padding: 15px;
              border-top: 1px solid #eee;
              font-size: 14px;
            }
            .customer-row {
              margin-bottom: 5px;
            }
            .customer-label {
              font-weight: 500;
              display: inline-block;
              width: 80px;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1 class="restaurant-name">${order_details.outlet_name}</h1>
              <p class="restaurant-info">${order_details.outlet_address || ""}</p>
              ${order_details.outlet_mobile ? `<p class="restaurant-info">+91 ${order_details.outlet_mobile}</p>` : ""}
            </div>
            
            <div class="status-banner">${getStatusBanner()}</div>
            
            <div class="order-info">
              <div>
                <div class="order-number">Order #${order_details.order_number}</div>
                <div class="order-date">${order_details.datetime}</div>
                ${orderTypeDisplay()}
              </div>
            </div>
            
            <div class="dotted-divider"></div>
            
            ${menuItemsHTML}
            
            <div class="totals-section">
              <div class="total-row">
                <span>Subtotal</span>
                <span>₹${parseFloat(order_details.total_bill_amount).toFixed(2)}</span>
              </div>
              
              ${parseFloat(order_details.discount_amount) > 0 ? `
                <div class="total-row">
                  <span>Discount (${order_details.discount_percent}%)</span>
                  <span>-₹${parseFloat(order_details.discount_amount).toFixed(2)}</span>
                </div>
              ` : ""}
              
              ${parseFloat(order_details.special_discount || 0) > 0 ? `
                <div class="total-row">
                  <span>Special Discount</span>
                  <span>-₹${parseFloat(order_details.special_discount).toFixed(2)}</span>
                </div>
              ` : ""}
              
              ${parseFloat(order_details.extra_charges || 0) > 0 ? `
                <div class="total-row">
                  <span>Extra Charges</span>
                  <span>+₹${parseFloat(order_details.extra_charges).toFixed(2)}</span>
                </div>
              ` : ""}
              
              <div class="total-row">
                <span>Subtotal with Discount</span>
                <span>₹${parseFloat(order_details.total_bill_with_discount || order_details.total_bill_amount - order_details.discount_amount).toFixed(2)}</span>
              </div>
              
              ${parseFloat(order_details.service_charges_amount) > 0 ? `
                <div class="total-row">
                  <span>Service Charges (${order_details.service_charges_percent}%)</span>
                  <span>+₹${parseFloat(order_details.service_charges_amount).toFixed(2)}</span>
                </div>
              ` : ""}
              
              ${parseFloat(order_details.gst_amount) > 0 ? `
                <div class="total-row">
                  <span>GST (${order_details.gst_percent}%)</span>
                  <span>+₹${parseFloat(order_details.gst_amount).toFixed(2)}</span>
                </div>
              ` : ""}
              
              ${parseFloat(order_details.tip || 0) > 0 ? `
                <div class="total-row">
                  <span>Tip</span>
                  <span>+₹${parseFloat(order_details.tip).toFixed(2)}</span>
                </div>
              ` : ""}
              
              <div class="total-row grand-total">
                <span>Grand Total</span>
                <span>₹${parseFloat(order_details.grand_total).toFixed(2)}</span>
              </div>
            </div>
            
            <div class="dotted-divider"></div>
            
            <div class="payment-info">
              Payment Method: ${order_details.payment_method || "CASH"}
              ${order_details.is_paid === "1" ? " (PAID)" : 
                order_details.is_paid === "complementary" ? " (COMPLEMENTARY)" : " (UNPAID)"}
            </div>
            
            ${order_details.order_type !== "dine-in" && (order_details.customer_name || order_details.customer_mobile || order_details.customer_address) ? `
              <div class="customer-info">
                <h3>Customer Details</h3>
                ${order_details.customer_name ? `
                  <div class="customer-row">
                    <span class="customer-label">Name:</span> ${order_details.customer_name}
                  </div>
                ` : ""}
                ${order_details.customer_mobile ? `
                  <div class="customer-row">
                    <span class="customer-label">Mobile:</span> ${order_details.customer_mobile}
                  </div>
                ` : ""}
                ${order_details.customer_address ? `
                  <div class="customer-row">
                    <span class="customer-label">Address:</span> ${order_details.customer_address}
                  </div>
                ` : ""}
                ${order_details.customer_landmark ? `
                  <div class="customer-row">
                    <span class="customer-label">Landmark:</span> ${order_details.customer_landmark}
                  </div>
                ` : ""}
              </div>
            ` : ""}
            
            <div class="footer">
              Thank you for your order!<br>
              <small>Powered by MenuMitra</small>
            </div>
          </div>
        </body>
        </html>
      `;
    } catch (error) {
      console.error("Error generating receipt HTML:", error);
      return `
        <html>
          <body>
            <h1>Error generating receipt</h1>
            <p>Please try again later.</p>
          </body>
        </html>
      `;
    }
  };
  
  // Share receipt as PDF
  const shareReceipt = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage("Generating receipt...");
      
      const html = await generateReceiptHTML();
      const filename = Platform.OS === 'ios' 
        ? `${FileSystem.documentDirectory}receipt.pdf`
        : `${FileSystem.cacheDirectory}receipt.pdf`;
        
      const file = await Print.printToFileAsync({ 
        html,
        width: 612, // Standard US Letter width in points (72 DPI)
        height: 792, // Standard US Letter height in points (72 DPI)
        base64: false
      });
      
      setIsLoading(false);
      
      // Share the PDF
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Receipt',
        UTI: 'com.adobe.pdf'
      });
    } catch (error) {
      console.error("Error sharing receipt:", error);
      Alert.alert("Error", "Failed to generate or share receipt. Please try again.");
      setIsLoading(false);
    }
  };
  
  // Get timeline data
  const fetchTimelineData = async () => {
    try {
      setTimelineLoading(true);
      
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token")
      ]);
      
      const response = await axiosInstance.post(
        onGetProductionUrl() + "order_timeline",
        { 
          outlet_id: restaurantId,
          order_id: order_id 
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (response.data && response.data.st === 1) {
        setTimelineData(response.data.timeline || []);
      } else {
        console.error("Failed to fetch timeline data");
      }
    } catch (error) {
      console.error("Error fetching timeline:", error);
    } finally {
      setTimelineLoading(false);
    }
  };
  
  // Handle order status changes
  const handleStatusChange = async (newStatus) => {
    try {
      setIsLoading(true);
      setLoadingMessage(`Updating order status...`);
      
      const accessToken = await AsyncStorage.getItem("access_token");
      const userId = await getUserId();
      const restaurantId = await getRestaurantId();
      
      // Use the unified update_order_status endpoint
      console.log(`Updating order ${order_id} status to ${newStatus}`);
      
      const requestData = {
        outlet_id: restaurantId,
        order_id: order_id,
        user_id: userId,
        order_status: newStatus,
        payment_method: orderDetails?.order_details?.payment_method || "cash",
        is_paid: isPaid ? "1" : "0",
        customer_name: orderDetails?.order_details?.customer_name || "",
        customer_mobile: orderDetails?.order_details?.customer_mobile || "",
        customer_alternate_mobile: orderDetails?.order_details?.customer_alternate_mobile || "",
        customer_address: orderDetails?.order_details?.customer_address || "",
        customer_landmark: orderDetails?.order_details?.customer_landmark || "",
      };
      
      console.log("Status update request data:", requestData);
      
      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_order_status",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      console.log("Status update response:", response.data);
      
      if (response.data && response.data.st === 1) {
        Alert.alert("Success", response.data.msg || "Order status updated successfully");
        fetchOrderDetails(); // Refresh order details
      } else {
        Alert.alert("Error", response.data?.msg || "Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      Alert.alert("Error", "Failed to update order status. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };
  
  // Handle payment toggle
  const togglePaymentStatus = (value) => {
    setIsPaid(value);
  };
  
  // Navigation setup for header
  useEffect(() => {
    // Set header right button based on order status
    if (!orderDetails?.order_details) return;
    
    navigation.setOptions({
      headerTitle: `Order #${orderDetails.order_details.order_number || ""}`,
      headerTitleStyle: {
        fontWeight: '600',
      },
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          {/* Timeline button */}
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => {
              fetchTimelineData();
              setIsTimelineModalVisible(true);
            }}
          >
            <RemixIcon name="time-line" size={22} color="#333" />
          </TouchableOpacity>
          
          {/* Edit button - only available for certain statuses */}
          {['placed', 'ongoing'].includes(orderDetails.order_details.order_status?.toLowerCase()) && (
            <TouchableOpacity
              style={[styles.headerButton, styles.editButton]}
              onPress={() => {
                navigation.navigate("DemoScreen", {
                  tableData: {
                    table_id: orderDetails.order_details.table_id,
                    table_number: orderDetails.order_details.table_number,
                    section_id: orderDetails.order_details.section_id,
                    section_name: orderDetails.order_details.section_name,
                    is_occupied: 1,
                    order_id: orderDetails.order_details.order_id,
                    order_number: orderDetails.order_details.order_number,
                    outlet_id: orderDetails.order_details.outlet_id,
                  },
                  orderType: orderDetails.order_details.order_type?.toLowerCase() || "dine-in",
                  existingOrderDetails: {
                    ...orderDetails.order_details,
                    menu_details: menu_details
                  }
                });
              }}
            >
              <RemixIcon name="edit-2-line" size={20} color="#fff" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      )
    });
  }, [orderDetails, navigation]);
  
  // Device selection modal
  const DeviceSelectionModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isModalVisible}
      onRequestClose={() => {
        setIsModalVisible(false);
        bleManager?.stopDeviceScan();
        setIsScanning(false);
        setConnectionStatus("");
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.modalCloseIconButton}
            onPress={() => {
              setIsModalVisible(false);
              bleManager?.stopDeviceScan();
              setIsScanning(false);
              setConnectionStatus("");
            }}
          >
            <RemixIcon name="close-line" size={24} color="#666" />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Select Printer Device</Text>

          <TouchableOpacity
            style={styles.refreshScanButton}
            onPress={() => {
              setAvailableDevices([]);
              bleManager?.stopDeviceScan();
              scanForPrinters();
              setConnectionStatus("");
            }}
          >
            <RemixIcon name="refresh-line" size={18} color="#fff" />
            <Text style={styles.refreshButtonText}>Scan</Text>
          </TouchableOpacity>

          {/* Connection Status Message */}
          {connectionStatus && (
            <View style={styles.statusContainer}>
              <Text
                style={[
                  styles.connectionStatus,
                  connectionStatus.includes("success")
                    ? styles.successText
                    : connectionStatus === "Connecting..."
                    ? styles.connectingText
                    : styles.errorText,
                ]}
              >
                {connectionStatus}
              </Text>
            </View>
          )}

          {/* Scanning Indicator */}
          {isScanning && (
            <View style={styles.scanningContainer}>
              <ActivityIndicator color="#219ebc" />
              <Text style={styles.scanningText}>Scanning for devices...</Text>
            </View>
          )}

          <ScrollView style={styles.deviceList}>
            {availableDevices.length > 0 ? (
              availableDevices.map((device) => (
                <TouchableOpacity
                  key={device.id}
                  style={[
                    styles.deviceItem,
                    connectionStatus === "Connecting..." &&
                      styles.deviceItemDisabled,
                  ]}
                  onPress={() => handleDeviceSelection(device)}
                  disabled={connectionStatus === "Connecting..."}
                >
                  <Text style={styles.deviceName}>
                    {device.name || "Unknown Device"}
                  </Text>
                  <Text style={styles.deviceId}>{device.id}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noDevicesText}>
                {isScanning ? "Searching for devices..." : "No devices found"}
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
  
  // Timeline modal
  const TimelineModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isTimelineModalVisible}
      onRequestClose={() => setIsTimelineModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.timelineModalContent}>
          <View style={styles.timelineModalHeader}>
            <Text style={styles.timelineModalTitle}>Order Timeline</Text>
            <TouchableOpacity onPress={() => setIsTimelineModalVisible(false)}>
              <RemixIcon name="close-line" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {timelineLoading ? (
            <View style={styles.timelineLoading}>
              <ActivityIndicator size="large" color="#0dcaf0" />
              <Text style={styles.timelineLoadingText}>Loading timeline...</Text>
            </View>
          ) : (
            <ScrollView style={styles.timelineScrollView}>
              {timelineData.length > 0 ? (
                timelineData.map((item, index) => (
                  <View key={index} style={styles.timelineItem}>
                    <View style={styles.timelineLeftColumn}>
                      <View style={[styles.timelineDot, { backgroundColor: getStatusColor(item.status) }]} />
                      {index < timelineData.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineUser}>{item.admin_name || "System"}</Text>
                      <Text style={styles.timelineStatus}>
                        Status: <Text style={[styles.timelineStatusText, { color: getStatusColor(item.status) }]}>
                          {item.status.toUpperCase()}
                        </Text>
                      </Text>
                      <Text style={styles.timelineDate}>{item.updated_at}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noTimelineText}>No timeline data available</Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
  
  // Helper function for timeline colors
  const getStatusColor = (status) => {
    if (!status) return "#333";
    
    switch (status.toLowerCase()) {
      case "placed": return "#4b89dc";
      case "ongoing": return "#FF9800";
      case "served": return "#009688";
      case "completed": return "#4CAF50";
      case "cancelled": return "#e74c3c";
      default: return "#333";
    }
  };
  
  // Get action buttons based on order status
  const getActionButtons = () => {
    if (!orderDetails?.order_details) return null;
    
    const status = orderDetails.order_details.order_status?.toLowerCase() || "";
    
    switch (status) {
      case "placed":
        return (
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => handleStatusChange("ongoing")}
            >
              <RemixIcon name="fire-line" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Start Cooking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={() => handleStatusChange("cancelled")}
            >
              <RemixIcon name="close-circle-line" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          </View>
        );
        
      case "ongoing":
        return (
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.successButton]}
              onPress={() => handleStatusChange("served")}
            >
              <RemixIcon name="check-double-line" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Mark as Served</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={() => handleStatusChange("cancelled")}
            >
              <RemixIcon name="close-circle-line" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          </View>
        );
        
      case "served":
        return (
          <View style={styles.actionButtonContainer}>
            <View style={styles.paymentToggleContainer}>
              <Text style={styles.paymentToggleLabel}>Mark as Paid</Text>
              <Switch
                value={isPaid}
                onValueChange={togglePaymentStatus}
                trackColor={{ false: "#ddd", true: "#4CAF50" }}
                thumbColor={isPaid ? "#fff" : "#fff"}
              />
            </View>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => handleStatusChange("completed")}
            >
              <RemixIcon name="check-line" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Complete Order</Text>
            </TouchableOpacity>
          </View>
        );
        
      default:
        return null;
    }
  };
  
  // Render the appropriate header based on order status
  const renderStatusHeader = () => {
    if (!orderDetails?.order_details) return null;
    
    const status = orderDetails.order_details.order_status?.toLowerCase() || "";
    const getHeaderColor = () => {
      switch (status) {
        case "placed": return "#4b89dc";
        case "ongoing": return "#FF9800";
        case "served": return "#009688";
        case "completed": return "#4CAF50";
        case "cancelled": return "#e74c3c";
        default: return "#333";
      }
    };
    
    return (
      <View style={[styles.headerCard, { backgroundColor: getHeaderColor() }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.orderNumber}>
              Order #{orderDetails.order_details.order_number}
            </Text>
            <View style={styles.orderTypeContainer}>
              <RemixIcon
                name={
                  orderDetails.order_details.order_type === "dine-in" 
                    ? "restaurant-2-line" 
                    : orderDetails.order_details.order_type === "parcel"
                    ? "archive-line"
                    : "shopping-bag-line"
                }
                size={16}
                color="#fff"
              />
              <Text style={styles.orderTypeText}>
                {orderDetails.order_details.order_type?.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.dateText}>
              {new Date(orderDetails.order_details.datetime).toLocaleString()}
            </Text>
            {status === "placed" && remainingTime > 0 && (
              <Text style={styles.remainingTime}>
                {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };
  
  // Render order details
  return (
    <SafeAreaView style={styles.container}>
      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0dcaf0" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      )}
      
      {/* Device selection modal */}
      <DeviceSelectionModal />
      
      {/* Timeline modal */}
      <TimelineModal />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0dcaf0" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      ) : (
        <FlatList
          data={orderDetails?.menu_details || []}
          keyExtractor={(item, index) => `${item.menu_id}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.menuItem}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuName}>{item.menu_name}</Text>
                <Text style={styles.menuQuantity}>x{item.quantity}</Text>
              </View>
              {item.half_or_full && (
                <Text style={styles.portionText}>
                  {item.half_or_full.charAt(0).toUpperCase() + item.half_or_full.slice(1)} Portion
                </Text>
              )}
              {item.comment && (
                <Text style={styles.menuComment}>Note: {item.comment}</Text>
              )}
              <View style={styles.menuPricing}>
                <Text style={styles.menuPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
                {parseFloat(item.offer) > 0 && (
                  <Text style={styles.menuDiscount}>{item.offer}% off</Text>
                )}
                <Text style={styles.menuTotal}>
                  ₹{parseFloat(item.menu_sub_total).toFixed(2)}
                </Text>
              </View>
            </View>
          )}
          ListHeaderComponent={() => (
            <>
              {/* Status header */}
              {renderStatusHeader()}
              
              {/* Table info section */}
              {orderDetails?.order_details?.order_type === "dine-in" && (
                <View style={styles.tableContainer}>
                  <RemixIcon name="layout-grid-fill" size={20} color="#009688" />
                  <Text style={styles.tableText}>
                    Table {orderDetails.order_details.table_number}
                    {orderDetails.order_details.section && 
                      ` - ${orderDetails.order_details.section}`}
                  </Text>
                </View>
              )}
              
              {/* Comment section */}
              {orderDetails?.order_details?.comment && (
                <View style={styles.commentContainer}>
                  <View style={styles.commentHeader}>
                    <RemixIcon name="chat-1-line" size={16} color="#00796b" />
                    <Text style={styles.commentLabel}>Order Note</Text>
                  </View>
                  <Text style={styles.commentText}>{orderDetails.order_details.comment}</Text>
                </View>
              )}
              
              {/* Menu items section header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>
                  Menu Items ({orderDetails?.menu_details?.length || 0})
                </Text>
              </View>
            </>
          )}
          ListFooterComponent={() => (
            <View style={styles.footerContainer}>
              {/* Customer details section */}
              {orderDetails?.order_details?.order_type !== "dine-in" && 
               (orderDetails?.order_details?.customer_name || 
                orderDetails?.order_details?.customer_mobile || 
                orderDetails?.order_details?.customer_address) && (
                <View style={styles.customerDetailsSection}>
                  <Text style={styles.sectionTitle}>Customer Details</Text>
                  {orderDetails.order_details.customer_name && (
                    <View style={styles.customerRow}>
                      <Text style={styles.customerLabel}>Name:</Text>
                      <Text style={styles.customerValue}>
                        {orderDetails.order_details.customer_name}
                      </Text>
                    </View>
                  )}
                  {orderDetails.order_details.customer_mobile && (
                    <View style={styles.customerRow}>
                      <Text style={styles.customerLabel}>Mobile:</Text>
                      <Text style={styles.customerValue}>
                        {orderDetails.order_details.customer_mobile}
                      </Text>
                    </View>
                  )}
                  {orderDetails.order_details.customer_address && (
                    <View style={styles.customerRow}>
                      <Text style={styles.customerLabel}>Address:</Text>
                      <Text style={styles.customerValue}>
                        {orderDetails.order_details.customer_address}
                      </Text>
                    </View>
                  )}
                  {orderDetails.order_details.customer_landmark && (
                    <View style={styles.customerRow}>
                      <Text style={styles.customerLabel}>Landmark:</Text>
                      <Text style={styles.customerValue}>
                        {orderDetails.order_details.customer_landmark}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* Total section */}
              <View style={styles.totalSection}>
                <Text style={styles.sectionTitle}>Order Summary</Text>
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>
                    ₹{parseFloat(orderDetails?.order_details?.total_bill_amount || 0).toFixed(2)}
                  </Text>
                </View>
                
                {parseFloat(orderDetails?.order_details?.discount_amount || 0) > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>
                      Discount ({orderDetails.order_details.discount_percent}%)
                    </Text>
                    <Text style={[styles.totalValue, styles.discountText]}>
                      -₹{parseFloat(orderDetails.order_details.discount_amount).toFixed(2)}
                    </Text>
                  </View>
                )}
                
                {parseFloat(orderDetails?.order_details?.special_discount || 0) > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Special Discount</Text>
                    <Text style={[styles.totalValue, styles.discountText]}>
                      -₹{parseFloat(orderDetails.order_details.special_discount).toFixed(2)}
                    </Text>
                  </View>
                )}
                
                {parseFloat(orderDetails?.order_details?.extra_charges || 0) > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Extra Charges</Text>
                    <Text style={styles.totalValue}>
                      +₹{parseFloat(orderDetails.order_details.extra_charges).toFixed(2)}
                    </Text>
                  </View>
                )}
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal with Discount</Text>
                  <Text style={styles.totalValue}>
                    ₹{parseFloat(orderDetails?.order_details?.total_bill_with_discount || 
                      (orderDetails?.order_details?.total_bill_amount - orderDetails?.order_details?.discount_amount) || 0).toFixed(2)}
                  </Text>
                </View>
                
                {parseFloat(orderDetails?.order_details?.service_charges_amount || 0) > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>
                      Service Charges ({orderDetails.order_details.service_charges_percent}%)
                    </Text>
                    <Text style={styles.totalValue}>
                      +₹{parseFloat(orderDetails.order_details.service_charges_amount).toFixed(2)}
                    </Text>
                  </View>
                )}
                
                {parseFloat(orderDetails?.order_details?.gst_amount || 0) > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>
                      GST ({orderDetails.order_details.gst_percent}%)
                    </Text>
                    <Text style={styles.totalValue}>
                      +₹{parseFloat(orderDetails.order_details.gst_amount).toFixed(2)}
                    </Text>
                  </View>
                )}
                
                {parseFloat(orderDetails?.order_details?.tip || 0) > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tip</Text>
                    <Text style={styles.totalValue}>
                      +₹{parseFloat(orderDetails.order_details.tip).toFixed(2)}
                    </Text>
                  </View>
                )}
                
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalValue}>
                    ₹{parseFloat(orderDetails?.order_details?.grand_total || 0).toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.paymentMethodRow}>
                  <Text style={styles.paymentMethodLabel}>
                    Payment Method:
                  </Text>
                  <Text style={styles.paymentMethodValue}>
                    {orderDetails?.order_details?.payment_method?.toUpperCase() || "CASH"}
                  </Text>
                  <View style={[
                    styles.paymentStatusBadge,
                    orderDetails?.order_details?.is_paid === "1" ? styles.paidBadge :
                    orderDetails?.order_details?.is_paid === "complementary" ? styles.complementaryBadge :
                    styles.unpaidBadge
                  ]}>
                    <Text style={styles.paymentStatusText}>
                      {orderDetails?.order_details?.is_paid === "1" ? "PAID" :
                       orderDetails?.order_details?.is_paid === "complementary" ? "COMP" :
                       "UNPAID"}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Action buttons row */}
              {getActionButtons()}
              
              {/* Print buttons row */}
              <View style={styles.printButtonsContainer}>
                <TouchableOpacity
                  style={styles.printButton}
                  onPress={printKOT}
                >
                  <RemixIcon name="file-list-2-line" size={20} color="#fff" />
                  <Text style={styles.printButtonText}>Print KOT</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.printButton}
                  onPress={printReceipt}
                >
                  <RemixIcon name="printer-line" size={20} color="#fff" />
                  <Text style={styles.printButtonText}>Print Receipt</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.printButton}
                  onPress={shareReceipt}
                >
                  <RemixIcon name="share-line" size={20} color="#fff" />
                  <Text style={styles.printButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  remainingTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  orderTypeText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#fff',
  },
  tableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#009688',
  },
  tableText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  commentContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#e0f2f1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b2dfdb',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentLabel: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#00796b',
  },
  commentText: {
    fontSize: 14,
    color: '#666',
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  menuQuantity: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#009688',
    backgroundColor: 'rgba(0, 150, 136, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  portionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  menuComment: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    backgroundColor: '#f9f9f9',
    padding: 6,
    borderRadius: 4,
  },
  menuPricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  menuPrice: {
    fontSize: 14,
    color: '#666',
  },
  menuDiscount: {
    fontSize: 14,
    color: '#4CAF50',
  },
  menuTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  footerContainer: {
    padding: 16,
  },
  customerDetailsSection: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  customerRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  customerLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  customerValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  totalSection: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  discountText: {
    color: '#4CAF50',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4b89dc',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  paymentMethodLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 6,
  },
  paymentMethodValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 8,
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paidBadge: {
    backgroundColor: '#4CAF50',
  },
  unpaidBadge: {
    backgroundColor: '#f44336',
  },
  complementaryBadge: {
    backgroundColor: '#9C27B0',
  },
  paymentStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  actionButtonContainer: {
    marginBottom: 16,
  },
  paymentToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  paymentToggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#4b89dc',
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 8,
  },
  printButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  printButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0dcaf0',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  printButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '500',
  },
  headerButton: {
    padding: 8,
    marginLeft: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0dcaf0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 10,
  },
  editButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineModalContent: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  timelineModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  timelineModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  timelineScrollView: {
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeftColumn: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4b89dc',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 4,
    marginBottom: -8,
    marginLeft: 7,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 8,
  },
  timelineUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timelineStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  timelineStatusText: {
    fontWeight: '600',
  },
  timelineDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  noTimelineText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  timelineLoading: {
    alignItems: 'center',
    padding: 20,
  },
  timelineLoadingText: {
    color: '#666',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
    position: "relative",
  },
  modalCloseIconButton: {
    position: "absolute",
    right: 10,
    top: 10,
    zIndex: 10,
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    marginTop: 5,
    textAlign: "center",
  },
  refreshScanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#219ebc",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginBottom: 15,
    alignSelf: "center",
  },
  refreshButtonText: {
    color: "#fff",
    marginLeft: 5,
    fontWeight: "500",
  },
  deviceList: {
    maxHeight: 300,
    width: "100%",
  },
  deviceItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#f8f9fa",
    marginVertical: 5,
    borderRadius: 5,
  },
  deviceItemDisabled: {
    opacity: 0.5,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  deviceId: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  scanningContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    marginBottom: 10,
    backgroundColor: "#e6f7ff",
    borderRadius: 5,
  },
  scanningText: {
    marginLeft: 10,
    color: "#219ebc",
    fontSize: 14,
  },
  noDevicesText: {
    textAlign: "center",
    color: "#666",
    padding: 20,
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
    marginTop: 10,
  },
  statusContainer: {
    marginBottom: 10,
  },
  connectionStatus: {
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  successText: {
    backgroundColor: "#e6ffed",
    color: "#4CAF50",
  },
  connectingText: {
    backgroundColor: "#e6f7ff",
    color: "#219ebc",
  },
  errorText: {
    backgroundColor: "#fff1f0",
    color: "#f44336",
  },
});

export default OrderDetails;