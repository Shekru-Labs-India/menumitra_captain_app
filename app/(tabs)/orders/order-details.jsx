import React, { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  Pressable,
  Image,
  Heading,
  Button,
  IconButton,
  Spinner,
  useToast,
  Badge,
  FlatList,
  Center,
  Icon,
  Divider,
  Modal,
  Alert,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Linking, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl } from "../../../config/api.config";
import * as Print from "expo-print";
import { BleManager } from "react-native-ble-plx";
import Constants from "expo-constants";
import { PermissionsAndroid } from "react-native";
import base64 from "react-native-base64";
import { fetchWithAuth } from "../../../utils/apiInterceptor";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';

const formatTime = (dateTimeString) => {
  if (!dateTimeString) return "";
  const [date, time, ampm] = dateTimeString.split(" ");
  const [hours, minutes] = time.split(":").slice(0, 2); // Only take hours and minutes
  return `${date} • ${hours}:${minutes} ${ampm}`;
};

const calculateOrderTimer = (orderTime) => {
  try {
    if (!orderTime) return 0;

    // Parse the time string (format: "04:33:21 PM")
    const [time, period] = orderTime.split(" ");
    const [hours, minutes, seconds] = time.split(":");

    let hour = parseInt(hours);
    if (period === "PM" && hour !== 12) {
      hour += 12;
    } else if (period === "AM" && hour === 12) {
      hour = 0;
    }

    const orderDate = new Date();
    orderDate.setHours(hour);
    orderDate.setMinutes(parseInt(minutes));
    orderDate.setSeconds(parseInt(seconds));

    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime - orderDate) / 1000);
    return Math.max(0, 90 - elapsedSeconds);
  } catch (error) {
    console.error("Error calculating timer:", error);
    return 0;
  }
};

// Add these constants for printer commands
const PRINTER_SERVICE_UUIDS = [
  "49535343-FE7D-4AE5-8FA9-9FAFD205E455",
  "E7810A71-73AE-499D-8C15-FAA9AEF0C3F2",
  "000018F0-0000-1000-8000-00805F9B34FB",
];

const PRINTER_CHARACTERISTIC_UUIDS = [
  "49535343-8841-43F4-A8D4-ECBE34729BB3",
  "BEF8D6C9-9C21-4C9E-B632-BD58C1009F9F",
];

// Add the generateReceiptHTML function
const generateReceiptHTML = (orderDetails, menuItems) => {
  try {
    const items = menuItems
      .map(
        (item) => `
    <tr>
      <td style="text-align: left;">${item.menu_name}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">₹${item.price}</td>
      <td style="text-align: right;">₹${item.menu_sub_total}</td>
    </tr>
  `
      )
      .join("");

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
        .website {
          text-align: center;
          font-size: 12px;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="restaurant-name">${orderDetails.outlet_name}</div>
        <div class="restaurant-address">${orderDetails.outlet_address}</div>
        ${
          orderDetails.outlet_mobile
            ? `<div class="restaurant-phone">Ph: ${orderDetails.outlet_mobile}</div>`
            : ""
        }
      </div>

      <div class="order-info">
        Order: #${orderDetails.order_number}<br>
        Table: ${orderDetails.section} - ${orderDetails.table_number[0]}<br>
        DateTime: ${orderDetails.datetime}
        ${
          orderDetails.customer_name
            ? `<br>Customer: ${orderDetails.customer_name}`
            : ""
        }
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
          <span>₹${Number(orderDetails.total_bill_amount).toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Discount(${orderDetails.discount_percent}%):</span>
          <span>-₹${Number(orderDetails.discount_amount).toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Service Charges(${
            orderDetails.service_charges_percent
          }%):</span>
          <span>+₹${Number(orderDetails.service_charges_amount).toFixed(
            2
          )}</span>
        </div>
        <div class="total-row">
          <span>GST(${orderDetails.gst_percent}%):</span>
          <span>+₹${Number(orderDetails.gst_amount).toFixed(2)}</span>
        </div>
      </div>

      <div class="dotted-line"></div>

      <div class="total-row" style="font-weight: bold;">
        <span>Total:</span>
        <span>₹${Number(orderDetails.grand_total).toFixed(2)}</span>
      </div>
    </body>
  </html>
  `;
  } catch (error) {
    console.error("Error generating receipt HTML:", error);
    throw error;
  }
};

// First, let's add a helper function to get the payment method
const getPaymentMethod = (orderDetails) => {
  return orderDetails.payment_method || 'Cash'; // Return 'Cash' if payment_method is null
};

// Add this function to load the logo
const getMenuMitraLogo = async () => {
  try {
    // Load the asset
    const asset = Asset.fromModule(require('../../../assets/images/mm-logo.png')); // Adjust path as needed
    await asset.downloadAsync();

    // Read the file and convert to base64
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error loading MenuMitra logo:', error);
    return null;
  }
};

// Modify the generateInvoiceHTML function to be async
const generateInvoiceHTML = async (orderDetails, menuItems) => {
  try {
    // Safely handle date and time formatting
    const dateTime = (orderDetails?.datetime || '').split(' ');
    const date = dateTime[0] || '';
    const time = dateTime.length > 2 ? `${dateTime[1]} ${dateTime[2]}` : '';

    // Get the logo as base64
    const menuMitraLogo = await getMenuMitraLogo();
    const logoPlaceholder = menuMitraLogo || ''; // Use empty string if logo loading fails

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
          }
          .logo-text {
            margin-left: 10px;
            font-size: 24px;
            font-weight: bold;
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
          .greeting {
            margin: 0;
            font-size: 15px;
          }
          .items-section {
            margin: 25px 0;
          }
          .items-header {
            display: grid;
            grid-template-columns: 1fr 100px 120px;
            padding: 10px 4px;
            color: #444;
            font-weight: bold;
            font-size: 15px;
            border-bottom: 2px solid #dee2e6;
          }
          .items-header span:nth-child(2) { text-align: center; }
          .items-header span:nth-child(3) { text-align: right; }
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
          .menu-item span:nth-child(2) { text-align: center; }
          .menu-item span:nth-child(3) { text-align: right; }
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
          }
          .amount-label {
            margin-right: 10px;
            color: #444;
            font-weight: 500;
          }
          .amount-value {
            width: 100px;
            text-align: right;
          }
          .divider {
            border-top: 1px solid #dee2e6;
            margin: 8px 0;
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
            gap: 40px;
            font-size: 14px;
            border-top: none;
            padding-top: 0;
          }
          .payment-label {
            font-weight: 500;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .menu-item-name {
            color: #dc3545;
            font-weight: 500;
          }
          
          .logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
          }
          
          .footer-logo-section {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 10px 0;
          }
          
          .footer-logo {
            width: 30px;
            height: 30px;
            margin-right: 10px;
          }
          
          .bill-label {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            ${logoPlaceholder ? `<img src="${logoPlaceholder}" alt="MenuMitra Logo" class="logo-img"/>` : ''}
            <div class="logo-text">MenuMitra</div>
          </div>
          <div>
            <div class="invoice-label">INVOICE</div>
          </div>
        </div>

        <div class="header-info">
          <div class="customer-info">
            <div class="greeting">
              <strong>Hello</strong>, ${orderDetails.customer_name || ''}<br>
              Thank you for shopping from our store and for your order.
            </div>
          </div>
          <div class="bill-info">
            <span class="bill-label">Bill no:</span> ${orderDetails.order_number || ''}<br>
            ${date}<br>
            ${time}
          </div>
        </div>

        <div class="items-section">
          <div class="items-header">
            <span><strong>Item</strong></span>
            <span><strong>Quantity</strong></span>
            <span><strong>Price</strong></span>
          </div>
          <div class="menu-items">
            ${(Array.isArray(menuItems) ? menuItems : []).map(item => `
              <div class="menu-item">
                <span class="menu-item-name">${item.menu_name || ''}${item.half_or_full ? ` (${item.half_or_full})` : ''}</span>
                <span>${item.quantity || 0}</span>
                <span>₹ ${Number(item.price || 0).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="amount-details">
          <div class="amount-row">
            <span class="amount-label" style="font-weight: 600;">Total:</span>
            <span class="amount-value">₹${Number(orderDetails.total_bill_amount || 0).toFixed(2)}</span>
          </div>

          ${orderDetails.discount_amount > 0 ? `
            <div class="amount-row">
              <span class="amount-label" style="font-weight: 600;">Discount (${orderDetails.discount_percent || 0}%):</span>
              <span class="amount-value" style="color: #dc3545">-₹${Number(orderDetails.discount_amount || 0).toFixed(2)}</span>
            </div>
          ` : ''}

          ${orderDetails.special_discount > 0 ? `
            <div class="amount-row">
              <span class="amount-label" style="font-weight: 600;">Special Discount:</span>
              <span class="amount-value" style="color: #dc3545">-₹${Number(orderDetails.special_discount || 0).toFixed(2)}</span>
            </div>
          ` : ''}

          ${orderDetails.extra_charges > 0 ? `
            <div class="amount-row">
              <span class="amount-label" style="font-weight: 600;">Extra Charges:</span>
              <span class="amount-value" style="color: #28a745">+₹${Number(orderDetails.extra_charges || 0).toFixed(2)}</span>
            </div>
          ` : ''}

          <div class="amount-row">
            <span class="amount-label" style="font-weight: 600;">Subtotal:</span>
            <span class="amount-value">₹${(
              Number(orderDetails.total_bill_amount) - 
              Number(orderDetails.discount_amount || 0) - 
              Number(orderDetails.special_discount || 0) +
              Number(orderDetails.extra_charges || 0)
            ).toFixed(2)}</span>
          </div>

          <div class="amount-row">
            <span class="amount-label" style="font-weight: 600;">Service Charges (${orderDetails.service_charges_percent}%):</span>
            <span class="amount-value" style="color: #28a745">+₹${Number(orderDetails.service_charges_amount).toFixed(2)}</span>
          </div>

          <div class="amount-row">
            <span class="amount-label" style="font-weight: 600;">GST (${orderDetails.gst_percent}%):</span>
            <span class="amount-value" style="color: #28a745">+₹${Number(orderDetails.gst_amount).toFixed(2)}</span>
          </div>

          ${orderDetails.tip > 0 ? `
            <div class="amount-row">
              <span class="amount-label" style="font-weight: 600;">Tip:</span>
              <span class="amount-value" style="color: #28a745">+₹${Number(orderDetails.tip).toFixed(2)}</span>
            </div>
          ` : ''}

          <div class="divider"></div>
          
          <div class="amount-row" style="font-weight: bold; font-size: 16px;">
            <span class="amount-label">Grand Total:</span>
            <span class="amount-value">₹${Number(orderDetails.grand_total).toFixed(2)}</span>
          </div>
        </div>

        <div class="payment-section">
          <span class="payment-label"><strong>Payment Method:</strong></span>
          <span>${getPaymentMethod(orderDetails)}</span>
        </div>

        <div class="billing-info">
          <strong>Billing Information</strong><br>
          <strong>▶</strong> ${orderDetails.outlet_name}<br>
          <strong>▶</strong> ${orderDetails.outlet_address || ''}<br>
          <strong>▶</strong> ${orderDetails.outlet_mobile || ''}
        </div>

        <div class="footer">
          Have a nice day.<br>
          <div class="footer-logo-section">
            ${logoPlaceholder ? `
              <img src="${logoPlaceholder}" alt="MenuMitra Logo" class="footer-logo"/>
              <span class="logo-text">MenuMitra</span>
            ` : ''}
          </div>
          info@menumitra.com<br>
          +91 9172530151
        </div>
      </body>
      </html>
    `;
  } catch (error) {
    console.error('Error generating invoice HTML:', error);
    throw error;
  }
};

// Update the helper function to include section information
const getOrderDisplayInfo = (orderDetails) => {
  if (!orderDetails) return null;

  if (orderDetails.order_type === "dine-in") {
    return {
      icon: "table-restaurant",
      text: orderDetails.section 
        ? `${orderDetails.section} - Table ${orderDetails.table_number?.join(", ") || "N/A"}`
        : `Table ${orderDetails.table_number?.join(", ") || "N/A"}`
    };
  }

  // For other order types
  const orderTypeDisplay = {
    "parcel": {
      icon: "takeout-dining",
      text: "Parcel"
    },
    "drive-through": {
      icon: "drive-eta",
      text: "Drive Through"
    },
    "counter": {
      icon: "point-of-sale",
      text: "Counter"
    }
  };

  return orderTypeDisplay[orderDetails.order_type] || {
    icon: "receipt-long",
    text: orderDetails.order_type
  };
};

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id, order_id } = useLocalSearchParams();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [invoiceUrl, setInvoiceUrl] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [printerDevice, setPrinterDevice] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bleManager] = useState(() => {
    if (Platform.OS === "web") return null;
    if (Constants.appOwnership === "expo") {
      console.log("BLE requires development build");
      return null;
    }
    return new BleManager();
  });
  const [timelineData, setTimelineData] = useState([]);
  const [isTimelineModalVisible, setIsTimelineModalVisible] = useState(false);

  // Update the handleDownloadInvoice function with better error handling
  const handleDownloadInvoice = async () => {
    try {
      setLoadingMessage("Generating invoice...");
      console.log("Starting invoice generation...");

      // Validate required data
      if (!orderDetails) {
        throw new Error('Order details not found');
      }

      if (!menuItems || !Array.isArray(menuItems)) {
        throw new Error('Menu items not available');
      }

      // Generate the invoice HTML with safe access
      const invoiceHTML = await generateInvoiceHTML({
        datetime: orderDetails.datetime || '',
        order_number: orderDetails.order_number || '',
        customer_name: orderDetails.customer_name || '',
        total_bill_amount: orderDetails.total_bill_amount || 0,
        discount_amount: orderDetails.discount_amount || 0,
        discount_percent: orderDetails.discount_percent || 0,
        special_discount: orderDetails.special_discount || 0,
        extra_charges: orderDetails.extra_charges || 0,
        service_charges_amount: orderDetails.service_charges_amount || 0,
        service_charges_percent: orderDetails.service_charges_percent || 0,
        gst_amount: orderDetails.gst_amount || 0,
        gst_percent: orderDetails.gst_percent || 0,
        grand_total: orderDetails.grand_total || 0,
        outlet_name: orderDetails.outlet_name || '',
        outlet_address: orderDetails.outlet_address || '',
        outlet_mobile: orderDetails.outlet_mobile || ''
      }, menuItems);

      // Generate PDF file
      const { uri } = await Print.printToFileAsync({
        html: invoiceHTML,
        base64: false
      });

      // Get download directory based on platform
      const downloadDir = Platform.OS === 'android' 
        ? FileSystem.documentDirectory 
        : FileSystem.documentDirectory;

      // Create filename with timestamp
      const timestamp = new Date().getTime();
      const fileName = `invoice_${orderDetails.order_number}_${timestamp}.pdf`;
      const newFileUri = `${downloadDir}${fileName}`;

      try {
        // Copy file to downloads
        await FileSystem.copyAsync({
          from: uri,
          to: newFileUri
        });

        if (Platform.OS === 'android') {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          
          if (permissions.granted) {
            // Read the file as base64
            const base64 = await FileSystem.readAsStringAsync(newFileUri, { 
              encoding: FileSystem.EncodingType.Base64 
            });
            
            // Create file in downloads using Storage Access Framework
            await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              'application/pdf'
            ).then(async (uri) => {
              await FileSystem.writeAsStringAsync(uri, base64, { 
                encoding: FileSystem.EncodingType.Base64 
              });
            });

            toast.show({
              description: "Invoice saved to Downloads",
              status: "success",
              duration: 3000,
              placement: "bottom",
              isClosable: true,
            });
          } else {
            // Fallback to share dialog if permission denied
            await Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Download Invoice'
            });
          }
        } else {
          // For iOS use share sheet
          await Sharing.shareAsync(newFileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Download Invoice',
            UTI: 'com.adobe.pdf'
          });
        }

      } catch (error) {
        console.error('Error saving file:', error);
        // Fallback to sharing if file save fails
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Download Invoice'
        });
      }

    } catch (error) {
      console.error("Error in handleDownloadInvoice:", error);
      toast.show({
        description: error.message || "Failed to generate invoice. Please try again.",
        status: "error",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
    } finally {
      setLoadingMessage("");
    }
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!id) {
        console.error("No order number provided");
        return;
      }

      try {
        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        
        console.log("Fetching order details with params:", {
          order_number: id,
          order_id: order_id,
          outlet_id: storedOutletId
        });

        const data = await fetchWithAuth(`${getBaseUrl()}/order_view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_number: id,
            order_id: order_id,
            outlet_id: storedOutletId
          }),
        });

        console.log("Order Details Response:", data);

        if (data.st === 1 && data.lists) {
          // Fix datetime parsing based on actual format "27-Jan-2025 03:53:30 PM"
          const [date, time, period] =
            data.lists.order_details.datetime.split(" ");

          // Transform the data to match our UI structure
          const transformedOrder = {
            ...data.lists.order_details,
            menu_items: Array.isArray(data.lists.menu_details)
              ? data.lists.menu_details
              : [data.lists.menu_details], // Handle single object case
            invoice_url: data.lists.invoice_url,
            date: date,
            time: `${time} ${period}`,
            total_quantity: data.lists.menu_details?.[0]?.quantity || 0,
          };

          setOrderDetails(transformedOrder);
          setMenuItems(
            Array.isArray(data.lists.menu_details)
              ? data.lists.menu_details
              : [data.lists.menu_details]
          );
        } else {
          throw new Error(data.msg || "Failed to fetch order details");
        }
      } catch (error) {
        console.error("Fetch Order Details Error:", error);
        toast.show({
          description: "Failed to fetch order details",
          status: "error",
          duration: 3000,
          placement: "bottom",
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      setIsLoading(true);
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      const storedUserId = await AsyncStorage.getItem("user_id");

      const data = await fetchWithAuth(`${getBaseUrl()}/update_order_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: storedOutletId,
          order_id: orderDetails.order_id.toString(),
          order_status: newStatus,
          user_id: storedUserId,
        }),
      });

      if (data.st === 1) {
        toast.show({
          description: `Order ${
            newStatus === "cancelled" ? "cancelled" : "marked as " + newStatus
          } successfully`,
          status: "success",
          duration: 3000,
          placement: "bottom",
          isClosable: true,
        });

        router.replace({
          pathname: "/(tabs)/orders",
          params: {
            refresh: Date.now().toString(),
          },
        });
      } else {
        throw new Error(
          data.msg || `Failed to update order status to ${newStatus}`
        );
      }
    } catch (error) {
      console.error("Status Update Error:", error);
      toast.show({
        description: error.message,
        status: "error",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const StatusActionButton = () => {
    if (!orderDetails) return null;

    switch (orderDetails.order_status?.toLowerCase()) {
      case "placed":
        return (
          <Button
            colorScheme="red"
            leftIcon={<Icon as={MaterialIcons} name="cancel" size="sm" />}
            onPress={() => handleStatusUpdate("cancelled")}
            isLoading={isLoading}
          >
            Cancel Order
          </Button>
        );
      case "cooking":
        return (
          <Button
            colorScheme="orange"
            leftIcon={<Icon as={MaterialIcons} name="room-service" size="sm" />}
            onPress={() => handleStatusUpdate("served")}
            isLoading={isLoading}
          >
            Mark as Served
          </Button>
        );
      case "served":
        return (
          <Button
            colorScheme="green"
            leftIcon={<Icon as={MaterialIcons} name="payment" size="sm" />}
            onPress={() => handleStatusUpdate("paid")}
            isLoading={isLoading}
          >
            Mark as Paid
          </Button>
        );
      default:
        return null;
    }
  };

  const handleTimerEnd = async () => {
    try {
      // After successful status update, navigate back to orders screen with refresh param
      router.replace({
        pathname: "/(tabs)/orders",
        params: {
          refresh: Date.now().toString(),
        },
      });
    } catch (error) {
      console.error("Error handling timer end:", error);
      toast.show({
        description: "Failed to update order status",
        status: "error",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    let timerInterval;

    const initTimer = () => {
      if (orderDetails?.order_status?.toLowerCase() === "placed") {
        const remaining = calculateOrderTimer(orderDetails.time);
        setTimeRemaining(remaining);

        if (remaining > 0) {
          timerInterval = setInterval(() => {
            const newTime = calculateOrderTimer(orderDetails.time);
            setTimeRemaining(newTime);

            if (newTime <= 0) {
              clearInterval(timerInterval);
              handleTimerEnd();
            }
          }, 1000);
        } else if (remaining === 0) {
          // If timer is already expired when component mounts
          handleTimerEnd();
        }
      }
    };

    initTimer();

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [orderDetails]);

  const renderTimer = () => {
    if (
      orderDetails?.order_status?.toLowerCase() !== "placed" ||
      timeRemaining <= 0
    ) {
      return null;
    }

    return (
      <HStack
        bg={timeRemaining <= 30 ? "red.100" : "orange.100"}
        p={2}
        rounded="md"
        alignItems="center"
        space={2}
      >
        <Icon
          as={MaterialIcons}
          name="timer"
          size={5}
          color={timeRemaining <= 30 ? "red.500" : "orange.500"}
        />
        <Text
          fontSize="lg"
          color={timeRemaining <= 30 ? "red.500" : "orange.500"}
          fontWeight="bold"
        >
          {timeRemaining} seconds
        </Text>
      </HStack>
    );
  };

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

  const requestPermissions = async () => {
    try {
      const state = await bleManager.state();
      if (state !== "PoweredOn") {
        Alert.alert(
          "Bluetooth Required",
          "Please enable Bluetooth to connect to printer",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
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

  const scanForPrinters = async () => {
    try {
      const isExpoGo = Constants.executionEnvironment === "storeClient";
      const isWeb = Platform.OS === "web";

      if (isExpoGo || isWeb) {
        Alert.alert(
          "Feature Not Available",
          "Bluetooth printing is not available in Expo Go or web. Please use PDF printing instead.",
          [
            {
              text: "Print PDF",
              onPress: async () => {
                try {
                  const html = generateReceiptHTML(orderDetails, menuItems);
                  await Print.printAsync({
                    html,
                    orientation: "portrait",
                  });
                } catch (error) {
                  Alert.alert("Error", "Failed to generate receipt PDF");
                }
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }

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

      device.onDisconnected((error, disconnectedDevice) => {
        setIsConnected(false);
        setPrinterDevice(null);
        Alert.alert("Disconnected", "Printer connection was lost");
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

  const handlePrint = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage("Printing...");

      // Check if running in Expo Go or web
      const isExpoGo = Constants.executionEnvironment === "storeClient";
      const isWeb = Platform.OS === "web";

      if (isExpoGo || isWeb) {
        // Use PDF printing in Expo Go or web
        const html = generateReceiptHTML(orderDetails, menuItems);
        await Print.printAsync({
          html,
          orientation: "portrait",
        });
      } else {
        // Use thermal printing in development or production builds
        if (printerDevice && isConnected) {
          await printReceipt();
        } else {
          setIsModalVisible(true);
          scanForPrinters();
        }
      }

      toast.show({
        description: "Receipt printed successfully",
        status: "success",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
    } catch (error) {
      console.error("Print error:", error);
      toast.show({
        description: "Failed to print receipt",
        status: "error",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const printReceipt = async () => {
    try {
      if (!printerDevice || !isConnected) {
        throw new Error("No printer connected");
      }

      // Generate and send commands for thermal printer
      const commands = [
        ...textToBytes("\x1B\x40"), // Initialize printer
        ...textToBytes("\x1B\x61\x01"), // Center alignment
        ...textToBytes(`${orderDetails.outlet_name}\n`),
        ...textToBytes(`${orderDetails.outlet_address}\n\n`),
        ...textToBytes("\x1B\x61\x00"), // Left alignment
        ...textToBytes(`Bill Number: ${orderDetails.order_number}\n`),
        ...textToBytes(
          `Table: ${orderDetails.section} - ${orderDetails.table_number[0]}\n`
        ),
        ...textToBytes(`Date: ${orderDetails.datetime}\n\n`),
        ...textToBytes("----------------------------------------\n"),
        ...textToBytes("Item                  Qty    Rate    Amt\n"),
        ...textToBytes("----------------------------------------\n"),

        // Print items
        ...menuItems.flatMap((item) => {
          const itemName = item.menu_name.padEnd(20).substring(0, 20);
          return textToBytes(
            `${itemName} ${String(item.quantity).padStart(3)}  ${String(
              item.price
            ).padStart(6)} ${String(item.menu_sub_total).padStart(7)}\n`
          );
        }),

        ...textToBytes("----------------------------------------\n"),
        ...textToBytes(
          `Subtotal:${String(orderDetails.total_bill_amount).padStart(29)}\n`
        ),
        ...textToBytes(
          `Discount (${orderDetails.discount_percent}%):${String(
            -orderDetails.discount_amount
          ).padStart(20)}\n`
        ),
        ...textToBytes(
          `Service Charge (${orderDetails.service_charges_percent}%):${String(
            orderDetails.service_charges_amount
          ).padStart(17)}\n`
        ),
        ...textToBytes(
          `GST (${orderDetails.gst_percent}%):${String(
            orderDetails.gst_amount
          ).padStart(28)}\n`
        ),
        ...textToBytes("----------------------------------------\n"),
        ...textToBytes(
          `GRAND TOTAL:${String(orderDetails.grand_total).padStart(27)}\n\n`
        ),

        ...textToBytes("\x1B\x61\x01"), // Center alignment
        ...textToBytes("Thank you for dining with us!\n"),
        ...textToBytes("Visit us again\n\n"),
        ...textToBytes("\x1D\x56\x41\x10"), // Cut paper
      ];

      // Send commands to printer
      await sendToDevice(commands);
    } catch (error) {
      console.error("Thermal print error:", error);
      throw error;
    }
  };

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

  // Add fetchTimeline function
  const fetchTimeline = async () => {
    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      const response = await fetchWithAuth(`${getBaseUrl()}/order_timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order_id,
          outlet_id: storedOutletId
        }),
      });

      if (response.st === 1 && response.timeline) {
        setTimelineData(response.timeline);
      } else {
        throw new Error(response.msg || "Failed to fetch timeline");
      }
    } catch (error) {
      console.error("Timeline fetch error:", error);
      toast.show({
        description: "Failed to fetch order timeline",
        status: "error",
        duration: 3000,
        placement: "bottom",
      });
    }
  };

  // Add Timeline Modal Component
  const TimelineModal = ({ isOpen, onClose, data }) => (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <Modal.Content maxWidth="400px">
        <Modal.Header>Order Timeline - #{orderDetails?.order_number}</Modal.Header>
        <Modal.Body>
          <VStack space={4}>
            {data.map((item, index) => (
              <HStack key={item.order_time_line_id} space={3} alignItems="flex-start">
                <VStack alignItems="center" space={0}>
                  <Box
                    w="12px"
                    h="12px"
                    rounded="full"
                    bg="green.500"
                  />
                  {index !== data.length - 1 && (
                    <Box
                      w="2px"
                      h="50px"
                      bg="gray.200"
                    />
                  )}
                </VStack>
                <VStack flex={1} space={1}>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontWeight="bold" textTransform="capitalize">
                      {item.user_name} ({item.user_role})
                    </Text>
                  </HStack>
                  <Text color="gray.600">
                    Status: <Text color="green.600" fontWeight="semibold" textTransform="capitalize">{item.order_status}</Text>
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    {item.created_on}
                  </Text>
                </VStack>
              </HStack>
            ))}
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button onPress={onClose}>Close</Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );

  // Add useEffect to fetch timeline when order_id changes
  useEffect(() => {
    if (order_id) {
      fetchTimeline();
    }
  }, [order_id]);

  if (isLoading) {
    return (
      <Box flex={1} bg="white" safeArea>
        <Header title="Order Details" showBack />
        <Center flex={1}>
          <Spinner size="lg" />
          <Text mt={2}>Loading order details...</Text>
        </Center>
      </Box>
    );
  }

  if (!orderDetails) {
    return (
      <Box flex={1} bg="white" safeArea>
        <Header title="Order Details" showBack />
        <Center flex={1}>
          <Text>Order not found</Text>
        </Center>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="white" safeArea>
      <Header 
        title="Order Details" 
        showBack 
        rightComponent={
          orderDetails && 
          orderDetails.order_status?.toLowerCase() !== "paid" && 
          orderDetails.order_status?.toLowerCase() !== "cancelled" ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Icon as={MaterialIcons} name="edit" size="sm" />}
              onPress={() => router.push({
                pathname: "/screens/orders/create-order",
                params: { order_id: orderDetails.order_id }
              })}
            >
              Edit
            </Button>
          ) : null
        }
      />

      {/* Add Timeline Modal */}
      <TimelineModal
        isOpen={isTimelineModalVisible}
        onClose={() => setIsTimelineModalVisible(false)}
        data={timelineData}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Summary Card */}
        <Box m={4} p={4} bg="white" rounded="lg" shadow={1}>
          <VStack space={3}>
            <HStack justifyContent="space-between" alignItems="flex-start">
              <VStack space={2}>
                <Heading size="md">Order #{orderDetails.order_number}</Heading>
                <Text fontSize="sm" color="coolGray.600">
                  {orderDetails.date} • {orderDetails.time}
                </Text>
                {renderTimer()}
              </VStack>
              <VStack space={2} alignItems="flex-end">
                <Badge
                  px={3}
                  py={1}
                  rounded="full"
                  colorScheme={
                    orderDetails.order_status === "cooking"
                      ? "orange"
                      : orderDetails.order_status === "paid"
                      ? "green"
                      : orderDetails.order_status === "placed"
                      ? "purple"
                      : "red"
                  }
                >
                  {orderDetails.order_status?.toUpperCase()}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  px={1}
                  py={1}
                  borderRadius={10}
                  leftIcon={<Icon as={MaterialIcons} name="schedule" size="sm" />}
                  onPress={() => setIsTimelineModalVisible(true)}
                >
                  Timeline
                </Button>
              </VStack>
            </HStack>
            
            <HStack space={4} alignItems="center">
              <HStack space={2} alignItems="center">
                {orderDetails && (
                  <>
                    <MaterialIcons 
                      name={getOrderDisplayInfo(orderDetails).icon} 
                      size={20} 
                      color="gray" 
                    />
                    <Text fontSize="md">
                      {getOrderDisplayInfo(orderDetails).text}
                    </Text>
                  </>
                )}
              </HStack>
            </HStack>
           
          </VStack>
        </Box>

        {/* Menu Items Card */}
        <Box mx={4} mb={4} p={4} bg="white" rounded="lg" shadow={1}>
          <HStack justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="sm">
              Order Items{" "}
              <Text color="coolGray.600" fontSize="sm">
                ({menuItems.length} {menuItems.length === 1 ? "item" : "items"})
              </Text>
            </Heading>
            <Text color="coolGray.600" fontSize="sm">
              Total Qty:{" "}
              {menuItems.reduce((sum, item) => sum + Number(item.quantity), 0)}
            </Text>
          </HStack>
          <VStack space={4}>
            {menuItems.map((item, index) => (
              <Box
                key={index}
                borderBottomWidth={index !== menuItems.length - 1 ? 1 : 0}
                borderColor="coolGray.200"
                pb={index !== menuItems.length - 1 ? 4 : 0}
              >
                <HStack justifyContent="space-between" alignItems="flex-start">
                  <VStack flex={1} space={1}>
                    <Text fontSize="md" fontWeight="bold">
                      {item.menu_name}{" "}
                      <Text fontSize="sm" color="coolGray.600">
                        ({item.quantity})
                      </Text>
                      {item.half_or_full && (
                        <Text fontSize="sm" color="coolGray.600">
                          {" "}
                          - {item.half_or_full}
                        </Text>
                      )}
                    </Text>
                    {item.comment && (
                      <Text fontSize="sm" color="coolGray.600" italic>
                        Note: {item.comment}
                      </Text>
                    )}
                    <HStack space={2} alignItems="center">
                      {item.offer > 0 && (
                        <Badge
                          colorScheme="red"
                          variant="subtle"
                          rounded="full"
                          px={3}
                          minW={16}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text fontSize="xs" fontWeight="medium">
                            {item.offer}% OFF
                          </Text>
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                  <VStack alignItems="flex-end" space={1}>
                    <Text fontSize="md" fontWeight="semibold">
                      ₹{item.menu_sub_total}
                    </Text>
                    <Text fontSize="sm" color="coolGray.600">
                      ₹{item.price}
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* Bill Details Card */}
        <Box mx={4} mb={4} p={4} bg="white" rounded="lg" shadow={1}>
          <Heading size="sm" mb={4}>
            Bill Details
          </Heading>
          <VStack space={3}>
            {/* Item Total */}
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Item Total</Text>
              <Text>₹{Number(orderDetails.total_bill_amount).toFixed(2)}</Text>
            </HStack>

            {/* Discount (if applicable) */}
            {orderDetails.discount_amount > 0 && (
              <HStack justifyContent="space-between">
                <Text color="green.600">
                  Discount ({orderDetails.discount_percent}%)
                </Text>
                <Text color="green.600">
                  -₹{Number(orderDetails.discount_amount).toFixed(2)}
                </Text>
              </HStack>
            )}

            {/* Total after discount */}
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Total after discount</Text>
              <Text>
                ₹
                {Number(
                  orderDetails.total_bill_amount - orderDetails.discount_amount
                ).toFixed(2)}
              </Text>
            </HStack>

            {/* Service Charge */}
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">
                Service Charge ({orderDetails.service_charges_percent}%)
              </Text>
              <Text>
                ₹{Number(orderDetails.service_charges_amount).toFixed(2)}
              </Text>
            </HStack>

            {/* GST */}
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">
                GST ({orderDetails.gst_percent}%)
              </Text>
              <Text>₹{Number(orderDetails.gst_amount).toFixed(2)}</Text>
            </HStack>

            {/* Grand Total */}
            <HStack
              justifyContent="space-between"
              pt={2}
              borderTopWidth={1}
              borderColor="coolGray.200"
            >
              <Text fontWeight="bold">Grand Total</Text>
              <Text fontWeight="bold" fontSize="lg">
                ₹{Number(orderDetails.grand_total).toFixed(2)}
              </Text>
            </HStack>
          </VStack>
        </Box>

        {/* Status Action Button */}
        <Box px={4} pb={4}>
          <StatusActionButton />

          {/* Print Button */}
          <Button
            mt={2}
            variant="outline"
            leftIcon={<Icon as={MaterialIcons} name="print" size="sm" />}
            onPress={handlePrint}
            isLoading={loadingMessage === "Printing..."}
            isDisabled={isLoading}
          >
            {loadingMessage === "Printing..." ? "Printing..." : "Print Receipt"}
          </Button>
        </Box>

        {/* Invoice Button */}
        {orderDetails.order_status === "paid" && (
          <Pressable
            onPress={handleDownloadInvoice}
            mx={4}
            mb={4}
          >
            <Box
              bg="blue.50"
              p={4}
              rounded="lg"
              borderWidth={1}
              borderColor="blue.200"
            >
              <HStack space={2} alignItems="center" justifyContent="center">
                <MaterialIcons name="download" size={24} color="#3182CE" />
                <Text color="blue.600" fontWeight="semibold">
                  Download Invoice
                </Text>
              </HStack>
            </Box>
          </Pressable>
        )}
      </ScrollView>

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
