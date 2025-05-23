import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import CustomHeader from "../../components/CustomHeader";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import CustomTabBar from "../CustomTabBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BleManager } from "react-native-ble-plx";
import base64 from "react-native-base64";
import Constants from "expo-constants";
import * as Print from "expo-print";
import WebService from "../utils/WebService";
import * as Sharing from "expo-sharing";
import { usePrinter } from "../../contexts/PrinterContext";
import axiosInstance from "../../utils/axiosConfig";
import RemixIcon from "react-native-remix-icon";

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

const CancelledOrderDetails = ({ route }) => {
  const navigation = useNavigation();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const { orderDetail } = route.params;
  const { order_number, outlet_id = orderDetail.outlet_id, order_id = orderDetail.order_id } = orderDetail;
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [printerDevice, setPrinterDevice] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [bleManager] = useState(() => {
    if (!Constants.appOwnership || Constants.appOwnership !== "expo") {
      return new BleManager();
    }
    return null;
  });

  // Printer context
  const {
    isConnected: printerConnected,
    printerDevice: contextPrinterDevice,
   
    isScanning,
    setIsScanning,
    availableDevices,
    setAvailableDevices,
  } = usePrinter();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Add these new state variables after the existing state declarations
  const [timelineData, setTimelineData] = useState([]);
  const [isTimelineModalVisible, setIsTimelineModalVisible] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);

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
  }, [order_number]);

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

 

  const printReceipt = async () => {
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

        const receiptData = await generateReceiptData();
        const CHUNK_SIZE = 100;
        for (let i = 0; i < receiptData.length; i += CHUNK_SIZE) {
          const chunk = receiptData.slice(i, i + CHUNK_SIZE);
          await foundCharacteristic.writeWithResponse(
            base64.encode(String.fromCharCode(...chunk))
          );
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        Alert.alert("Success", "Receipt printed successfully");
      } else {
        const html = await generateReceiptHTML();
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

  const textToBytes = (text) => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(text));
  };

  const generateReceiptData = async () => {
    try {

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
       
        // Payment details - usually not relevant for cancelled orders
        is_paid: isPaid,
        payment_method: paymentMethod
      } = orderDetails.order_details;

      const websiteUrl = (await AsyncStorage.getItem("website_url")) || "menumitra.com";

      // Function for dotted line - match OrderCreate
      const getDottedLine = () => "--------------------------------\n";

      const formatAmountLine = (label, amount, symbol = "") => {
        const amountStr = Math.abs(amount).toFixed(2);
        const totalWidth = 32; // Total width of the receipt
        const amountWidth = 12; // Width for amounts

        const padding = Math.max(2, totalWidth - label.length - amountWidth);
        const amountWithSymbol = `${symbol}${amountStr}`;
        const amountPadded = amountWithSymbol.padStart(amountWidth);

        return `${label}${" ".repeat(padding)}${amountPadded}\n`;
      };

      // Format menu items like OrderCreate
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

      return [
        // Header section - centered
        ...textToBytes("\x1B\x61\x01"), // Center align
        
        // Display CANCELLED at the top - special for cancelled orders
        ...textToBytes("\x1B\x21\x10"), // Double width, double height
        ...textToBytes("CANCELLED\n"),
        ...textToBytes("\x1B\x21\x00"), // Reset text size
        
        // Check if the order was also complementary and display it
        ...(isPaid === "complementary" || isComplementary === 1 || isComplementary === true || isComplementary === "1" || 
            orderDetails.order_details.is_paid === "complementary" || 
            paymentMethod === "COMPLEMENTARY" ? [
          ...textToBytes("\x1B\x21\x10"), // Double width, double height
          ...textToBytes("COMPLEMENTARY\n"),
          ...textToBytes("\x1B\x21\x00") // Reset text size
        ] : []),
        
        ...textToBytes("\x1B\x21\x08"), // Double height
        ...textToBytes(`${orderDetails.order_details.outlet_name}\n`),
        ...textToBytes("\x1B\x21\x00"), // Normal height
        ...textToBytes(`${orderDetails.order_details.outlet_address}\n`),
        ...textToBytes(
          `${
            orderDetails.order_details.outlet_mobile
              ? `${orderDetails.order_details.outlet_mobile}\n`
              : ""
          }`
        ),

        // Order details - left aligned
        ...textToBytes("\x1B\x61\x00"), // Left align
        ...textToBytes(`Bill No: ${order_number}\n`),
        ...textToBytes(
          orderDetails.order_details.order_type === "dine-in"
            ? `Table: ${orderDetails.order_details.section} - ${orderDetails.order_details.table_number}\n`
            : `Type: ${
                orderDetails.order_details.order_type.charAt(0).toUpperCase() +
                orderDetails.order_details.order_type.slice(1)
              }\n`
        ),
        ...textToBytes(`DateTime: ${getCurrentDateTime()}\n`),
        
        // Add customer details if available
        ...(customerName ? [textToBytes(`Name: ${customerName}\n`)] : []),
        

        ...textToBytes(getDottedLine()),
        
        // Column headers - aligned with data columns
        ...textToBytes("Item           Qty  Rate     Amt\n"),
        ...textToBytes(getDottedLine()),

        // Menu items
        ...orderDetails.menu_details.flatMap((item) =>
          textToBytes(formatMenuItem(item))
        ),
        ...textToBytes(getDottedLine()),

        // Amount section using the exact sequence from the example
        ...textToBytes(formatAmountLine("Total", subtotal)),

        // Update discount with the improved condition - this was missing before
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

        // Special footer for cancelled orders - centered, without QR and payment options
        ...textToBytes("\x1B\x61\x01"), // Center align
        ...textToBytes(`${websiteUrl}\n\n`),
        ...textToBytes("Sorry for inconvenience\n"),
        ...textToBytes("---CANCELLED ORDER---\n"),
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper
      ];
    } catch (error) {
      console.error("Error generating receipt data:", error);
      throw error;
    }
  };

  const generateReceiptHTML = async () => {
    try {
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
              <h2>${orderDetails.order_details.outlet_name}</h2>
              <p>${orderDetails.order_details.outlet_address}</p>
              <p>${orderDetails.order_details.outlet_mobile}</p>
            </div>
            <div class="order-info">
              <p>Order: #${order_number}</p>
              <p>${
                orderDetails.order_details.order_type === "dine-in"
                  ? `Table: ${orderDetails.order_details.section}-${orderDetails.order_details.table_number}`
                  : `Type: ${orderDetails.order_details.order_type}`
              }</p>
              <p>DateTime: ${orderDetails.order_details.datetime}</p>
              <p>Status: CANCELLED</p>
            </div>
            <div class="dotted-line"></div>
            <div class="items">
              ${orderDetails.menu_details
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
                orderDetails.order_details.total_bill_amount
              )}</p>
              <p>Discount (${orderDetails.order_details.discount_percent}%): 
                 ${formatCurrency(
                   orderDetails.order_details.discount_amount
                 )}</p>
              <p>Service Charges (${
                orderDetails.order_details.service_charges_percent
              }%): 
                 ${formatCurrency(
                   orderDetails.order_details.service_charges_amount
                 )}</p>
              <p>GST (${orderDetails.order_details.gst_percent}%): 
                 ${formatCurrency(orderDetails.order_details.gst_amount)}</p>
              <p><strong>Grand Total: ${formatCurrency(
                orderDetails.order_details.grand_total
              )}</strong></p>
            </div>
            <div class="footer">
              <p><strong>*** CANCELLED ORDER ***</strong></p>
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

  const handleDeviceSelection = async (device) => {
    try {
      setConnectionStatus("Connecting...");
      bleManager?.stopDeviceScan();
      setIsScanning(false);

      await contextConnectPrinter(device);

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
  };

  const LoadingOverlay = () =>
    isLoading && (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5252" />
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

  const { order_details, menu_details } = orderDetails;

  // Add function to fetch timeline data
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

  // Update the renderHeader function to add the timeline button
  const renderHeader = () => {
    if (!orderDetails?.order_details) return null;
    const { order_details } = orderDetails;

    return (
      <View>
        <View
          style={[styles.row, styles.firstRow, { backgroundColor: "#FF5252" }]}
        >
          <RemixIcon name="ri-close-circle-fill" size={30} color="#fff" />
          <View style={styles.column}>
            <Text style={styles.orderStatus}>
              Status: {order_details.order_status}
            </Text>
            <Text style={styles.orderTime}>{order_details.datetime}</Text>
          </View>
          
          {/* Add timeline button */}
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

        <View style={styles.row}>
          {orderDetails?.order_details?.order_type === "dine-in" ? (
            <Text style={styles.detailText}>
              Table Number: {Array.isArray(orderDetails?.order_details?.table_number) 
                ? orderDetails?.order_details?.table_number.join(", ") || "N/A"
                : orderDetails?.order_details?.table_number || "N/A"}
            </Text>
          ) : (
            <Text style={styles.detailText}>
              Type: {(orderDetails?.order_details?.order_type || "")
                .split("-")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")}
            </Text>
          )}
          <Text style={styles.detailText}>
            Menu Count: {orderDetails?.menu_details?.length || orderDetails?.order_details?.menu_count || 0}
          </Text>
        </View>
      </View>
    );
  };

  const renderMenuItem = ({ item }) => (
    <View style={styles.menuTable}>
      <Text style={styles.menuName} numberOfLines={2}>
        {item.menu_name}
        {item.half_or_full && (
          <Text style={styles.halfFullText}> ({item.half_or_full})</Text>
        )}
      </Text>
      {item.comment && (
        <Text style={styles.menuComment}>{item.comment}</Text>
      )}
      <View style={styles.menuRow}>
        <Text style={styles.menuDetailsTextPrice}>
          ₹{Number(item.price).toFixed(2)}
        </Text>
        {Number(item.offer) > 0 && (
          <Text style={styles.menuDetailsTextOffer}>{item.offer}% Off</Text>
        )}
        <Text
          style={[
            styles.menuDetailsTextQuantity,
            Number(item.offer) === 0 && { flex: 2 },
          ]}
        >
          x{item.quantity}
        </Text>
        <Text style={styles.menuDetailsTextTotal}>
          ₹{Number(item.menu_sub_total).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!orderDetails?.order_details) return null;
    const order_details = orderDetails.order_details;
    
    return (
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
    );
  };

  // Add Timeline Modal component
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

  return (
    <>
      <SafeAreaView style={styles.container}>
        <CustomHeader
          title="Cancelled Order Details"
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.mainContainer}>
          <FlatList
            data={menu_details}
            keyExtractor={(item, index) => index.toString()}
            ListHeaderComponent={renderHeader}
            renderItem={renderMenuItem}
            ListFooterComponent={
              <>
                {renderFooter()}
                <TouchableOpacity
                  style={styles.printButton}
                  onPress={
                    printerConnected
                      ? printReceipt
                      : () => navigation.navigate("PrinterManagement")
                  }
                >
                  <Text style={styles.printButtonText}>
                    {printerConnected ? "Print Receipt" : "Connect Printer"}
                  </Text>
                </TouchableOpacity>
              </>
            }
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#FF5252"]}
                tintColor="#FF5252"
              />
            }
          />
        </View>
      </SafeAreaView>
      <DeviceSelectionModal />
      <LoadingOverlay />
      <TimelineModal />
      <CustomTabBar />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingBottom: 80,
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
    color: "#FF5252",
    fontWeight: "bold",
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  listContent: {
    padding: 16,
    paddingBottom: 16,
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
    marginBottom: 8,
  },
  column: {
    flex: 1,
    marginLeft: 12,
  },
  orderStatus: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  orderTime: {
    fontSize: 14,
    color: "#fff",
  },
  orderId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "right",
  },
  orderIdText: {
    fontSize: 14,
    color: "#fff",
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
    fontWeight: "bold",
    fontSize: 16,
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
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
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
  detailText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginHorizontal: 4,
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
  deviceItemDisabled: {
    opacity: 0.5,
  },
  
  // Timeline button styles
  timelineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  timelineButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  
  // Timeline modal styles
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
    backgroundColor: '#FF5252',
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
    color: '#FF5252',
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  scrollViewContent: {
    paddingBottom: 80,
  },
});

export default CancelledOrderDetails;
