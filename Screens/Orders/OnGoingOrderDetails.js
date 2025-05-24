import React, { useState, useMemo, useEffect, useLayoutEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  Switch,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  PermissionsAndroid,
  Linking,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import axios from "axios";
import RemixIcon from "react-native-remix-icon";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import { useFocusEffect } from "@react-navigation/native";
import CustomTabBar from "../CustomTabBar";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BleManager } from "react-native-ble-plx";
import base64 from "react-native-base64";
import Constants from "expo-constants";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { usePrinter } from "../../contexts/PrinterContext";
import axiosInstance from "../../utils/axiosConfig";
import { useNavigation } from "@react-navigation/native";
import PaymentModal from "../../components/PaymentModal";


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

const OnGoingOrderDetails = ({ route }) => {
  const navigation = useNavigation();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { orderDetail } = route.params;
  const { order_number, outlet_id = orderDetail.outlet_id, order_id = orderDetail.order_id } = orderDetail;
  const [isServed, setIsServed] = useState(false);
  const {
    isConnected: printerConnected,
    printerDevice: contextPrinterDevice,
    connectToPrinter: contextConnectToPrinter,
  } = usePrinter();
  const [bleManager] = useState(() => {
    if (!Constants.appOwnership || Constants.appOwnership !== "expo") {
      return new BleManager();
    }
    return null;
  });
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("");
  const [printerDevice, setPrinterDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [timelineData, setTimelineData] = useState([]);
  const [isTimelineModalVisible, setIsTimelineModalVisible] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('CASH');

  // Memoize menu_details
  const menu_details = useMemo(() => {
    return orderDetails?.menu_details || [];
  }, [orderDetails]);

  // Single useLayoutEffect for header
  useLayoutEffect(() => {
    if (!orderDetails?.order_details) {
      navigation.setOptions({
        headerRight: () => null
      });
      return;
    }

    const EditButton = () => (
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => {
          navigation.navigate("DemoScreen", {
            tableData: {
              table_id: orderDetails.order_details.table_id,
              table_number: orderDetails.order_details.table_number,
              section_id: orderDetails.order_details.section_id,
              section_name: orderDetails.order_details.section,
              is_occupied: 1,
              order_id: orderDetails.order_details.order_id,
              order_number: orderDetails.order_details.order_number,
              outlet_id: orderDetails.order_details.outlet_id,
            },
            orderType: orderDetails.order_details.order_type?.toLowerCase() || "dine-in",
            existingOrderDetails: {
              ...orderDetails.order_details,
              payment_method: orderDetails.order_details.payment_method || "cash",
              menu_details: menu_details
            }
          });
        }}
      >
        <RemixIcon name="edit-2-line" size={20} color="#fff" />
      </TouchableOpacity>
    );

    navigation.setOptions({
      headerRight: EditButton
    });
  }, [orderDetails, navigation, menu_details]);

  // Fetch order details
  useFocusEffect(
    React.useCallback(() => {
      const fetchOrderDetails = async () => {
        try {
          const accessToken = await AsyncStorage.getItem("access_token");
          const response = await axiosInstance.post(
            onGetProductionUrl() + "order_view",
            { 
              order_number,
              outlet_id: outlet_id,
              order_id: order_id 
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          setOrderDetails(response.data.lists);
        } catch (error) {
          console.error("Error fetching order details:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchOrderDetails();
    }, [order_number, outlet_id, order_id])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      const response = await axiosInstance.post(
        onGetProductionUrl() + "order_view",
        { order_number, outlet_id, order_id },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      setOrderDetails(response.data.lists);
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setRefreshing(false);
    }
  }, [order_number, outlet_id, order_id]);

  const handleStatusUpdate = async () => {
    try {
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_order_status",
        {
          outlet_id: restaurantId,
          order_id: orderDetails.order_details.order_id,
          user_id: userId,
          order_status: "served",
          payment_method: orderDetails.order_details.payment_method || "",
          is_paid: orderDetails.order_details.is_paid || "0",
          customer_name: orderDetails.order_details.customer_name || "",
          customer_mobile: orderDetails.order_details.customer_mobile || "",
          customer_alternate_mobile: orderDetails.order_details.customer_alternate_mobile || "",
          customer_address: orderDetails.order_details.customer_address || "",
          customer_landmark: orderDetails.order_details.customer_landmark || "",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        setIsServed(true);
        Alert.alert("Success", "Order marked as served", [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("OrderList");
            },
          },
        ]);
      } else {
        Alert.alert(
          "Error",
          response.data.msg || "Failed to update order status"
        );
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      Alert.alert("Error", "Failed to update order status");
    }
  };

  const textToBytes = (text) => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(text));
  };

  const generateReceiptData = async (orderData = null) => {
    try {
      // Use provided orderData if available, otherwise use state orderDetails
      const orderDetailsToUse = orderData || orderDetails;

      const getCurrentDateTime = () => {
        const now = new Date();
        
        // Get the day as 2-digit
        const day = String(now.getDate()).padStart(2, '0');
        
        // Get the month name in uppercase
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const month = monthNames[now.getMonth()];
        
        // Get the year
        const year = now.getFullYear();
        
        // Get hours and format for 12-hour clock
        let hours = now.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        hours = String(hours).padStart(2, '0');
        
        // Get minutes
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        // Format the final date string
        return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
      };
      // Get the required values from order details
      const {
        total_bill_amount: subtotal,
        discount_amount: discount,
        discount_percent: discountPercent,
        special_discount: specialDiscount,
        charges: extraCharges,
        total_bill_with_discount: totalWithDiscount,
        service_charges_amount: serviceCharges,
        service_charges_percent: serviceChargesPercent,
        gst_amount: gstAmount,
        gst_percent: gstPercent,
        tip,
        grand_total: grandTotal,
        final_grand_total: finalGrandTotal,
        // Customer details
        customer_name: customerName,
        
        // Payment details
        is_paid: isPaid,
        payment_method: paymentMethod,
        is_complementary: isComplementary
      } = orderDetailsToUse.order_details;

      const upiId = (await AsyncStorage.getItem("upi_id")) || "merchant@upi";
      const websiteUrl =
        (await AsyncStorage.getItem("website_url")) || "menumitra.com";

      // Initialize printer and set print speed
      const initCommands = [
        ...textToBytes("\x1B\x40"), // Initialize printer
        ...textToBytes("\x1B\x74\x00"), // Select character code table
        ...textToBytes("\x1D\x50\x00"), // Set print speed to maximum
      ];

      // Generate QR code data with safe values
      const qrData = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
        orderDetailsToUse.order_details.outlet_name
      )}&am=${finalGrandTotal ? finalGrandTotal.toFixed(2) : grandTotal.toFixed(2)}`;

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

      const getDottedLine = () => "--------------------------------\n";

      const formatAmountLine = (label, amount, symbol = "") => {
        const amountStr = Math.abs(amount).toFixed(2);
        const totalWidth = 32;
        const amountWidth = 12;
        const padding = Math.max(2, totalWidth - label.length - amountWidth);
        const amountWithSymbol = `${symbol}${amountStr}`;
        const amountPadded = amountWithSymbol.padStart(amountWidth);
        return `${label}${" ".repeat(padding)}${amountPadded}\n`;
      };

      const formatMenuItem = (item) => {
        const name = item.menu_name || "";
        const qty = item.quantity.toString();
        const rate = Math.floor(item.price).toString();
        const total = item.menu_sub_total.toFixed(2);

        if (name.length > 14) {
          const lines = name.match(/.{1,14}/g) || [];
          const firstLine = `${lines[0].padEnd(14)} ${qty.padStart(
            2
          )} ${rate.padStart(5)} ${total.padStart(8)}\n`;
          if (lines.length > 1) {
            const remainingLines = lines
              .slice(1)
              .map((line) => `${line.padEnd(14)}\n`)
              .join("");
            return firstLine + remainingLines;
          }
          return firstLine;
        }
        return `${name.padEnd(14)} ${qty.padStart(2)} ${rate.padStart(
          5
        )} ${total.padStart(8)}\n`;
      };

      // Log payment info for debugging
      console.log("Receipt generation - isPaid:", isPaid);
      console.log("Receipt generation - paymentMethod:", paymentMethod);
      console.log("Receipt generation - isComplementary:", isComplementary);

      return [
        ...COMMANDS.INITIALIZE,
        ...textToBytes("\x1B\x61\x01"), // Center align
        
        // Display PAID or COMPLEMENTARY status at the top with double height
        ...(isPaid === 1 || isPaid === "paid" || isPaid === true ? [
          ...textToBytes("\x1B\x21\x10"), // Double width, double height
          ...textToBytes("PAID\n"),
          ...textToBytes("\x1B\x21\x00") // Reset text size
        ] : 
        isComplementary === 1 || isComplementary === true || isComplementary === "1" || 
        orderDetailsToUse.order_details.is_paid === "complementary" || 
        orderDetailsToUse.order_details.is_complementary === 1 ||
        orderDetailsToUse.order_details.is_complementary === "1" ||
        paymentMethod === "COMPLEMENTARY" ? [
          ...textToBytes("\x1B\x21\x10"), // Double width, double height
          ...textToBytes("COMPLEMENTARY\n"),
          ...textToBytes("\x1B\x21\x00") // Reset text size
        ] : 
        []),
        
        ...textToBytes("\x1B\x21\x08"), // Double height for outlet name
        
        ...textToBytes(`${orderDetailsToUse.order_details.outlet_name}\n`),
        ...textToBytes("\x1B\x21\x00"), // Normal height
        ...textToBytes(`${orderDetailsToUse.order_details.outlet_address}\n`),
        ...textToBytes(
          `${
            orderDetailsToUse.order_details.outlet_mobile
              ? `${orderDetailsToUse.order_details.outlet_mobile}\n`
              : ""
          }`
        ),
        
        ...textToBytes("\x1B\x61\x00"), // Left align
        ...textToBytes(`Bill No: ${order_number}\n`),
        ...textToBytes(
          orderDetailsToUse.order_details.order_type === "dine-in"
            ? `Table: ${orderDetailsToUse.order_details.section} - ${orderDetailsToUse.order_details.table_number}\n`
            : `Type: ${
                orderDetailsToUse.order_details.order_type.charAt(0).toUpperCase() +
                orderDetailsToUse.order_details.order_type.slice(1)
              }\n`
        ),
        ...textToBytes(`DateTime: ${getCurrentDateTime()}\n`),
        
        // Add customer name if available (but not mobile/address)
        ...(customerName ? textToBytes(`Customer: ${customerName}\n`) : []),
        
        // Display payment method if paid and method exists
        ...((isPaid === 1 || isPaid === "paid" || isPaid === true) && paymentMethod ? 
          textToBytes(`Payment: ${paymentMethod.toString().toUpperCase()}\n`) : 
          []),
        
        ...textToBytes(getDottedLine()),
        ...textToBytes("Item           Qty  Rate     Amt\n"),
        ...textToBytes(getDottedLine()),
        
        // Menu items
        ...orderDetailsToUse.menu_details.flatMap((item) =>
          textToBytes(formatMenuItem(item))
        ),
        ...textToBytes(getDottedLine()),
        
        // Amount section - FIXED: removed array brackets around textToBytes calls for conditional items
        ...textToBytes(formatAmountLine("Total", subtotal)),

        // Discount if it exists - FIXED: removed extra array brackets
        ...(Math.abs(discount) > 0.001 ? 
          textToBytes(formatAmountLine(`Discount(${discountPercent}%)`, discount, "-"))
          : []),

        // Special discount if it exists - ADDED THIS SECTION
        ...(Math.abs(specialDiscount) > 0.001 ? 
          textToBytes(formatAmountLine("Special Discount", specialDiscount, "-"))
          : []),

        // Extra charges if they exist - FIXED: removed extra array brackets
        ...(Math.abs(extraCharges) > 0.001 ? 
          textToBytes(formatAmountLine("Extra Charges", extraCharges, "+"))
          : []),

        ...textToBytes(formatAmountLine("Subtotal", totalWithDiscount)),

        // Service charges if they exist - FIXED: removed extra array brackets
        ...(Math.abs(serviceCharges) > 0.001 ? 
          textToBytes(formatAmountLine(`Service Ch.(${serviceChargesPercent}%)`, serviceCharges, "+"))
          : []),

        // GST if they exist - FIXED: removed extra array brackets
        ...(Math.abs(gstAmount) > 0.001 ? 
          textToBytes(formatAmountLine(`GST(${gstPercent}%)`, gstAmount, "+"))
          : []),

        // Tip if it exists - FIXED: removed extra array brackets
        ...(Math.abs(tip) > 0.001 ? 
          textToBytes(formatAmountLine("Tip", tip, "+"))
          : []),

        ...textToBytes(getDottedLine()),
        // Use final_grand_total if available, otherwise use grand_total
        ...textToBytes(formatAmountLine("Total", finalGrandTotal || grandTotal)),
        ...textToBytes("\n"),

        ...textToBytes("\x1B\x61\x01"), // Center align
        ...textToBytes(`Scan to Pay ${finalGrandTotal ? finalGrandTotal.toFixed(2) : grandTotal.toFixed(2)}\n\n`),
        ...textToBytes("\n"),
       
        
        ...generateQRCode(qrData),
        ...textToBytes('\n\n'),
        ...textToBytes("PhonePe  GPay  Paytm  UPI\n\n"),
        ...textToBytes("------------------------\n"),
        ...textToBytes("-----Thank You Visit Again!-----"),
        ...textToBytes("https://menumitra.com/\n"), // Fixed missing slash
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper
      ];
    } catch (error) {
      console.error("Error generating receipt data:", error);
      throw error;
    }
  };

  const generateReceiptHTML = async (orderData = null) => {
    try {
      // Use provided orderData if available, otherwise use state orderDetails
      const orderDetailsToUse = orderData || orderDetails;
      
      const websiteUrl =
        (await AsyncStorage.getItem("website_url")) || "menumitra.com";

      const formatCurrency = (amount) => `₹${parseFloat(amount).toFixed(2)}`;

      return `
        <html>
          <head>
            <style>
              body { font-family: monospace; text-align: center; }
              .header { margin-bottom: 20px; }
              .order-info { text-align: left; margin: 10px 0; }
              .items { width: 100%; text-align: left; }
              .dotted-line { border-top: 1px dotted black; margin: 10px 0; }
              .total { text-align: right; margin: 10px 0; }
              .footer { margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${orderDetailsToUse.order_details.outlet_name}</h2>
              <p>${orderDetailsToUse.order_details.outlet_address}</p>
              <p>${orderDetailsToUse.order_details.outlet_mobile}</p>
            </div>
            <div class="order-info">
              <p>Order: #${order_number}</p>
              <p>${
                orderDetailsToUse.order_details.order_type === "dine-in"
                  ? `Table: ${orderDetailsToUse.order_details.section}-${orderDetailsToUse.order_details.table_number}`
                  : `Type: ${orderDetailsToUse.order_details.order_type}`
              }</p>
              <p>DateTime: ${orderDetailsToUse.order_details.datetime}</p>
              <p>Status: ONGOING</p>
            </div>
            <div class="dotted-line"></div>
            <div class="items">
              ${orderDetailsToUse.menu_details
                .map(
                  (item) => `
                  <p>${item.menu_name} x${item.quantity} 
                     ${formatCurrency(item.price)} = ${formatCurrency(
                    item.menu_sub_total
                  )}</p>
                `
                )
                .join("")}
            </div>
            <div class="dotted-line"></div>
            <div class="total">
              <p>Subtotal: ${formatCurrency(
                orderDetailsToUse.order_details.total_bill_amount
              )}</p>
              <p>Discount (${orderDetailsToUse.order_details.discount_percent}%): 
                 ${formatCurrency(
                   orderDetailsToUse.order_details.discount_amount
                 )}</p>
              <p>Service Charges (${
                orderDetailsToUse.order_details.service_charges_percent
              }%): 
                 ${formatCurrency(
                   orderDetailsToUse.order_details.service_charges_amount
                 )}</p>
              <p>GST (${orderDetailsToUse.order_details.gst_percent}%): 
                 ${formatCurrency(orderDetailsToUse.order_details.gst_amount)}</p>
              <p><strong>Grand Total: ${formatCurrency(
                orderDetailsToUse.order_details.grand_total
              )}</strong></p>
            </div>
            <div class="footer">
              <p><strong>*** ONGOING ORDER ***</strong></p>
              <p>Visit us at: ${websiteUrl}</p>
              <p>Thank you for visiting!</p>
            </div>
          </body>
        </html>
      `;
    } catch (error) {
      console.error("Error generating receipt HTML:", error);
      throw error;
    }
  };

  const printReceipt = async (orderData = null) => {
    if (!contextPrinterDevice || !printerConnected) {
      Alert.alert(
        "Printer Not Connected",
        "Please connect a printer to print the receipt",
        [
          { text: "Connect Printer", onPress: () => navigation.navigate("PrinterManagement") },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    try {
      // Use provided orderData if available, otherwise use state orderDetails
      const orderDetailsToUse = orderData || orderDetails;
      
      console.log("Starting print receipt with payment status:", orderDetailsToUse.order_details.is_paid);
      console.log("Payment method:", orderDetailsToUse.order_details.payment_method);
      
      setIsLoading(true);
      setLoadingMessage("Printing receipt...");

      if (!Constants.appOwnership || Constants.appOwnership !== "expo") {
        const services = await contextPrinterDevice.services();
        const service = services.find((svc) =>
          PRINTER_SERVICE_UUIDS.some((uuid) =>
            svc.uuid.toLowerCase().includes(uuid.toLowerCase())
          )
        );

        if (!service) {
          throw new Error("Printer service not found");
        }

        const characteristics = await service.characteristics();
        const foundCharacteristic = characteristics.find((char) =>
          PRINTER_CHARACTERISTIC_UUIDS.some((uuid) =>
            char.uuid.toLowerCase().includes(uuid.toLowerCase())
          )
        );

        if (!foundCharacteristic) {
          throw new Error("Printer characteristic not found");
        }

        // Log the exact values being used for debugging
        console.log("Receipt data - is_paid:", orderDetailsToUse.order_details.is_paid);
        console.log("Receipt data - payment_method:", orderDetailsToUse.order_details.payment_method);
        console.log("Receipt data - is_complementary:", orderDetailsToUse.order_details.is_complementary);
        
        // Generate receipt data using the provided orderData
        const receiptData = await generateReceiptData(orderDetailsToUse);
        const CHUNK_SIZE = 100; // Match the chunk size from PlacedOrderDetails
        for (let i = 0; i < receiptData.length; i += CHUNK_SIZE) {
          const chunk = receiptData.slice(i, i + CHUNK_SIZE);
          await foundCharacteristic.writeWithResponse(
            base64.encode(String.fromCharCode(...chunk))
          );
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        console.log("Receipt printed successfully with payment status:", orderDetailsToUse.order_details.is_paid);
      } else {
        const html = await generateReceiptHTML(orderDetailsToUse);
        const { uri } = await Print.printToFileAsync({
          html: html,
          base64: false,
        });
        await Print.printAsync({ uri: uri });
      }
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert("Error", "Failed to print receipt. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleScanPrinters = async () => {
    if (printerConnected) {
      printReceipt();
      return;
    }

    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "Bluetooth scanning requires location permission",
            buttonPositive: "Allow",
            buttonNegative: "Cancel",
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            "Permission Required",
            "Location permission is required for Bluetooth scanning"
          );
          return;
        }
      }

      setIsModalVisible(true);
      setAvailableDevices([]);
      setIsScanning(true);
      
    } catch (error) {
      console.error("Scanning error:", error);
      Alert.alert("Error", "Failed to scan for printers");
      setIsScanning(false);
    }
  };

 

  const scanForPrinters = async () => {
    if (Constants.appOwnership === "expo") {
      Alert.alert(
        "Not Available",
        "Printer functionality is only available in production build.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
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

      // Start scanning without clearing devices first
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error("Scan error:", error);
          return;
        }

        if (device) {
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

  useEffect(() => {
    if (isModalVisible) {
      scanForPrinters();
    } else {
      // Clean up when modal closes
      bleManager?.stopDeviceScan();
      setIsScanning(false);
    }
  }, [isModalVisible]);

  const handleRefresh = () => {
    setAvailableDevices([]); // Clear devices before new scan
    bleManager?.stopDeviceScan();
    scanForPrinters();
    setConnectionStatus("");
  };

  const DeviceSelectionModal = () => {
    return (
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
            <Text style={styles.modalTitle}>Select Printer Device</Text>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <RemixIcon name="refresh-line" size={20} color="#219ebc" />
            </TouchableOpacity>

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

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setIsModalVisible(false);
                bleManager?.stopDeviceScan();
                setIsScanning(false);
                setConnectionStatus("");
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const LoadingOverlay = () => {
    if (!isLoading) return null;
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!orderDetails) {
    return (
      <View style={styles.container}>
        <Text>Failed to load order details.</Text>
      </View>
    );
  }

  const { order_details } = orderDetails;

  const fetchOrderTimeline = async () => {
    try {
      setTimelineLoading(true);
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
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
        setIsTimelineModalVisible(true);
      } else {
        Alert.alert("Error", "Failed to fetch order timeline");
      }
    } catch (error) {
      console.error("Error fetching timeline:", error);
      Alert.alert("Error", "Failed to fetch order timeline");
    } finally {
      setTimelineLoading(false);
    }
  };

  const TimelineModal = () => {
    return (
      <Modal
        visible={isTimelineModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsTimelineModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsTimelineModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.timelineModalContent}>
                <View style={styles.timelineModalHeader}>
                  <Text style={styles.timelineModalTitle}>
                    Order Timeline - #{orderDetails?.order_details?.order_number}
                  </Text>
                  <TouchableOpacity onPress={() => setIsTimelineModalVisible(false)}>
                    <RemixIcon name="close-line" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.timelineScrollView}>
                  {timelineData.map((item, index) => {
                    return (
                      <View key={item.order_time_line_id} style={styles.timelineItem}>
                        <View style={styles.timelineLeftColumn}>
                          <View style={styles.timelineDot} />
                          {index < timelineData.length - 1 && (
                            <View style={styles.timelineLine} />
                          )}
                        </View>
                        
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineUser}>{item.user_name} ({item.user_role})</Text>
                          <Text style={styles.timelineStatus}>
                            Status: <Text style={styles.timelineStatusText}>
                              {item.order_status.charAt(0).toUpperCase() + item.order_status.slice(1)}
                            </Text>
                          </Text>
                          <Text style={styles.timelineDate}>{item.created_on}</Text>
                        </View>
                      </View>
                    );
                  })}
                  
                  {timelineData.length === 0 && !timelineLoading && (
                    <Text style={styles.noTimelineText}>No timeline data available</Text>
                  )}
                  
                  {timelineLoading && (
                    <View style={styles.timelineLoading}>
                      <ActivityIndicator size="small" color="#4b89dc" />
                      <Text style={styles.timelineLoadingText}>Loading timeline...</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  const renderHeader = () => {
    if (!orderDetails) return null;
    const { order_details } = orderDetails;

    return (
      <>
        <View style={[styles.headerCard, { backgroundColor: "#FF9800" }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.orderStatus}>
                Status: {order_details.order_status}
              </Text>
              <Text style={styles.orderTime}>{order_details.datetime}</Text>
              {order_details.order_type && (
                <View style={styles.orderTypeContainer}>
                  <RemixIcon
                    name={
                      order_details.order_type?.toLowerCase() === "dine-in"
                        ? "restaurant-fill"
                        : order_details.order_type?.toLowerCase() === "take-away" || 
                          order_details.order_type?.toLowerCase() === "parcel"
                        ? "takeaway-fill"
                        : order_details.order_type?.toLowerCase() === "drive-through"
                        ? "car-fill"
                        : "restaurant-2-fill"
                    }
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.orderTypeText}>
                    {order_details.order_type}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.headerRight}>
              <Text style={styles.orderNumber}>
                #{order_details.order_number}
              </Text>
              <TouchableOpacity 
                style={styles.timelineButton}
                onPress={fetchOrderTimeline}
                disabled={timelineLoading}
              >
                <RemixIcon name="time-line" size={14} color="#fff" />
                <Text style={styles.timelineButtonText}>
                  {timelineLoading ? "Loading..." : "Timeline"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Table information for dine-in orders */}
        {order_details.order_type?.toLowerCase() === "dine-in" && order_details.table_number && (
          <View style={styles.tableContainer}>
            <View style={styles.tableInfoContainer}>
              <RemixIcon name="restaurant-2-fill" size={18} color="#666" />
              <Text style={styles.tableText}>
                Table {order_details.table_number}
                {order_details.section ? ` (${order_details.section})` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Menu count for all order types */}
        <View style={[styles.tableContainer, {marginTop: order_details.order_type?.toLowerCase() === "dine-in" ? 0 : 8}]}>
          
          
          <View style={styles.menuCountContainer}>
            <RemixIcon name="file-list-2-fill" size={16} color="#FF9800" />
            <Text style={styles.menuCountLabel}>Menu Count:</Text>
            <Text style={styles.menuCountText}>{menu_details?.length || orderDetails?.order_details?.menu_count || 0}</Text>
          </View>
        </View>

        {order_details.comment && (
          <View style={styles.commentContainer}>
            <View style={styles.commentHeader}>
              <RemixIcon name="chat-1-fill" size={18} color="#FF9800" />
              <Text style={styles.commentLabel}>Order Comment:</Text>
            </View>
            <Text style={styles.commentText}>{order_details.comment}</Text>
          </View>
        )}
      </>
    );
  };

  const renderFooter = () => {
    if (!orderDetails?.order_details) return null;
    const order_details = orderDetails.order_details;
    
    return (
      <View>
        <View style={styles.card}>
          {/* Total */}
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Total</Text>
            <Text style={styles.cardAmount}>
              ₹{parseFloat(order_details.total_bill_amount || 0).toFixed(2)}
            </Text>
          </View>

          {/* Discount */}
          {parseFloat(order_details.discount_amount || 0) > 0 && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>
                Discount {parseFloat(order_details.discount_percent || 0) > 0 ? 
                  `(${order_details.discount_percent}%)` : ''}
              </Text>
              <Text style={[styles.cardAmount, styles.negativeAmount]}>
                -₹{parseFloat(order_details.discount_amount || 0).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Special Discount */}
          {parseFloat(order_details.special_discount || 0) > 0 && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Special Discount</Text>
              <Text style={[styles.cardAmount, styles.negativeAmount]}>
                -₹{parseFloat(order_details.special_discount || 0).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Extra Charges */}
          {parseFloat(order_details.charges || 0) > 0 && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Extra Charges</Text>
              <Text style={[styles.cardAmount, styles.positiveAmount]}>
                +₹{parseFloat(order_details.charges || 0).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Subtotal line - only if there are discounts or extra charges */}
          {(parseFloat(order_details.discount_amount || 0) > 0 || 
            parseFloat(order_details.special_discount || 0) > 0 ||
            parseFloat(order_details.extra_charges || 0) > 0) && (
            <View style={styles.cardRow}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalAmount}>
                ₹{parseFloat(order_details.total_bill_with_discount || 0).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Service Charges */}
          {parseFloat(order_details.service_charges_amount || 0) > 0 && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>
                Service Charges {parseFloat(order_details.service_charges_percent || 0) > 0 ? 
                  `(${order_details.service_charges_percent}%)` : ''}
              </Text>
              <Text style={[styles.cardAmount, styles.positiveAmount]}>
                +₹{parseFloat(order_details.service_charges_amount || 0).toFixed(2)}
              </Text>
            </View>
          )}

          {/* GST */}
          {parseFloat(order_details.gst_amount || 0) > 0 && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>
                GST {parseFloat(order_details.gst_percent || 0) > 0 ? 
                  `(${order_details.gst_percent}%)` : ''}
              </Text>
              <Text style={[styles.cardAmount, styles.positiveAmount]}>
                +₹{parseFloat(order_details.gst_amount || 0).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Tip */}
          {parseFloat(order_details.tip || 0) > 0 && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Tip</Text>
              <Text style={[styles.cardAmount, styles.positiveAmount]}>
                +₹{parseFloat(order_details.tip || 0).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Grand Total */}
          <View style={[styles.cardRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Final Grand Total</Text>
            <Text style={styles.grandTotalAmount}>
              ₹{parseFloat(order_details.final_grand_total || 0).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const generateKOTData = () => {
    try {
      const getDottedLine = () => "-------------------------------\n";
      


      const getCurrentDateTime = () => {
        const now = new Date();
        
        // Get the day as 2-digit
        const day = String(now.getDate()).padStart(2, '0');
        
        // Get the month name in uppercase
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const month = monthNames[now.getMonth()];
        
        // Get the year
        const year = now.getFullYear();
        
        // Get hours and format for 12-hour clock
        let hours = now.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        hours = String(hours).padStart(2, '0');
        
        // Get minutes
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        // Format the final date string
        return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
      };
      // Calculate total quantity of all items
      const totalQuantity = orderDetails?.menu_details?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

      // Get outlet mobile from order details
      const outletMobile = orderDetails?.order_details?.outlet_mobile || "";

      return [
        ...textToBytes("\x1B\x40"), // Initialize printer
        ...textToBytes("\x1B\x61\x01"), // Center alignment
        
        // Add KOT header
        ...textToBytes("\x1B\x21\x10"), // Double width, double height
        ...textToBytes("*** KOT ***\n\n"),
        
        ...textToBytes(`${orderDetails?.order_details?.outlet_name || "Restaurant"}\n`),
        ...textToBytes("\x1B\x21\x00"), // Normal text
        ...textToBytes(`${orderDetails?.order_details?.outlet_address || ""}\n`),
        ...textToBytes(`${outletMobile ? `${outletMobile}\n` : ""}`),
        ...textToBytes("\n"),
        
        ...textToBytes("\x1B\x61\x00"), // Left align
        ...textToBytes(`Bill No: ${order_number}\n`),
        ...textToBytes(
          orderDetails?.order_details?.order_type === "dine-in"
            ? `Table: ${orderDetails?.order_details?.section} - ${orderDetails?.order_details?.table_number}\n`
            : `Type: ${orderDetails?.order_details?.order_type?.toUpperCase()}\n`
        ),
        ...textToBytes(`DateTime: ${getCurrentDateTime()}\n`),
        ...textToBytes(getDottedLine()),


        // Column headers
        ...textToBytes("Item                      Qty\n"),
        ...textToBytes(getDottedLine()),

        // Menu items
        ...orderDetails?.menu_details?.map(item => {
          const name = item.menu_name || "";
          const qty = item.quantity.toString();
          
          if (name.length > 23) {
            const lines = name.match(/.{1,23}/g) || [];
            return textToBytes(
              lines
                .map((line, index) =>
                  index === 0
                    ? `${line.padEnd(23)} ${qty}\n`
                    : `${line.padEnd(26)}\n`
                )
                .join("")
            );
          }
          return textToBytes(`${name.padEnd(23)} ${qty}\n`);
        }).flat(),

        ...textToBytes(getDottedLine()),
        // Align "Total Items" with the quantity column by padding to 23 chars
        ...textToBytes(`${"Total Items:".padEnd(23)} ${totalQuantity}\n`),
        ...textToBytes("\n"),
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper
      ];
    } catch (error) {
      console.error("Error generating KOT data:", error);
      throw error;
    }
  };

  const printKOT = async () => {
    if (!printerConnected || !contextPrinterDevice) {
      Alert.alert(
        "Printer Not Connected",
        "Please connect a printer first",
        [
          { text: "Connect Printer", onPress: () => navigation.navigate("PrinterManagement") },
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

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      try {
        if (Platform.Version >= 31) {
          // Android 12 or higher
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
      } catch (error) {
        console.error("Permission request error:", error);
        return false;
      }
    }
    return true;
  };

  const connectToPrinter = async (device) => {
    try {
      console.log("Attempting to connect to:", device.name);
      setLoadingMessage(`Connecting to ${device.name}...`);
      setIsLoading(true);

      const connectedDevice = await device.connect({
        requestMTU: 512,
        autoConnect: true,
      });

      device.onDisconnected((error, disconnectedDevice) => {
        if (!isDisconnecting) {
          console.log("Unexpected disconnect, attempting to reconnect...");
          connectToPrinter(device).catch(console.error);
        }
      });

      console.log("Connected to device");
      setLoadingMessage("Discovering services...");
      const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();
      setPrinterDevice(discoveredDevice);
      setIsConnected(true);
      setIsLoading(false);
      setLoadingMessage("");
    } catch (error) {
      console.error("Connection error:", error);
      setIsLoading(false);
      setLoadingMessage("");
      Alert.alert(
        "Connection Failed",
        `Failed to connect to ${device.name}: ${error.message}`
      );
    }
  };

  const handleDeviceSelection = async (device) => {
    try {
      setConnectionStatus("Connecting...");
      bleManager?.stopDeviceScan();
      setIsScanning(false);

      const connectedDevice = await device.connect();
      const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();

      // Find the correct service and characteristic
      const services = await discoveredDevice.services();
      let printerService = null;
      let printerCharacteristic = null;

      for (const service of services) {
        if (PRINTER_SERVICE_UUIDS.includes(service.uuid)) {
          printerService = service;
          const characteristics = await service.characteristics();
          for (const characteristic of characteristics) {
            if (PRINTER_CHARACTERISTIC_UUIDS.includes(characteristic.uuid)) {
              printerCharacteristic = characteristic;
              break;
            }
          }
          if (printerCharacteristic) break;
        }
      }

      if (printerService && printerCharacteristic) {
        setPrinterDevice({
          device: discoveredDevice,
          service: printerService,
          characteristic: printerCharacteristic,
        });
        setConnectionStatus("Connected successfully!");
        setIsConnected(true);
        
        // Close modal after successful connection
        setTimeout(() => {
          setIsModalVisible(false);
          setConnectionStatus("");
        }, 1500);
      } else {
        throw new Error("No compatible printer service found");
      }
    } catch (error) {
      console.error("Device selection error:", error);
      setConnectionStatus("Connection failed. Please try again.");
      setPrinterDevice(null);
      setIsConnected(false);
    }
  };

  const renderCustomerDetails = () => {
    if (!orderDetails?.order_details) return null;
    
    const { customer_name, customer_mobile, customer_alternate_mobile, customer_address, customer_landmark } = orderDetails.order_details;
    
    // Only show this section if we have any customer details
    if (!customer_name && !customer_mobile && !customer_address) return null;
    
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        
        <View style={styles.customerDetailsGrid}>
          {/* First row */}
          <View style={styles.customerGridItem}>
            {customer_name ? (
              <>
                <Text style={styles.customerValue}>{customer_name}</Text>
                <Text style={styles.customerLabel}>Name</Text>
              </>
            ) : null}
          </View>
          
          <View style={styles.customerGridItem}>
            {customer_mobile ? (
              <>
                <Text style={styles.customerValue}>{customer_mobile}</Text>
                <Text style={styles.customerLabel}>Mobile</Text>
              </>
            ) : null}
          </View>
          
          {/* Second row */}
          <View style={styles.customerGridItem}>
            {customer_alternate_mobile ? (
              <>
                <Text style={styles.customerValue}>{customer_alternate_mobile}</Text>
                <Text style={styles.customerLabel}>Alt. Mobile</Text>
              </>
            ) : null}
          </View>
          
          <View style={styles.customerGridItem}>
            {customer_address ? (
              <>
                <Text style={styles.customerValue}>{customer_address}</Text>
                <Text style={styles.customerLabel}>Address</Text>
              </>
            ) : null}
          </View>
          
          {/* Third row if needed */}
          {customer_landmark ? (
            <View style={styles.customerGridItem}>
              <>
                <Text style={styles.customerValue}>{customer_landmark}</Text>
                <Text style={styles.customerLabel}>Landmark</Text>
              </>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

    const handleSettlePayment = async (paymentMethod = null, isPaid = true) => {
      try {
        setIsLoading(true);
        const [restaurantId, userId, accessToken] = await Promise.all([
          getRestaurantId(),
          getUserId(),
          AsyncStorage.getItem("access_token"),
        ]);

        // Determine if this is a complementary order
        const isComplementary = paymentMethod === 'COMPLEMENTARY';

        // Close the payment modal immediately to avoid UI delays
        setIsPaymentModalVisible(false);
        
        // First update the local state to ensure the receipt shows the correct payment status
        // Create a new orderDetails object to avoid reference issues
        const updatedOrderDetails = {
          ...orderDetails,
          order_details: {
            ...orderDetails.order_details,
            is_paid: isComplementary ? "complementary" : "paid",
            payment_method: isComplementary ? "COMPLEMENTARY" : (paymentMethod || selectedPaymentMethod),
            is_complementary: isComplementary ? 1 : 0,
            order_status: "paid"
          }
        };
        
        // Update state with new orderDetails
        setOrderDetails(updatedOrderDetails);
        
        // Print receipt first if printer is connected
        if (printerConnected && contextPrinterDevice) {
          try {
            // Wait a moment for state to update
            await new Promise(resolve => setTimeout(resolve, 100));
            await printReceipt(updatedOrderDetails);
          } catch (printError) {
            console.error("Error printing receipt:", printError);
            // Continue with the flow even if printing fails
          }
        }
        
        // Then update the server status after printing
        const response = await axiosInstance.post(
          onGetProductionUrl() + "update_order_status",
          {
            outlet_id: restaurantId,
            order_id: orderDetails.order_details.order_id,
            user_id: userId,
            order_status: "paid",
            payment_method: isComplementary ? null : (paymentMethod || selectedPaymentMethod),
            is_paid: isComplementary ? "complementary" : "paid",
            is_complementary: isComplementary ? 1 : 0,
            customer_name: orderDetails.order_details.customer_name || "",
            customer_mobile: orderDetails.order_details.customer_mobile || "",
            customer_alternate_mobile: orderDetails.order_details.customer_alternate_mobile || "",
            customer_address: orderDetails.order_details.customer_address || "",
            customer_landmark: orderDetails.order_details.customer_landmark || "",
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.st === 1) {
          Alert.alert("Success", `Order ${isComplementary ? 'marked as complementary' : 'settled'} successfully`, [
            {
              text: "OK",
              onPress: () => {
                navigation.navigate("OrderList");
              },
            },
          ]);
        } else {
          Alert.alert(
            "Error",
            response.data.msg || "Failed to update order status"
          );
        }
      } catch (error) {
        console.error("Error settling order:", error);
        Alert.alert("Error", "Failed to settle order");
      } finally {
        setIsLoading(false);
      }
    };

    const openPaymentModal = () => {
      if (!printerConnected || !contextPrinterDevice) {
        Alert.alert(
          "Printer Not Connected",
          "Would you like to connect a printer before settling the order?",
          [
            { 
              text: "Connect Printer", 
              onPress: () => navigation.navigate("PrinterManagement") 
            },
            { 
              text: "Continue Without Printing", 
              onPress: () => setIsPaymentModalVisible(true) 
            },
            { 
              text: "Cancel", 
              style: "cancel" 
            },
          ]
        );
      } else {
        setIsPaymentModalVisible(true);
      }
    };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <FlatList
        data={menu_details}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.menuItem}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuName} numberOfLines={2}>
                {item.menu_name}
                {item.half_or_full && (
                  <Text style={styles.halfFullText}> ({item.half_or_full})</Text>
                )}
              </Text>
              <Text style={styles.menuQuantity}>x{item.quantity}</Text>
            </View>
            
            {item.comment && (
              <Text style={styles.menuComment}>{item.comment}</Text>
            )}
            
            <View style={styles.menuPriceRow}>
              <Text style={styles.menuPrice}>
                ₹{Number(item.price).toFixed(2)}
              </Text>
              {Number(item.offer) > 0 && (
                <Text style={styles.menuOffer}>
                  {item.offer}% Off
                </Text>
              )}
              <Text style={styles.menuTotal}>
                ₹{Number(item.menu_sub_total).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={
          <>
            {renderFooter()}
            {renderCustomerDetails()}
           

            <TouchableOpacity
              style={[
                styles.printButton,
                { backgroundColor: "#28a745", marginTop: 20 },
              ]}
              onPress={handleStatusUpdate}
            >
              <Text style={styles.printButtonText}>Mark as Served</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.printButton, { backgroundColor: "#3498db", marginHorizontal: 16, marginTop: 16 }]}
              onPress={openPaymentModal}
            >
              <View style={styles.buttonContent}>
                <RemixIcon name="printer-line" size={20} color="#fff" />
                <Text style={styles.printButtonText}>Print & Settle</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.printButton, { backgroundColor: "#000", marginHorizontal: 16, marginTop: 8 }]}
              onPress={printKOT}
            >
              <View style={styles.buttonContent}>
                <RemixIcon name="file-list-3-line" size={20} color="#fff" />
                <Text style={styles.printButtonText}>KOT</Text>
              </View>
            </TouchableOpacity>
          </>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF9A6C"]}
            tintColor="#FF9A6C"
          />
        }
      />
      <DeviceSelectionModal />
      <LoadingOverlay />
      <TimelineModal />
      <PaymentModal 
        visible={isPaymentModalVisible}
        onClose={() => setIsPaymentModalVisible(false)}
        onConfirm={handleSettlePayment}
        orderData={orderDetails?.order_details}
      />
      <CustomTabBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    position: "relative",
    padding: 10,
  },
  listContent: {
    paddingBottom: 80,
  },
  title: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 15,
    marginTop: 5,
    marginBottom: 5,
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
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    paddingRight: 8,
  },
  menuQuantity: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF9800',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  menuComment: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8,
    paddingLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
  },
  menuPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  menuPrice: {
    fontSize: 14,
    color: '#666',
  },
  menuOffer: {
    fontSize: 13,
    color: '#28a745',
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  menuTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4b89dc',
  },
  row: {
    borderTopRightRadius: 8,
    borderTopLeftRadius: 8,
    borderBottomEndRadius: 8,
    borderBottomStartRadius: 8,
    margin: 0,
    padding: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  firstRow: {
    paddingBottom: 10,
    paddingTop: 10,
    paddingLeft: 10,
    paddingEnd: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cardLabel: {
    fontSize: 14,
    color: '#666',
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  negativeAmount: {
    color: '#e53935',
  },
  positiveAmount: {
    color: '#4caf50',
  },
  horizontalLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginVertical: 8,
  },
  menuTable: {
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#f8f9fa",
    borderRadius: 5,
    padding: 12,
    marginVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 100,
    backgroundColor: "#0dcaf0",
    borderRadius: 30,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#6200EE",
    fontWeight: "bold",
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  flatListContent: {
    paddingBottom: 80,
  },
  printButton: {
    backgroundColor: "#219ebc",
    padding: 15,
    borderRadius: 8,
    margin: 16,
    marginTop: 8,
    alignItems: "center",
  },
  printButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginLeft: 4,
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
  },
  deviceList: {
    maxHeight: 300,
  },
  deviceItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  deviceItemDisabled: {
    opacity: 0.5,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "500",
  },
  deviceId: {
    fontSize: 12,
    color: "#666",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  noDevicesText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "#219ebc",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  refreshButton: {
    position: "absolute",
    right: 20,
    top: 20,
    padding: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  refreshButtonText: {
    color: "#219ebc",
    fontSize: 14,
    fontWeight: "500",
  },
  scanningContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  scanningText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
  menuComment: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 2,
    marginBottom: 4,
    paddingLeft: 4,
  },
  halfFullText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  modalButtonContainer: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: "bold",
    fontSize: 16,
  },
  statusContainer: {
    marginVertical: 10,
    paddingHorizontal: 15,
  },
  connectionStatus: {
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  connectingText: {
    backgroundColor: "#fff3cd",
    color: "#856404",
    borderColor: "#ffeeba",
    borderWidth: 1,
  },
  successText: {
    color: '#4CAF50',
  },
  errorText: {
    color: '#f44336',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
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
  orderTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderTypeText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#fff',
  },
  tableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  tableText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  menuCountLabel: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  menuCountText: {
    marginLeft: 4,
    fontWeight: 'bold',
    color: '#FF9800',
    fontSize: 14,
  },
  commentContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeeba',
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
    color: '#856404',
  },
  commentText: {
    fontSize: 14,
    color: '#666',
  },
  timelineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  timelineButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
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
    backgroundColor: '#FF9800',
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
    color: '#FF9800',
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
  grandTotalRow: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  grandTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  subtotalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  customerGridItem: {
    width: '50%',
    marginBottom: 1,
  },
  customerValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  customerLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default OnGoingOrderDetails;