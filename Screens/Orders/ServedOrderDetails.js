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
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Linking,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
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

const ServedOrderDetails = ({ route }) => {
  const navigation = useNavigation();
  
  const [bleManager] = useState(() => {
    if (!Constants.appOwnership || Constants.appOwnership !== "expo") {
      return new BleManager();
    }
    return null;
  });

  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { orderDetail } = route.params;
  const { order_number, outlet_id = orderDetail.outlet_id, order_id = orderDetail.order_id } = orderDetail;
  const [isPaid, setIsPaid] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [printerDevice, setPrinterDevice] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [timelineData, setTimelineData] = useState([]);
  const [isTimelineModalVisible, setIsTimelineModalVisible] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('CASH');
  // Add this variable at the top of the component to track if we're actively navigating
  const [isNavigating, setIsNavigating] = useState(false);

  const {
    isConnected: printerConnected,
    printerDevice: contextPrinterDevice,
    connectToPrinter: contextConnectToPrinter,
    scanForPrinters: contextScanForPrinters,
    sendDataToPrinter,
  } = usePrinter();

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
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
      setRefreshing(false);
    }
  }, [order_number, outlet_id, order_id ]);

  // Add a navigation listener to track screen focus/blur
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      // We're back on this screen, mark as not navigating
      console.log("ServedOrderDetails: Screen focused, setting isNavigating to false");
      setIsNavigating(false);
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      // We're leaving this screen, mark as navigating to prevent disconnection
      console.log("ServedOrderDetails: Screen blurred, setting isNavigating to true");
      setIsNavigating(true);
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  // Modify the existing printer-related useEffect to check isNavigating flag
  useEffect(() => {
    const checkBluetoothState = async () => {
      if (Constants.appOwnership === "expo" || !printerConnected) {
        return;
      }
      try {
        const state = await printerConnected.state();
        if (state !== "PoweredOn") {
          Alert.alert(
            "Bluetooth Required",
            "Please enable Bluetooth to connect to printers",
            [
              {
                text: "Open Settings",
                onPress: () => {
                  if (Platform.OS === "android") {
                    printerConnected.enable();
                  } else {
                    Linking.openSettings();
                  }
                },
              },
              { text: "Cancel", style: "cancel" },
            ]
          );
        }
      } catch (error) {
        console.error("Error checking Bluetooth state:", error);
      }
    };

    checkBluetoothState();
  }, [printerConnected]);

  useEffect(() => {
    if (isModalVisible) {
      scanForPrinters();
    } else {
      bleManager?.stopDeviceScan();
      setIsScanning(false);
    }
    
    // Don't disconnect when component unmounts
    return () => {
      if (bleManager) {
        bleManager.stopDeviceScan();
        setIsScanning(false);
        // Don't destroy bleManager or disconnect printer
      }
    };
  }, [isModalVisible, bleManager]);

  // Update the bottom cleanup effect to check isNavigating before cleanup
  useEffect(() => {
    return () => {
      // Only fully cleanup if the app is closing, not just navigating
      if (!isNavigating && bleManager) {
        // Just stop scanning but don't destroy the manager or disconnect printer
        bleManager.stopDeviceScan();
        console.log("ServedOrderDetails: Preserving printer connection while navigating");
      }
    };
  }, [bleManager, isNavigating]);

  // Add an effect to ensure printer connection is maintained when returning to this screen
  useFocusEffect(
    React.useCallback(() => {
      // Only attempt to silently reconnect if we have a device to connect to
      if (contextPrinterDevice && !printerConnected) {
        console.log("ServedOrderDetails: Attempting to silently reconnect to printer");
        contextConnectToPrinter(contextPrinterDevice).catch(err => {
          console.log("Silent printer reconnection failed:", err);
          // Don't show alerts for background reconnection attempts
        });
      } else if (contextPrinterDevice && printerConnected) {
        console.log("ServedOrderDetails: Printer already connected");
      }
      
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
    }, [order_number, outlet_id, order_id, contextPrinterDevice, printerConnected, contextConnectToPrinter])
  );

  const handleMarkAsPaid = () => {
    openPaymentModal();
  };

  const handleSettlePayment = async (paymentMethod = null, isPaid = true) => {
    try {
      setIsLoading(true);
      setLoadingMessage("Updating order status...");
      
      // Get all required IDs
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
      
      // Format data according to what the API expects
      const data = {
        outlet_id: restaurantId,
        order_id: orderDetails.order_details.order_id,
        order_status: "paid",
        user_id: userId,
        payment_method: isComplementary ? null : (paymentMethod || selectedPaymentMethod),
        is_paid: isComplementary ? "complementary" : "paid",
        is_complementary: isComplementary ? 1 : 0,
        customer_name: orderDetails.order_details.customer_name || "",
        customer_mobile: orderDetails.order_details.customer_mobile || "",
        customer_alternate_mobile: orderDetails.order_details.customer_alternate_mobile || "",
        customer_address: orderDetails.order_details.customer_address || "",
        customer_landmark: orderDetails.order_details.customer_landmark || "",
      };
      
      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_order_status",
        data,
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
              // Navigate to OrderList screen
              navigation.navigate("OrderList");
            }
          }
        ]);
      } else {
        Alert.alert("Error", response.data.msg || "Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      Alert.alert("Error", "Something went wrong while updating the order: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReceiptHTML = async () => {
    try {
      // Format menu items with prices
      const menuItemsHTML = orderDetails.menu_details
        .map((item) => {
          const itemHTML = `
            <div class="item-row">
              <div class="item-details">
                <div class="item-name-qty">
                  <span class="item-name">${item.menu_name}</span>
                  <span class="item-qty">${item.quantity}x</span>
                </div>
                <div class="item-price-line">
                  <span class="portion">${item.portion || "Full"}</span>
                  <span class="price">₹${parseFloat(
                    item.menu_sub_total
                  ).toFixed(2)}</span>
                </div>
                ${
                  item.special_instructions
                    ? `<div class="special-instructions">${item.special_instructions}</div>`
                    : ""
                }
              </div>
            </div>
          `;
          return itemHTML;
        })
        .join("");

      // Add order type display logic
      const orderTypeDisplay = () => {
        const orderType = orderDetails.order_details.order_type;
        if (orderType === "dine-in") {
          return `Table: ${orderDetails.order_details.section}-${orderDetails.order_details.table_number}`;
        } else {
          // Capitalize first letter and format order type
          const formattedType =
            orderType.charAt(0).toUpperCase() + orderType.slice(1);
          return `Order Type: ${formattedType}`;
        }
      };

      return `
        <html>
          <head>
            <style>
              @page { 
                margin: 0;
                size: 60mm auto;
              }
              body { 
                font-family: monospace;
                margin: 0;
                padding: 8px;
                font-size: 14px;
                line-height: 1.3;
              }
              .header {
                text-align: center;
                margin-bottom: 8px;
              }
              .restaurant-name {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 4px;
              }
              .restaurant-address {
                font-size: 12px;
                margin-bottom: 8px;
              }
              .restaurant-phone {
                font-size: 12px;
                margin-bottom: 4px;
              }
              .order-details {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-weight: bold;
              }
              .divider {
                border-top: 2px solid #000;
                margin: 8px 0;
              }
              .dotted-divider {
                border-top: 1px dotted #000;
                margin: 8px 0;
              }
              .item-row {
                margin: 8px 0;
              }
              .item-details {
                width: 100%;
              }
              .item-name-qty {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
              }
              .item-price-line {
                display: flex;
                justify-content: space-between;
                margin-top: 2px;
              }
              .portion {
                font-size: 12px;
                color: #666;
              }
              .price {
                font-weight: bold;
              }
              .special-instructions {
                font-size: 12px;
                font-style: italic;
                margin-top: 4px;
                padding-left: 8px;
              }
              .totals-section {
                margin-top: 12px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                margin: 4px 0;
              }
              .grand-total {
                font-size: 16px;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                margin-top: 12px;
                font-size: 12px;
              }
              .order-type {
                text-align: center;
                font-weight: bold;
                margin: 8px 0;
                padding: 4px;
                border: 2px solid #000;
              }
              .served-banner {
                text-align: center;
                color: green;
                font-weight: bold;
                font-size: 16px;
                margin: 8px 0;
                padding: 4px;
                border: 2px solid green;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="restaurant-name">${
                orderDetails.order_details.outlet_name
              }</div>
              <div class="restaurant-address">${
                orderDetails.order_details.outlet_address
              }</div>
              ${
                orderDetails.order_details.outlet_mobile
                  ? `<div class="restaurant-phone">Phone: ${orderDetails.order_details.outlet_mobile}</div>`
                  : ""
              }
            </div>
            
            <div class="order-details">
              <span>Order #${order_number}</span>
              <span>${orderDetails.order_details.datetime}</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="order-type">
              ${orderTypeDisplay()}
            </div>
  
            <div class="served-banner">
              *** SERVED ORDER ***
            </div>
            
            <div class="dotted-divider"></div>
            
            ${menuItemsHTML}
            
            <div class="divider"></div>
            
            <div class="totals-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>₹${parseFloat(
                  orderDetails.order_details.total_bill_amount
                ).toFixed(2)}</span>
              </div>
              
              ${
                parseFloat(orderDetails.order_details.discount_amount) > 0
                  ? `<div class="total-row">
                      <span>Discount (${
                        orderDetails.order_details.discount_percent
                      }%):</span>
                      <span>₹${parseFloat(
                        orderDetails.order_details.discount_amount
                      ).toFixed(2)}</span>
                     </div>`
                  : ""
              }
              
              ${
                parseFloat(orderDetails.order_details.service_charges_amount) >
                0
                  ? `<div class="total-row">
                      <span>Service Charge (${
                        orderDetails.order_details.service_charges_percent
                      }%):</span>
                      <span>₹${parseFloat(
                        orderDetails.order_details.service_charges_amount
                      ).toFixed(2)}</span>
                     </div>`
                  : ""
              }
              
              <div class="total-row">
                <span>GST (${orderDetails.order_details.gst_percent}%):</span>
                <span>₹${parseFloat(
                  orderDetails.order_details.gst_amount
                ).toFixed(2)}</span>
              </div>
              
              <div class="divider"></div>
              
              <div class="total-row grand-total">
                <span>Grand Total:</span>
                <span>₹${parseFloat(
                  orderDetails.order_details.grand_total
                ).toFixed(2)}</span>
              </div>
            </div>
            
            <div class="dotted-divider"></div>
            
            <div class="footer">
              <div>Thank you for your business!</div>
              <div>Visit again</div>
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
        // Verify the printer is still connected first
        if (!contextPrinterDevice.isConnected) {
          console.log("Printer disconnected, attempting to reconnect...");
          try {
            await contextConnectToPrinter(contextPrinterDevice);
            console.log("Printer reconnected successfully");
          } catch (reconnectError) {
            console.error("Failed to reconnect to printer:", reconnectError);
            Alert.alert(
              "Printer Connection Lost",
              "Please reconnect to your printer.",
              [
                { text: "Connect Printer", onPress: () => navigation.navigate("PrinterManagement") },
                { text: "Cancel", style: "cancel" },
              ]
            );
            setIsLoading(false);
            setLoadingMessage("");
            return;
          }
        }
        
        const receiptData = await generateReceiptData(orderDetailsToUse);
        
        try {
          // Use the services approach like in CompletedOrderDetails
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

          // Send data in chunks with delays for better stability
          const CHUNK_SIZE = 100;
          for (let i = 0; i < receiptData.length; i += CHUNK_SIZE) {
            const chunk = receiptData.slice(i, i + CHUNK_SIZE);
            await foundCharacteristic.writeWithResponse(
              base64.encode(String.fromCharCode(...chunk))
            );
            
            // Add a longer delay between chunks to prevent buffer overflow and disconnections
            if (i + CHUNK_SIZE < receiptData.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          Alert.alert("Success", "Receipt printed successfully");
        } catch (printError) {
          console.error("Print error:", printError);
          Alert.alert("Error", "Failed to print receipt. Please try again.");
        }
      } else {
        const html = await generateReceiptHTML();
        const { uri } = await Print.printToFileAsync({
          html: html,
          base64: false,
        });
        await Print.printAsync({ uri: uri });
      }
    } catch (error) {
      console.error("Receipt generation error:", error);
      Alert.alert("Error", "Failed to prepare receipt. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
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

      // Add generateQRCode function - exact same as PlacedOrderDetails
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

      // Function for dotted line - match PlacedOrderDetails
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

      // Generate QR code data with safe values - use final_grand_total if available
      const qrData = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
        orderDetailsToUse.order_details.outlet_name
      )}&am=${finalGrandTotal ? finalGrandTotal.toFixed(2) : grandTotal.toFixed(2)}`;

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

        // Order details - left aligned
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

        // Column headers - aligned with data columns
        ...textToBytes("Item           Qty  Rate     Amt\n"),
        ...textToBytes(getDottedLine()),

        // Menu items
        ...orderDetailsToUse.menu_details.flatMap((item) =>
          textToBytes(formatMenuItem(item))
        ),
        ...textToBytes(getDottedLine()),

        // Amount section using the exact sequence from the example
        ...textToBytes(formatAmountLine("Total", subtotal)),

        // Update discount with the improved condition
        ...(Math.abs(discount) > 0.001 ? 
          textToBytes(formatAmountLine(`Discount(${discountPercent}%)`, discount, "-")) 
          : []),

        // Update special discount with the improved condition
        ...(Math.abs(specialDiscount) > 0.001 ? 
          textToBytes(formatAmountLine("Special Discount", specialDiscount, "-"))
          : []),

        // Update extra charges with the improved condition
        ...(Math.abs(extraCharges) > 0.001 ? 
          textToBytes(formatAmountLine("Extra Charges", extraCharges, "+"))
          : []),

        ...textToBytes(formatAmountLine("Subtotal", totalWithDiscount)),

        // Update service charges with the improved condition
        ...(Math.abs(serviceCharges) > 0.001 ? 
          textToBytes(formatAmountLine(`Service Ch.(${serviceChargesPercent}%)`, serviceCharges, "+"))
          : []),

        // Update GST with the improved condition
        ...(Math.abs(gstAmount) > 0.001 ? 
          textToBytes(formatAmountLine(`GST(${gstPercent}%)`, gstAmount, "+"))
          : []),

        // Update tip with the improved condition
        ...(Math.abs(tip) > 0.001 ? 
          textToBytes(formatAmountLine("Tip", tip, "+"))
          : []),

        ...textToBytes(getDottedLine()),
        // Use final_grand_total if available, otherwise use grand_total
        ...textToBytes(formatAmountLine("Total", finalGrandTotal || grandTotal)),
        ...textToBytes("\n"),
        ...textToBytes(`Scan to Pay ${finalGrandTotal ? finalGrandTotal.toFixed(2) : grandTotal.toFixed(2)}\n`),
        // Footer section with QR code
        ...textToBytes("\x1B\x61\x01"), // Center align
        
        ...generateQRCode(qrData),
        ...textToBytes('\n\n'),
        ...textToBytes("PhonePe  GPay  Paytm  UPI\n\n"),
        ...textToBytes("------------------------\n"),
       
        ...textToBytes("-----Thank You Visit Again!-----"),
        ...textToBytes("https://menumitra.com/\n\n\n"), // Added extra newlines after website
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper
      ];
    } catch (error) {
      console.error("Error generating receipt data:", error);
      throw error;
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
      await contextScanForPrinters();
    } catch (error) {
      console.error("Scanning error:", error);
      Alert.alert("Error", "Failed to scan for printers");
    }
  };

  const handleConnectToDevice = async (device) => {
    try {
      setLoadingMessage("Connecting to printer...");
      setIsLoading(true);
      await contextConnectToPrinter(device);
      setIsModalVisible(false);
      await printReceipt();
    } catch (error) {
      console.error("Connection error:", error);
      Alert.alert("Connection Error", "Failed to connect to printer");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

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
          <Text style={styles.modalTitle}>Select Printer Device</Text>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              setAvailableDevices([]);
              bleManager?.stopDeviceScan();
              scanForPrinters();
              setConnectionStatus("");
            }}
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

  const LoadingOverlay = () =>
    isLoading && (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );

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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 15 }}
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
                menu_details: menu_details
              }
            });
          }}
        >
          <RemixIcon name="edit-2-line" size={24} color="#000" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, orderDetails]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FF9A6C" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!orderDetails) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>Failed to load order details.</Text>
      </View>
    );
  }

  const { order_details, menu_details } = orderDetails;

  const renderHeader = () => {
    if (!orderDetails) return null;
    const { order_details } = orderDetails;

    return (
      <>
        <View style={[styles.headerCard, { backgroundColor: "#009688" }]}>
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


<View style={[styles.tableContainer, {marginTop: order_details.order_type?.toLowerCase() === "dine-in" ? 0 : 8}]}>
 
  
  <View style={styles.menuCountContainer}>
    <RemixIcon name="file-list-2-fill" size={16} color="#009688" />
    <Text style={styles.menuCountLabel}>Menu Count:</Text>
    <Text style={styles.menuCountText}>{menu_details?.length || orderDetails?.order_details?.menu_count || 0}</Text>
  </View>
</View>
        
         
        

        {order_details.comment && (
          <View style={styles.commentContainer}>
            <View style={styles.commentHeader}>
              <RemixIcon name="chat-1-fill" size={18} color="#009688" />
              <Text style={styles.commentLabel}>Order Comment:</Text>
            </View>
            <Text style={styles.commentText}>{order_details.comment}</Text>
          </View>
        )}
      </>
    );
  };

  const renderCustomerDetails = () => {
    if (!orderDetails?.order_details) return null;
    
    const { 
      customer_name, 
      customer_mobile, 
      customer_alternate_mobile, 
      customer_address, 
      customer_landmark,
      user_name,
      user_mobile 
    } = orderDetails.order_details;
    
    // Use user details as fallback
    const name = customer_name || user_name;
    const mobile = customer_mobile || user_mobile;
    
    if (!name && !mobile && !customer_address) return null;
    
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        
        <View style={styles.customerDetailsGrid}>
          {/* First row */}
          <View style={styles.customerGridItem}>
            {name ? (
              <>
                <Text style={styles.customerValue}>{name}</Text>
                <Text style={styles.customerLabel}>Name</Text>
              </>
            ) : null}
          </View>
          
          <View style={styles.customerGridItem}>
            {mobile ? (
              <>
                <Text style={styles.customerValue}>{mobile}</Text>
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

        {/* Customer Details Card */}
        {renderCustomerDetails()}

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
      </View>
    );
  };

  const renderMenuItem = ({ item }) => (
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
       
      </View>
    </View>
  );

  const generateKOTData = () => {
    try {
      const textToBytes = (text) => {
        const encoder = new TextEncoder();
        return Array.from(encoder.encode(text));
      };
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

      const getDottedLine = () => "-------------------------------\n";
      
      // Calculate total quantity of all items
      const totalQuantity = orderDetails?.menu_details?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

      // Get outlet mobile from local storage
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
    if (!contextPrinterDevice || !printerConnected) {
      Alert.alert(
        "Printer Not Connected",
        "Please connect a printer",
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
      
      // Verify the printer is still connected first
      if (!contextPrinterDevice.isConnected) {
        console.log("Printer disconnected before KOT printing, attempting to reconnect...");
        try {
          await contextConnectToPrinter(contextPrinterDevice);
          console.log("Printer reconnected successfully for KOT printing");
        } catch (reconnectError) {
          console.error("Failed to reconnect to printer for KOT:", reconnectError);
          Alert.alert(
            "Printer Connection Lost",
            "Please reconnect to your printer.",
            [
              { text: "Connect Printer", onPress: () => navigation.navigate("PrinterManagement") },
              { text: "Cancel", style: "cancel" },
            ]
          );
          setIsLoading(false);
          setLoadingMessage("");
          return;
        }
      }

      const kotData = generateKOTData();
      
      try {
        // Use the same services approach as in printReceipt
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
        const CHUNK_SIZE = 100;
        for (let i = 0; i < kotData.length; i += CHUNK_SIZE) {
          const chunk = kotData.slice(i, i + CHUNK_SIZE);
          await foundCharacteristic.writeWithResponse(
            base64.encode(String.fromCharCode(...chunk))
          );
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        Alert.alert("Success", "KOT printed successfully");
      } catch (printError) {
        console.error("KOT print error:", printError);
        Alert.alert("Error", "Failed to print KOT. Please try again.");
      }
    } catch (error) {
      console.error("KOT generation error:", error);
      Alert.alert("Error", "Failed to prepare KOT data. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
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

  const handleDeviceSelection = async (device) => {
    try {
      setConnectionStatus("Connecting...");
      bleManager?.stopDeviceScan();
      setIsScanning(false);

      await contextConnectToPrinter(device);

      if (printerConnected && contextPrinterDevice) {
        setConnectionStatus("Connected successfully!");
        setPrinterDevice(contextPrinterDevice);
        setIsConnected(true);

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

      setTimeout(() => {
        scanForPrinters();
      }, 1000);
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
            onPress: () => {
              // Always show the modal, even for paid or complementary orders
              setSelectedPaymentMethod('CASH'); // Set CASH as default
              setIsPaymentModalVisible(true);
            } 
          },
          { 
            text: "Cancel", 
            style: "cancel" 
          },
        ]
      );
    } else {
      // Always show the modal, even for paid or complementary orders
      setSelectedPaymentMethod('CASH'); // Set CASH as default
      setIsPaymentModalVisible(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#009688" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={menu_details || []}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderMenuItem}
            ListHeaderComponent={() => (
              <>
                {renderHeader()}
               
              </>
            )}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
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
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
  },
  firstRow: {
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
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
    textAlign: "right",
  },
  menuTable: {
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#f8f9fa",
    borderRadius: 5,
    padding: 12,
    marginVertical: 5,
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  menuName: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
    paddingRight: 8,
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  menuDetailsTextPrice: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#4d80ff",
    textAlign: "left",
    flex: 1,
  },
  menuDetailsTextOffer: {
    fontSize: 13,
    color: "#28a745",
    flex: 1,
    textAlign: "center",
  },
  menuDetailsTextQuantity: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#000",
    flex: 1,
    textAlign: "center",
  },
  menuDetailsTextTotal: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#4d80ff",
    flex: 1,
    textAlign: "right",
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
    color: '#e53935', // Red color for negative amounts (discounts)
  },
  positiveAmount: {
    color: '#4caf50', // Green color for positive amounts (charges)
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
  markAsPaidButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    margin: 16,
    marginTop: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  markAsPaidButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: "#6c757d",
    opacity: 0.8,
  },
  listContent: {
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  deviceList: {
    maxHeight: 300,
  },
  deviceItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginHorizontal: 4,
  },
  refreshButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  scanningContainer: {
    marginVertical: 10,
    paddingHorizontal: 15,
  },
  scanningText: {
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  closeButton: {
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#666",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  successText: {
    backgroundColor: "#dff6dd",
    color: "#2563EB",
  },
  errorText: {
    backgroundColor: "#fef2f2",
    color: "#DC2626",
  },
  infoCard: {
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 12,
    margin: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  infoLabel: {
    fontSize: 16,
    textAlign: "left",
    flex: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
    flex: 1,
    paddingLeft: 8,
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
    backgroundColor: '#009688',
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
    color: '#009688',
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
  tableText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  menuCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)', // Green background for served orders
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  menuCountLabel: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  menuCountText: {
    marginLeft: 4,
    fontWeight: 'bold',
    color: '#4CAF50', // Green color for served orders
    fontSize: 14,
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
  menuQuantity: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#009688',
    backgroundColor: 'rgba(0, 150, 136, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
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
  paymentModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 8,
    padding: 20,
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'left',
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 15,
    textAlign: 'left',
  },
  paymentOptionsContainer: {
    marginBottom: 20,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  paymentOption: {
    marginRight: 15,
  },
  radioButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#0dcaf0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioButtonSelected: {
    borderColor: '#0dcaf0',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0dcaf0',
  },
  paymentOptionText: {
    fontSize: 14,
    color: '#333',
  },
  paidCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  checkboxChecked: {
    backgroundColor: '#0dcaf0',
    borderColor: '#0dcaf0',
  },
  paidText: {
    fontSize: 14,
    color: '#333',
  },
  settleButton: {
    backgroundColor: '#0dcaf0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  settleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  closeModalButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 1,
  },
  settleButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  printButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginLeft: 8,
  },
  customerDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  customerGridItem: {
    width: '50%',
    marginBottom: 10,
  },
  customerValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  customerLabel: {
    fontSize: 13,
    color: '#666',
  },
});

export default ServedOrderDetails;