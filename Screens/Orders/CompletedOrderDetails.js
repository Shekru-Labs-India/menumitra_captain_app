import React, { useEffect, useState, useMemo, useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Button,
  Linking,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  Platform,
  PermissionsAndroid,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import axios from "axios";
import RemixIcon from "react-native-remix-icon";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import CustomTabBar from "../CustomTabBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BleManager } from "react-native-ble-plx";
import base64 from "react-native-base64";
import Constants from "expo-constants";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useFocusEffect } from "@react-navigation/native";
import { usePrinter } from "../../contexts/PrinterContext";
import axiosInstance from "../../utils/axiosConfig";
import { useNavigation } from "@react-navigation/native";
import * as FileSystem from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { Asset } from 'expo-asset';

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

const getImageBase64 = async (imagePath) => {
  try {
    // Load the asset
    const asset = Asset.fromModule(require('../../assets/icon.png')); // Adjust path as needed
    await asset.downloadAsync();

    // Read the file and convert to base64
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
};

const CompletedOrderDetails = ({ route }) => {
  const navigation = useNavigation();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isConnecting, setIsConnecting] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [printerDevice, setPrinterDevice] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [timelineData, setTimelineData] = useState([]);
  const [isTimelineModalVisible, setIsTimelineModalVisible] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const { orderDetail } = route.params;
  const { order_number, outlet_id = orderDetail.outlet_id, order_id = orderDetail.order_id } = orderDetail;

  const {
    isConnected: printerConnected,
    printerDevice: contextPrinterDevice,
    connectToPrinter: contextConnectToPrinter,
    scanForPrinters: contextScanForPrinters,
    sendDataToPrinter,
    bleManager
  } = usePrinter();

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
  }, [isModalVisible]);

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
  }, [order_number]);

  const toggleSwitch = () => {
    const newStatus = isCompleted ? "ongoing" : "completed"; // Toggle between "ongoing" and "completed"
    console.log("ORDER STATUS--" + newStatus);
    setIsCompleted(!isCompleted);
    updateOrderStatus(newStatus); // Call API with the new status
  };
  const updateOrderStatus = async (status) => {
    try {
      console.log("ORDER_NUMBER--" + orderDetails.order_details.order_id);
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axios.post(
        onGetProductionUrl() + "update_order_status",
        {
          order_id: orderDetails.order_details.order_id,
          outlet_id: restaurantId,
          user_id: userId,
          order_status: status,
          payment_method: orderDetails.order_details.payment_method || "",
          is_paid: orderDetails.order_details.is_paid || "1",
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
        Alert.alert("Success", `Order status updated to ${status}`);
      } else {
        Alert.alert("Error", "Failed to update order status");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An error occurred while updating order status");
    }
  };

  // Add loading check before destructuring
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#BEE5CB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!orderDetails) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Failed to load order details.</Text>
      </View>
    );
  }

  // Safe to destructure after checks
  const { order_details, menu_details, invoice_url } = orderDetails;

  const renderHeader = () => (
    <View>
      <View
        style={[styles.row, styles.firstRow, { backgroundColor: "#BEE5CB" }]}
      >
        <RemixIcon name="ri-checkbox-line" size={30} color="#16803BFF" />
        <View style={styles.column}>
          <Text style={styles.orderStatus}>
            Status: {order_details?.order_status || 'N/A'}
          </Text>
          <Text style={styles.orderTime}>{order_details?.datetime || 'N/A'}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.timelineButton}
          onPress={fetchOrderTimeline}
          disabled={timelineLoading}
        >
          <RemixIcon name="time-line" size={14} color="#16803BFF" />
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
          Menu Count: {menu_details?.length || orderDetails?.order_details?.menu_count || 0}
        </Text>
      </View>
    </View>
  );

  const generateInvoiceHTML = async (orderDetails) => {
    // Get the current date and time formatted nicely
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

    // Use the current date/time instead of the order's original datetime
    const currentDateTime = getCurrentDateTime();
    
    const { order_details, menu_details } = orderDetails;
    
    // Get logo base64
    const logoBase64 = await getImageBase64();

    // Helper function to check if a number is zero
    const isZero = (num) => Number(num || 0) === 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice</title>
        <style>
          @page {
            margin: 15mm;
            size: A4;
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            color: #333;
            line-height: 1.5;
            font-size: 14px;
            max-width: 900px;
            margin: 0 auto;
          }
          .header { 
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 25px;
          }
          .logo-section {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .logo-text {
            font-size: 24px;
            font-weight: bold;
            margin-left: 0;
          }
          .invoice-label {
            color: #dc3545;
            font-size: 18px;
            font-weight: 500;
          }
          .header-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 15px 0;
          }
          .customer-info {
            flex: 1;
          }
          .bill-info {
            text-align: right;
            font-size: 15px;
            line-height: 1.6;
          }
          .bill-info strong {
            font-weight: 700;
          }
          .greeting {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
          }
          .items-section {
            margin: 25px 0;
          }
          .items-header {
            display: grid;
            grid-template-columns: 1fr 100px 120px;
            padding: 10px 4px;
            color: #444;
            font-weight: 700;
            font-size: 15px;
            border-bottom: 2px solid #dee2e6;
          }
          .items-header span:nth-child(2) {
            text-align: center;
          }
          .items-header span:nth-child(3) {
            text-align: right;
          }
          .menu-items {
            margin: 15px 0;
          }
          .menu-item {
            display: grid;
            grid-template-columns: 1fr 100px 120px;
            padding: 8px 4px;
            color: #444;
            font-size: 14px;
          }
          .menu-item span:nth-child(2) {
            text-align: center;
          }
          .menu-item span:nth-child(3) {
            text-align: right;
          }
          .amount-details {
            width: 100%;
            margin-top: 15px;
            border-top: 1px solid #dee2e6;
            padding-top: 15px;
          }
          .amount-row {
            display: flex;
            justify-content: flex-end;
            margin: 3px 0;
            font-size: 14px;
            align-items: center;
          }
          .amount-label {
            margin-right: 8px;
            color: #444;
            font-weight: 700;
            min-width: 160px;
          }
          .amount-value {
            width: 90px;
            text-align: right;
            font-weight: 500;
          }
          .discount-value {
            color: #dc3545 !important;
            font-weight: 600;
          }
          .charges-value {
            color: #28a745 !important;
            font-weight: 600;
          }
          .subtotal {
            margin: 8px 0;
            padding-top: 8px;
            border-top: 1px dashed #dee2e6;
          }
          .subtotal .amount-label {
            font-weight: 700;
          }
          .grand-total {
            font-size: 16px;
          }
          .grand-total .amount-label,
          .grand-total .amount-value {
            font-weight: 800;
          }
          .divider {
            border-top: 2px solid #dee2e6;
            margin: 10px 0;
          }
          .billing-info {
            margin-top: 25px;
            font-size: 14px;
            line-height: 1.6;
          }
          .payment-section {
            display: flex;
            justify-content: flex-end;
            margin: 15px 0 25px 0;
            gap: 8px;
            font-size: 14px;
            border-top: none;
            padding-top: 0;
          }
          .payment-label {
            font-weight: 700;
          }
          .footer {
            margin-top: 35px;
            text-align: center;
            font-style: italic;
            color: #666;
            font-size: 13px;
            line-height: 1.6;
          }
          .menu-item span:first-child {
            color: #dc3545; /* Red color for menu names */
            font-weight: 500;
          }
          .logo-image {
            width: 50px;
            height: 50px;
            object-fit: contain;
          }
          .footer-logo-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            margin-top: 15px;
          }
          .footer-logo-image {
            width: 40px;
            height: 40px;
            object-fit: contain;
          }
          .footer-logo-text {
            font-size: 20px;
            font-weight: bold;
            font-style: normal;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <img src="${logoBase64}" alt="MenuMitra Logo" class="logo-image" />
            <span class="logo-text">MenuMitra</span>
          </div>
          <div class="invoice-label">Invoice</div>
        </div>

        <div class="header-info">
          <div class="customer-info">
            <div class="greeting">
              <strong>Hello, ${order_details.customer_name || ''}</strong><br>
              Thank you for shopping from our store and for your order.
            </div>
          </div>
          <div class="bill-info">
            <strong>Bill No:</strong> ${order_details.order_number}<br>
            <strong>Date:</strong> ${currentDateTime}<br>
            
          </div>
        </div>

        <div class="items-section">
          <div class="items-header">
            <span>Item</span>
            <span>Quantity</span>
            <span>Price</span>
          </div>
          <div class="menu-items">
            ${menu_details.map(item => `
              <div class="menu-item">
                <span>${item.menu_name}${item.half_or_full ? ` (${item.half_or_full})` : ''}</span>
                <span>${item.quantity}</span>
                <span>₹ ${Number(item.price).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="amount-details">
          <div class="amount-row">
            <span class="amount-label">Total:</span>
            <span class="amount-value">₹${Number(order_details.total_bill_amount).toFixed(2)}</span>
          </div>

          ${!isZero(order_details.discount_amount) ? `
            <div class="amount-row">
              <span class="amount-label">Discount (${order_details.discount_percent}%):</span>
              <span class="amount-value discount-value">-₹${Number(order_details.discount_amount).toFixed(2)}</span>
            </div>
          ` : ''}

          ${!isZero(order_details.special_discount) ? `
            <div class="amount-row">
              <span class="amount-label">Special Discount:</span>
              <span class="amount-value discount-value">-₹${Number(order_details.special_discount).toFixed(2)}</span>
            </div>
          ` : ''}

          ${!isZero(order_details.charges) ? `
            <div class="amount-row">
              <span class="amount-label">Extra Charges:</span>
              <span class="amount-value charges-value">+₹${Number(order_details.charges).toFixed(2)}</span>
            </div>
          ` : ''}

          <div class="amount-row subtotal">
            <span class="amount-label">Subtotal:</span>
            <span class="amount-value">₹${Number(order_details.total_bill_with_discount).toFixed(2)}</span>
          </div>

          ${!isZero(order_details.service_charges_percent) ? `
            <div class="amount-row">
              <span class="amount-label">Service Charges (${order_details.service_charges_percent}%):</span>
              <span class="amount-value charges-value">+₹${Number(order_details.service_charges_amount).toFixed(2)}</span>
            </div>
          ` : ''}

          ${!isZero(order_details.gst_percent) ? `
            <div class="amount-row">
              <span class="amount-label">GST (${order_details.gst_percent}%):</span>
              <span class="amount-value charges-value">+₹${Number(order_details.gst_amount).toFixed(2)}</span>
            </div>
          ` : ''}

          ${!isZero(order_details.tip) ? `
            <div class="amount-row">
              <span class="amount-label">Tip:</span>
              <span class="amount-value charges-value">+₹${Number(order_details.tip).toFixed(2)}</span>
            </div>
          ` : ''}

          <div class="divider"></div>
          <div class="amount-row grand-total">
            <span class="amount-label">Grand Total:</span>
            <span class="amount-value">₹${Number(order_details.final_grand_total).toFixed(2)}</span>
          </div>
        </div>

        <div class="payment-section">
          <span class="payment-label">Payment Method:</span>
          <span>${order_details.payment_method || 'Cash'}</span>
        </div>

        

        <div class="footer">
          Have a nice day.<br>
          <div class="footer-logo-section">
            <img src="${logoBase64}" alt="MenuMitra Logo" class="footer-logo-image" />
            <span class="footer-logo-text">MenuMitra</span>
          </div>
          info@menumitra.com<br>
          +91 9172530151<br>
          www.menumitra.com
          
        </div>
      </body>
      </html>
    `;
  };

  const handleInvoiceGeneration = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage("Generating invoice...");

      // Generate the HTML
      const html = await generateInvoiceHTML(orderDetails);
      
      // Generate PDF file
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      // Get download directory based on platform
      const downloadDir = Platform.OS === 'android' 
        ? FileSystem.documentDirectory 
        : FileSystem.documentDirectory;

      // Create filename with timestamp
      const timestamp = new Date().getTime();
      const fileName = `invoice_${order_number}_${timestamp}.pdf`;
      const newFileUri = `${downloadDir}${fileName}`;

      try {
        // Copy file to downloads
        await FileSystem.copyAsync({
          from: uri,
          to: newFileUri
        });

        // For Android, make file visible in downloads
        if (Platform.OS === 'android') {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          
          if (permissions.granted) {
            const base64 = await FileSystem.readAsStringAsync(newFileUri, { 
              encoding: FileSystem.EncodingType.Base64 
            });
            
            await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              'application/pdf'
            ).then(async (uri) => {
              await FileSystem.writeAsStringAsync(uri, base64, { 
                encoding: FileSystem.EncodingType.Base64 
              });
            });
          }
        }

        // Show success message
        Alert.alert('Success', 'Invoice downloaded successfully');

      } catch (error) {
        console.error('Error saving file:', error);
        // Fallback to browser download
        await Linking.openURL(uri);
      }

    } catch (error) {
      console.error('Error generating invoice:', error);
      Alert.alert('Error', 'Failed to generate invoice. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // Add customer details card renderer
  const renderCustomerDetails = () => {
    if (!orderDetails?.order_details) return null;
    const { customer_name, customer_mobile, customer_alternate_mobile, customer_address, customer_landmark } = orderDetails.order_details;
    if (!customer_name && !customer_mobile && !customer_address) return null;
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        {customer_name ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name:</Text>
            <Text style={styles.detailText}>{customer_name}</Text>
          </View>
        ) : null}
        {customer_mobile ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mobile:</Text>
            <Text style={styles.detailText}>{customer_mobile}</Text>
          </View>
        ) : null}
        {customer_alternate_mobile ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Alt. Mobile:</Text>
            <Text style={styles.detailText}>{customer_alternate_mobile}</Text>
          </View>
        ) : null}
        {customer_address ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address:</Text>
            <Text style={styles.detailText}>{customer_address}</Text>
          </View>
        ) : null}
        {customer_landmark ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Landmark:</Text>
            <Text style={styles.detailText}>{customer_landmark}</Text>
          </View>
        ) : null}
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
        <Pressable
          style={styles.invoiceButton}
          onPress={handleInvoiceGeneration}
        >
          <RemixIcon name="ri-download-2-line" size={20} color="#4d80ff" />
          <Text style={styles.buttonText}> Download Invoice</Text>
        </Pressable>
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
        
        // Payment details
        is_paid: isPaid,
        payment_method: paymentMethod,
        is_complementary: isComplementary
      } = orderDetails.order_details;

      const upiId = (await AsyncStorage.getItem("upi_id")) || "merchant@upi";
      const websiteUrl =
        (await AsyncStorage.getItem("website_url")) || "menumitra.com";

      // Add generateQRCode function - exact same as OnGoingOrderDetails
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

      // Generate QR code data with final_grand_total if available
      const qrData = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
        orderDetails.order_details.outlet_name
      )}&am=${finalGrandTotal ? finalGrandTotal.toFixed(2) : grandTotal.toFixed(2)}`;

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
        orderDetails.order_details.is_paid === "complementary" || 
        paymentMethod === "COMPLEMENTARY" ? [
          ...textToBytes("\x1B\x21\x10"), // Double width, double height
          ...textToBytes("COMPLEMENTARY\n"),
          ...textToBytes("\x1B\x21\x00") // Reset text size
        ] : []),
        
        ...textToBytes("\x1B\x21\x08"), // Double height for outlet name
        
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
        
        // Add customer name if available (but not mobile/address)
        ...(customerName ? textToBytes(`Customer: ${customerName}\n`) : []),
        
        // Display payment method if paid and method exists
        ...((isPaid === 1 || isPaid === "paid" || isPaid === true) && paymentMethod ? 
          textToBytes(`Payment: ${paymentMethod.toString().toUpperCase()}\n`) : 
          []),
        
        ...textToBytes(getDottedLine()),
        
        // Column headers
        ...textToBytes("Item           Qty  Rate     Amt\n"),
        ...textToBytes(getDottedLine()),
        
        // Menu items with proper formatting
        ...orderDetails.menu_details.flatMap((item) =>
          textToBytes(formatMenuItem(item))
        ),
        ...textToBytes(getDottedLine()),
        
        // Amount section in correct sequence
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
        
        ...textToBytes("\x1B\x61\x01"), // Center align
        ...textToBytes("PhonePe  GPay  Paytm  UPI\n\n"),
        ...textToBytes("------------------------\n"),
        
        ...generateQRCode(qrData),
        ...textToBytes('\n\n'),
        ...textToBytes(`Scan to Pay ${finalGrandTotal ? finalGrandTotal.toFixed(2) : grandTotal.toFixed(2)}\n\n`),
        ...textToBytes("\n"),
        ...textToBytes("-----Thank You Visit Again!-----"),
        ...textToBytes("https://menumitra.com/\n"), // Fixed missing slash and extra parenthesis
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper
      ];
    } catch (error) {
      console.error("Error generating receipt data:", error);
      throw error;
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
              *** COMPLETED ORDER ***
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

      // Update local orderDetails state with the current payment status before printing
      // This ensures the PAID or COMPLEMENTARY status is correctly shown on the receipt
      const isPaid = orderDetails.order_details.is_paid;
      const paymentMethod = orderDetails.order_details.payment_method;
      const isComplementary = 
        orderDetails.order_details.is_complementary === 1 || 
        orderDetails.order_details.is_complementary === true || 
        orderDetails.order_details.is_complementary === "1" || 
        orderDetails.order_details.is_paid === "complementary" || 
        paymentMethod === "COMPLEMENTARY";
      
      setOrderDetails(prevState => ({
        ...prevState,
        order_details: {
          ...prevState.order_details,
          is_paid: isComplementary ? "complementary" : isPaid,
          payment_method: isComplementary ? "COMPLEMENTARY" : paymentMethod
        }
      }));

      if (!Constants.appOwnership || Constants.appOwnership !== "expo") {
        const receiptData = await generateReceiptData();
        
        try {
          // Use the services approach like in OnGoingOrderDetails
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

  const printKOT = async () => {
    if (!contextPrinterDevice || !printerConnected) {
      Alert.alert(
        "Printer Not Connected",
        "Please connect a printer to print KOT",
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

  const handleScanPrinters = async () => {
    if (printerConnected) {
      printReceipt();
    } else {
      navigation.navigate("PrinterManagement");
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
      visible={isModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setIsModalVisible(false);
        bleManager?.stopDeviceScan();
        setIsScanning(false);
        setConnectionStatus("");
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
      </TouchableWithoutFeedback>
    </Modal>
  );

  const LoadingOverlay = () =>
    isLoading && (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
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

      // Get outlet mobile from order details
      const outletMobile = orderDetails?.order_details?.outlet_mobile || "";

      return [
        ...textToBytes("\x1B\x40"), // Initialize printer
        ...textToBytes("\x1B\x61\x01"), // Center alignment
        ...textToBytes("\x1B\x21\x10"), // Double width, double height
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
        ...(orderDetails?.menu_details?.map(item => {
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
        }) || []).flat(),

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

  const ListFooterComponent = () => (
    <View>
      {renderFooter()}
      <TouchableOpacity
        style={[styles.printButton, { backgroundColor: '#3498db', marginTop: 8 }]}
        onPress={() => {
          if (!printerConnected) {
            Alert.alert(
              "Printer Not Connected",
              "Please connect a printer to print the receipt",
              [
                { text: "Connect Printer", onPress: () => navigation.navigate("PrinterManagement") },
                { text: "Cancel", style: "cancel" },
              ]
            );
          } else {
            printReceipt();
          }
        }}
      >
        <Text style={styles.printButtonText}>
         Print Bill
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.printButton, { backgroundColor: '#000', marginTop: 8, marginBottom: 20 }]}
        onPress={() => {
          if (!printerConnected) {
            Alert.alert(
              "Printer Not Connected",
              "Please connect a printer to print KOT",
              [
                { text: "Connect Printer", onPress: () => navigation.navigate("PrinterManagement") },
                { text: "Cancel", style: "cancel" },
              ]
            );
          } else {
            printKOT();
          }
        }}
      >
        <Text style={styles.printButtonText}>Print KOT</Text>
      </TouchableOpacity>
    </View>
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

  return (
    <SafeAreaView style={styles.mainContainer}>
      <FlatList
        data={menu_details || []}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderMenuItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.flatListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#BEE5CB"]}
            tintColor="#BEE5CB"
          />
        }
      />
      <DeviceSelectionModal />
      <LoadingOverlay />
      <TimelineModal />
      <CustomTabBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    margin: 10,
  },
  flatListContent: {
    paddingBottom: 80, // Add padding at the bottom for CustomTabBar
    flexGrow: 1, // Ensures content can grow and scroll
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 18,
    marginTop: 10,
    marginBottom: 10,
  },
  menuItem: {
    marginBottom: 10,
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
  cardValue: {
    fontSize: 16,
    textAlign: "left",
    flex: 2,
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
  horizontalLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginVertical: 8,
  },
  menuTable: {
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#f8f9fa",
    borderRadius: 5,
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 5,
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
  column: {
    flex: 1,
    paddingHorizontal: 8,
  },
  invoiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#4d80ff",
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 16, // Added bottom margin
    backgroundColor: "#fff",
  },
  buttonText: {
    color: "#4d80ff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  deviceList: {
    maxHeight: 300,
  },
  deviceItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceItemDisabled: {
    opacity: 0.5,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
  },
  refreshButton: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  closeButtonText: {
    textAlign: 'center',
    color: '#333',
  },
  scanningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  scanningText: {
    marginLeft: 10,
    color: '#219ebc',
  },
  statusContainer: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
  },
  connectionStatus: {
    textAlign: 'center',
  },
  successText: {
    color: '#4CAF50',
  },
  connectingText: {
    color: '#2196F3',
  },
  errorText: {
    color: '#f44336',
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  detailSection: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: 'bold',
  },
  timelineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  timelineButtonText: {
    color: '#16803BFF',
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
    backgroundColor: '#4CAF50',
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
    color: '#4CAF50',
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
});

export default CompletedOrderDetails;
