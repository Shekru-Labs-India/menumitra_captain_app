/*
 * Enhanced Order Details Screen
 * 
 * This file integrates all order status screens from owner app:
 * 1. PlacedOrderDetails - Handling newly placed orders
 * 2. OnGoingOrderDetails - For orders in cooking/preparation
 * 3. ServedOrderDetails - For served orders awaiting payment
 * 4. CompletedOrderDetails - For paid/completed orders
 * 5. CancelledOrderDetails - For cancelled orders
 * 
 * Key enhancements:
 * - Status-specific UI elements and actions
 * - Color-coded status badges matching owner app
 * - Timeline visualization with status-specific colors
 * - Receipt/KOT printing with status-specific formatting
 * - Cancellation flow with reason input
 * - Payment method selection for completing orders
 * - Special UI treatment for cancelled orders (strikethrough)
 */
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
  Input,
  FormControl,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Linking, Platform, Alert } from "react-native";
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

// Add order status colors from owner app
const ORDER_STATUS_COLORS = {
  PLACED: "#4B89DC",    // Blue for Placed
  COOKING: "#FF9800",   // Orange for Cooking
  SERVED: "#0C8B51",    // Green for Served
  PAID: "#673AB7",      // Purple for Paid
  CANCELLED: "#F44336", // Red for Cancelled
  DEFAULT: "#9E9E9E",   // Gray for Default
};

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

// Add printer command constants
const ESC = 0x1b;
const GS = 0x1d;
const COMMANDS = {
  INITIALIZE: [ESC, "@"],
  TEXT_NORMAL: [ESC, "!", 0],
  TEXT_CENTERED: [ESC, "a", 1],
  LINE_SPACING: [ESC, "3", 60],
  CUT_PAPER: [GS, "V", 1],
};

// Add standardized date time formatter matching owner app
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

// Add the generateReceiptHTML function
const generateReceiptHTML = (orderDetails, menuItems) => {
  try {
    const isCancelled = orderDetails.order_status?.toLowerCase() === "cancelled";
    
    const items = menuItems
      .map(
        (item) => `
    <tr>
      <td style="text-align: left; ${isCancelled ? 'text-decoration: line-through;' : ''}">${item.menu_name}</td>
      <td style="text-align: center; ${isCancelled ? 'text-decoration: line-through;' : ''}">${item.quantity}</td>
      <td style="text-align: right; ${isCancelled ? 'text-decoration: line-through;' : ''}">₹${item.price}</td>
      <td style="text-align: right; ${isCancelled ? 'text-decoration: line-through;' : ''}">₹${item.menu_sub_total}</td>
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
          position: relative;
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
        .cancelled-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 40px;
          font-weight: bold;
          color: rgba(255, 0, 0, 0.2);
          z-index: 1000;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      ${isCancelled ? '<div class="cancelled-watermark">CANCELLED</div>' : ''}
      
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
        ${orderDetails.order_status ? `Status: ${orderDetails.order_status.toUpperCase()}<br>` : ''}
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
      
      ${isCancelled ? '<div style="text-align: center; margin-top: 15px; font-weight: bold; color: red;">*** ORDER CANCELLED ***</div>' : ''}
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
    // Get the current date and time formatted to match owner app exactly
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

    // Get the logo as base64
    const menuMitraLogo = await getMenuMitraLogo();
    const logoPlaceholder = menuMitraLogo || ''; // Use empty string if logo loading fails

    // Helper function to check if a number is zero - matching owner app
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
          .logo-img {
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
            ${logoPlaceholder ? `<img src="${logoPlaceholder}" alt="MenuMitra Logo" class="logo-img"/>` : ''}
            <span class="logo-text">MenuMitra</span>
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
            <strong>Bill No:</strong> ${orderDetails.order_number || ''}<br>
            <strong>Date:</strong> ${currentDateTime}
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
                <span>${item.menu_name || ''}${item.half_or_full ? ` (${item.half_or_full})` : ''}</span>
                <span>${item.quantity || 0}</span>
                <span>₹ ${Number(item.price || 0).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="amount-details">
          <div class="amount-row">
            <span class="amount-label">Total:</span>
            <span class="amount-value">₹${Number(orderDetails.total_bill_amount || 0).toFixed(2)}</span>
          </div>

          ${!isZero(orderDetails.discount_amount) ? `
            <div class="amount-row">
              <span class="amount-label">Discount (${orderDetails.discount_percent || 0}%):</span>
              <span class="amount-value discount-value">-₹${Number(orderDetails.discount_amount || 0).toFixed(2)}</span>
            </div>
          ` : ''}

          ${!isZero(orderDetails.special_discount) ? `
            <div class="amount-row">
              <span class="amount-label">Special Discount:</span>
              <span class="amount-value discount-value">-₹${Number(orderDetails.special_discount || 0).toFixed(2)}</span>
            </div>
          ` : ''}

          ${!isZero(orderDetails.charges) ? `
            <div class="amount-row">
              <span class="amount-label">Extra Charges:</span>
              <span class="amount-value charges-value">+₹${Number(orderDetails.charges || 0).toFixed(2)}</span>
            </div>
          ` : ''}

          <div class="amount-row subtotal">
            <span class="amount-label">Subtotal:</span>
            <span class="amount-value">₹${Number(orderDetails.total_bill_with_discount || 0).toFixed(2)}</span>
          </div>

          ${!isZero(orderDetails.service_charges_percent) ? `
            <div class="amount-row">
              <span class="amount-label">Service Charges (${orderDetails.service_charges_percent}%):</span>
              <span class="amount-value charges-value">+₹${Number(orderDetails.service_charges_amount || 0).toFixed(2)}</span>
            </div>
          ` : ''}

          ${!isZero(orderDetails.gst_percent) ? `
            <div class="amount-row">
              <span class="amount-label">GST (${orderDetails.gst_percent}%):</span>
              <span class="amount-value charges-value">+₹${Number(orderDetails.gst_amount || 0).toFixed(2)}</span>
            </div>
          ` : ''}

          ${!isZero(orderDetails.tip) ? `
            <div class="amount-row">
              <span class="amount-label">Tip:</span>
              <span class="amount-value charges-value">+₹${Number(orderDetails.tip || 0).toFixed(2)}</span>
            </div>
          ` : ''}

          <div class="divider"></div>
          
          <div class="amount-row grand-total">
            <span class="amount-label">Grand Total:</span>
            <span class="amount-value">₹${Number(orderDetails.final_grand_total || orderDetails.grand_total || 0).toFixed(2)}</span>
          </div>
        </div>

        <div class="payment-section">
          <span class="payment-label">Payment Method:</span>
          <span>${getPaymentMethod(orderDetails)}</span>
        </div>

        <div class="footer">
          Have a nice day.<br>
          <div class="footer-logo-section">
            ${logoPlaceholder ? `
              <img src="${logoPlaceholder}" alt="MenuMitra Logo" class="footer-logo-image"/>
              <span class="footer-logo-text">MenuMitra</span>
            ` : ''}
          </div>
          info@menumitra.com<br>
          +91 9172530151<br>
          www.menumitra.com
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
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

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

      // Format current date and time in the required format: DD-MMM-YYYY hh:mm:ss AM/PM
      const now = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = String(now.getDate()).padStart(2, '0');
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      const hours = now.getHours() % 12 || 12; // Convert to 12-hour format
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const period = now.getHours() >= 12 ? 'PM' : 'AM';
      const currentDateTime = `${day}-${month}-${year} ${hours}:${minutes}:${seconds} ${period}`;

      // Generate the invoice HTML with all required fields to match owner app
      const invoiceHTML = await generateInvoiceHTML({
        datetime: currentDateTime, // Use current time instead of orderDetails.datetime
        order_number: orderDetails.order_number || '',
        customer_name: orderDetails.customer_name || '',
        total_bill_amount: orderDetails.total_bill_amount || 0,
        discount_amount: orderDetails.discount_amount || 0,
        discount_percent: orderDetails.discount_percent || 0,
        special_discount: orderDetails.special_discount || 0,
        charges: orderDetails.charges || 0,
        service_charges_amount: orderDetails.service_charges_amount || 0,
        service_charges_percent: orderDetails.service_charges_percent || 0,
        gst_amount: orderDetails.gst_amount || 0,
        gst_percent: orderDetails.gst_percent || 0,
        grand_total: orderDetails.grand_total || 0,
        final_grand_total: orderDetails.final_grand_total || orderDetails.grand_total || 0,
        total_bill_with_discount: orderDetails.total_bill_with_discount || 0,
        tip: orderDetails.tip || 0,
        payment_method: orderDetails.payment_method || 'CASH',
        outlet_name: orderDetails.outlet_name || '',
        outlet_address: orderDetails.outlet_address || '',
        outlet_mobile: orderDetails.outlet_mobile || '',
        section: orderDetails.section || '',
        section_id: orderDetails.section_id || '',
        table_number: orderDetails.table_number || [],
        order_type: orderDetails.order_type || 'dine-in',
        order_status: orderDetails.order_status || '',
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

  const handleStatusUpdate = async (newStatus, additionalParams = {}) => {
    try {
      setIsLoading(true);
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      const storedUserId = await AsyncStorage.getItem("user_id");

      const requestBody = {
          outlet_id: storedOutletId,
          order_id: orderDetails.order_id.toString(),
          order_status: newStatus,
          user_id: storedUserId,
        ...additionalParams
      };

      const data = await fetchWithAuth(`${getBaseUrl()}/update_order_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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

  // Add a cancel order modal function
  const showCancelOrderModal = () => {
    setShowCancelModal(true);
  };

  const handleCancelOrder = () => {
    if (!cancelReason.trim()) {
      toast.show({
        description: "Please provide a reason for cancellation",
        status: "warning",
        duration: 3000,
        placement: "bottom",
      });
      return;
    }
    
    handleStatusUpdate("cancelled", { cancel_reason: cancelReason });
    setShowCancelModal(false);
  };

  const StatusActionButton = () => {
    if (!orderDetails) return null;

    switch (orderDetails.order_status?.toLowerCase()) {
      case "placed":
        return (
          <Button
            colorScheme="red"
            leftIcon={<Icon as={MaterialIcons} name="cancel" size="sm" />}
            onPress={showCancelOrderModal}
            isLoading={isLoading}
            width="100%"
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
            width="100%"
          >
            Mark as Served
          </Button>
        );
      case "served":
        return (
          <Button
            colorScheme="green"
            leftIcon={<Icon as={MaterialIcons} name="payment" size="sm" />}
            onPress={() => setShowPaymentModal(true)}
            isLoading={isLoading}
            width="100%"
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

      // Find the appropriate service and characteristic
      const services = await printerDevice.services();
      
      // Common printer service UUIDs
      const PRINTER_SERVICE_UUIDS = [
        "49535343-FE7D-4AE5-8FA9-9FAFD205E455",
        "E7810A71-73AE-499D-8C15-FAA9AEF0C3F2",
        "000018F0-0000-1000-8000-00805F9B34FB",
      ];
      
      // Common printer characteristic UUIDs
      const PRINTER_CHARACTERISTIC_UUIDS = [
        "49535343-8841-43F4-A8D4-ECBE34729BB3",
        "BEF8D6C9-9C21-4C9E-B632-BD58C1009F9F",
      ];
      
      // Find a compatible service
      const service = services.find((svc) =>
        PRINTER_SERVICE_UUIDS.some((uuid) =>
          svc.uuid.toLowerCase().includes(uuid.toLowerCase())
        )
      );
      
      if (!service) {
        throw new Error("Printer service not found");
      }
      
      // Find a compatible characteristic
      const characteristics = await service.characteristics();
      const writeCharacteristic = characteristics.find((char) =>
        PRINTER_CHARACTERISTIC_UUIDS.some((uuid) =>
          char.uuid.toLowerCase().includes(uuid.toLowerCase())
        )
      );
      
      if (!writeCharacteristic) {
        throw new Error("Printer characteristic not found");
      }

      // Use very small chunks for better reliability
      const CHUNK_SIZE = 16; // Even smaller chunks
      
      console.log(`Sending ${commands.length} bytes to printer in chunks of ${CHUNK_SIZE}`);
      
      // Try different writing methods based on what's available
      const writeMethod = writeCharacteristic.isWritableWithResponse ? 
                        'writeWithResponse' : 'writeWithoutResponse';
      
      for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
        const chunk = commands.slice(i, i + CHUNK_SIZE);
        const encodedData = base64.encode(String.fromCharCode(...chunk));
        
        try {
          await writeCharacteristic[writeMethod](encodedData);
          // Increase delay between chunks
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.log(`Error sending chunk ${i}:`, err);
          // Try alternative method if available
          if (writeMethod === 'writeWithResponse' && writeCharacteristic.isWritableWithoutResponse) {
            await writeCharacteristic.writeWithoutResponse(encodedData);
          } else if (writeMethod === 'writeWithoutResponse' && writeCharacteristic.isWritableWithResponse) {
            await writeCharacteristic.writeWithResponse(encodedData);
          } else {
            throw err;
          }
          // Longer delay after error
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Longer final delay to ensure all data is processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error("Printer send error:", error);
      throw error;
    }
  };

  const requestPermissions = async () => {
    try {
      // Skip permissions check on web or Expo Go
      if (Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
        return false;
      }

      // On Android
      if (Platform.OS === "android") {
        const apiLevel = parseInt(Platform.Version, 10);
        
        // For Android 12+ (API level 31+)
        if (apiLevel >= 31) {
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
        } 
        // For Android 10+ (API level 29+)
        else if (apiLevel >= 29) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          
          return result === PermissionsAndroid.RESULTS.GRANTED;
        }
        // For older Android versions
        else {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
          );
          
          return result === PermissionsAndroid.RESULTS.GRANTED;
        }
      }
      
      // On iOS, permissions are handled at the info.plist level
      // but some runtime requests might still be needed based on usage
      if (Platform.OS === "ios") {
        // For future iOS specific permission requests
      return true;
      }
      
      return false;
    } catch (error) {
      console.error("Permission request error:", error);
      return false;
    }
  };

  const scanForPrinters = async () => {
    try {
      // Check if we're in a web or Expo environment where BLE won't work
      if (Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
        Alert.alert(
          "Not Available",
          "Bluetooth printer functionality is not available in this environment.",
          [{ text: "OK" }]
        );
        return false;
      }

      // Request permissions first
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert(
          "Permission Required",
          "Bluetooth permission is needed to connect to the printer",
          [{ text: "OK" }]
        );
        return false;
      }

      setIsLoading(true);
      setLoadingMessage("Checking Bluetooth...");

      // Check if Bluetooth is enabled
      const state = await bleManager.state();
      if (state !== "PoweredOn") {
        setIsLoading(false);
        Alert.alert(
          "Bluetooth Required",
          "Please turn on Bluetooth to connect to printer",
          [{ text: "OK" }]
        );
        return false;
      }

      // Start scanning
      setLoadingMessage("Scanning for printers...");
      setAvailableDevices([]);
      setIsScanning(true);
      setIsModalVisible(true);

      // Stop any existing scan
      bleManager.stopDeviceScan();
      
      // Start scanning for devices
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error("Scan error:", error);
          return;
        }

        if (device && device.name) {
          // Add device if it's not already in the list
          setAvailableDevices((prevDevices) => {
            const deviceExists = prevDevices.some((d) => d.id === device.id);
            if (!deviceExists) {
              return [...prevDevices, device];
            }
            return prevDevices;
          });
        }
      });

      // Set timeout to stop scanning after 10 seconds
      setTimeout(() => {
        if (isScanning) {
          bleManager.stopDeviceScan();
          setIsScanning(false);
          setLoadingMessage("");
          setIsLoading(false);
        }
      }, 10000);

      return true;
    } catch (error) {
      console.error("Scan error:", error);
      setIsScanning(false);
      setIsLoading(false);
      
      Alert.alert(
        "Connection Error",
        "Unable to scan for printers. Please try again.",
        [{ text: "OK" }]
      );
      
      return false;
    }
  };

  const handleDeviceSelection = async (device) => {
    try {
      setIsLoading(true);
      setLoadingMessage("Connecting to printer...");
      
      // Stop scanning for devices
      bleManager.stopDeviceScan();
      setIsScanning(false);
      
      // Disconnect from any existing device
      if (printerDevice && isConnected) {
        try {
          await printerDevice.cancelConnection();
        } catch (e) {
          console.log("Error disconnecting from previous device:", e);
        }
      }
      
      // Connect to the selected device
      setLoadingMessage(`Connecting to ${device.name || 'printer'}...`);
      
      // Connect with retry logic
      let connectedDevice = null;
      let retries = 3;
      
      while (retries > 0 && !connectedDevice) {
        try {
          connectedDevice = await device.connect();
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!connectedDevice) {
        throw new Error("Failed to connect to printer");
      }
      
      // Discover services and characteristics
      setLoadingMessage("Discovering services...");
        await connectedDevice.discoverAllServicesAndCharacteristics();

      // Store the connected device and update state
      setPrinterDevice(connectedDevice);
      setIsConnected(true);
      setIsModalVisible(false);
      
      // Show success message
      toast.show({
        description: `Connected to ${device.name || 'printer'} successfully`,
        status: "success",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
      
      return true;
    } catch (error) {
      console.error("Connection error:", error);
      setIsConnected(false);
      setPrinterDevice(null);
      
      // Show error message
      toast.show({
        description: `Failed to connect: ${error.message}`,
        status: "error",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
      
      return false;
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handlePrint = async (type) => {
    try {
      setIsLoading(true);
      setLoadingMessage(`Preparing to print ${type}...`);

      // Check for Bluetooth permissions first
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        throw new Error("Bluetooth permission is required to print");
      }

      // Check if printer is connected
      if (!isConnected || !printerDevice) {
        console.log("No printer connected. Opening printer selection...");
        setLoadingMessage("No printer connected. Scanning for printers...");
        
        // Show modal and scan for printers
        setIsModalVisible(true);
        await scanForPrinters();
        
        // Return early since we're showing the selection modal
        // The user will need to select a printer first
        setIsLoading(false);
        setLoadingMessage("");
        return;
      }

      // Print based on type - directly print without additional prompts
      const printType = type.toLowerCase();
      setLoadingMessage(`Printing ${printType}...`);
      
      if (printType === "receipt") {
        await printReceipt();
        toast.show({
          description: "Receipt printed successfully",
          status: "success",
          duration: 3000,
          placement: "bottom"
        });
      } else if (printType === "kot") {
        await printKOT();
        toast.show({
          description: "KOT printed successfully",
          status: "success",
          duration: 3000,
          placement: "bottom"
        });
      } else {
        throw new Error(`Unknown print type: ${type}`);
      }
      
      return true;
    } catch (error) {
      console.error(`${type} printing error:`, error);
      
      // Handle different error scenarios
      if (error.message.includes("Bluetooth permission")) {
        toast.show({
          description: "Bluetooth permission is required to print",
          status: "error",
          duration: 3000,
          placement: "bottom"
        });
      } else if (error.message.includes("No printer connected")) {
        // This should not happen since we check and show the modal above
        toast.show({
          description: "Please connect a printer first",
          status: "error",
          duration: 3000,
          placement: "bottom"
        });
      } else {
        toast.show({
          description: `Failed to print ${type}: ${error.message}`,
          status: "error",
          duration: 3000,
          placement: "bottom"
        });
      }
      
      return false;
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const sendDataToPrinter = async (commands) => {
    try {
      if (!printerDevice || !isConnected) {
        console.error("Cannot send data: Printer not connected");
        throw new Error("No printer connected");
      }

      // Find the appropriate service and characteristic
      const services = await printerDevice.services();
      
      // Find a compatible service
      const service = services.find((svc) =>
        PRINTER_SERVICE_UUIDS.some((uuid) =>
          svc.uuid.toLowerCase().includes(uuid.toLowerCase())
        )
      );
      
      if (!service) {
        throw new Error("Printer service not found");
      }
      
      // Find a compatible characteristic
      const characteristics = await service.characteristics();
      const writeCharacteristic = characteristics.find((char) =>
        PRINTER_CHARACTERISTIC_UUIDS.some((uuid) =>
          char.uuid.toLowerCase().includes(uuid.toLowerCase())
        )
      );
      
      if (!writeCharacteristic) {
        throw new Error("Printer characteristic not found");
      }

      // Use very small chunks for better reliability
      const CHUNK_SIZE = 20; // Even smaller chunks for reliability
      
      console.log(`Sending ${commands.length} bytes to printer in chunks of ${CHUNK_SIZE}`);
      
      // Try different writing methods based on what's available
      const writeMethod = writeCharacteristic.isWritableWithResponse ? 
                        'writeWithResponse' : 'writeWithoutResponse';
      
      for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
        const chunk = commands.slice(i, i + CHUNK_SIZE);
        const encodedData = base64.encode(String.fromCharCode(...chunk));
        
        try {
          await writeCharacteristic[writeMethod](encodedData);
          // Delay between chunks for better reliability
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.log(`Error sending chunk ${i}:`, err);
          // Try alternative method if available
          if (writeMethod === 'writeWithResponse' && writeCharacteristic.isWritableWithoutResponse) {
            await writeCharacteristic.writeWithoutResponse(encodedData);
          } else if (writeMethod === 'writeWithoutResponse' && writeCharacteristic.isWritableWithResponse) {
            await writeCharacteristic.writeWithResponse(encodedData);
          } else {
            throw err;
          }
          // Longer delay after error
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Final delay to ensure all data is processed by printer
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("Print data sent successfully");
      return true;
    } catch (error) {
      console.error("Send to printer error:", error);
      throw error;
    }
  };

  const printReceipt = async () => {
    try {
      if (!printerDevice || !isConnected) {
        throw new Error("No printer connected");
      }

      // Get UPI ID from AsyncStorage or use a default
      const upiId = await AsyncStorage.getItem("upi_id") || "merchant@upi";
      
      // Determine payment status
      const isPaid = orderDetails.is_paid === 1 || orderDetails.is_paid === "paid" || orderDetails.payment_status === "paid";
      const isComplementary = orderDetails.is_complementary === 1 || orderDetails.is_complementary === true;
      
      // Format current date time in the required format
      const formattedDateTime = getCurrentDateTime();
      
      // Calculate totals
      const subtotal = parseFloat(orderDetails.total_bill_amount || 0);
      const discount = parseFloat(orderDetails.discount_amount || 0);
      const discountPercent = parseFloat(orderDetails.discount_percent || 0);
      const specialDiscount = parseFloat(orderDetails.special_discount || 0);
      const extraCharges = parseFloat(orderDetails.charges || 0);
      const totalWithDiscount = parseFloat(orderDetails.total_bill_with_discount || subtotal - discount - specialDiscount + extraCharges);
      const serviceCharges = parseFloat(orderDetails.service_charges_amount || 0);
      const serviceChargesPercent = parseFloat(orderDetails.service_charges_percent || 0);
      const gstAmount = parseFloat(orderDetails.gst_amount || 0);
      const gstPercent = parseFloat(orderDetails.gst_percent || 0);
      const tip = parseFloat(orderDetails.tip || 0);
      const grandTotal = parseFloat(orderDetails.grand_total || 0);
      const finalGrandTotal = parseFloat(orderDetails.final_grand_total || grandTotal);
      
      // Helper functions from owner app
      const getDottedLine = () => "--------------------------------\n";
      
      const formatAmountLine = (label, amount, symbol = "") => {
        const amountStr = Math.abs(parseFloat(amount)).toFixed(2);
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
        const rate = Math.floor(parseFloat(item.price)).toString();
        const total = parseFloat(item.menu_sub_total || item.price * item.quantity).toFixed(2);

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
      
      // Generate QR code data with safe values - matching owner app
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
      
      // Generate QR code data with UPI info for payment
      const qrData = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
        orderDetails.outlet_name || "Restaurant"
      )}&am=${finalGrandTotal.toFixed(2)}`;

      // Build printer commands exactly like owner app
      const commands = [
        ...COMMANDS.INITIALIZE,
        ...textToBytes("\x1B\x61\x01"), // Center align
        
        // Display PAID or COMPLEMENTARY status at the top
        ...(isPaid ? 
            textToBytes("PAID\n") : 
            isComplementary ? 
            textToBytes("COMPLEMENTARY\n") : 
            []),
        
        ...textToBytes("\x1B\x21\x08"), // Double height
        ...textToBytes(`${orderDetails.outlet_name || "Restaurant"}\n`),
        ...textToBytes("\x1B\x21\x00"), // Normal height
        ...textToBytes(`${orderDetails.outlet_address || ""}\n`),
        ...textToBytes(
          `${
            orderDetails.outlet_mobile
              ? `${orderDetails.outlet_mobile}\n`
              : ""
          }`
        ),
        
        ...textToBytes("\x1B\x61\x00"), // Left align
        ...textToBytes(`Bill Number: ${orderDetails.order_number}\n`),
        ...textToBytes(
          orderDetails.order_type === "dine-in"
            ? `Table: ${orderDetails.section || ""} - ${orderDetails.table_number ? orderDetails.table_number[0] : ""}\n`
            : `Type: ${
                orderDetails.order_type?.charAt(0).toUpperCase() +
                orderDetails.order_type?.slice(1) || "Takeaway"
              }\n`
        ),
        ...textToBytes(`DateTime: ${formattedDateTime}\n`),
        
        // Add customer details if available
        ...(orderDetails.customer_name ? 
          textToBytes(`Customer: ${orderDetails.customer_name}\n`) : 
          []),
        
        // Display payment method if paid and method exists
        ...((isPaid) && orderDetails.payment_method ? 
          textToBytes(`Payment: ${orderDetails.payment_method.toString().toUpperCase()}\n`) : 
          []),
        
        ...textToBytes(getDottedLine()),
        ...textToBytes("Item            Qty  Rate    Amount\n"),
        ...textToBytes(getDottedLine()),
        
        // Menu items
        ...menuItems.flatMap((item) =>
          textToBytes(formatMenuItem(item))
        ),
        ...textToBytes(getDottedLine()),
        
        // Amount section
        ...textToBytes(formatAmountLine("Total", subtotal)),

        // Discount if it exists
        ...(discount > 0 ? 
          textToBytes(formatAmountLine(`Discount(${discountPercent}%)`, discount, "-"))
          : []),

        // Special discount if it exists
        ...(specialDiscount > 0 ? 
          textToBytes(formatAmountLine("Special Discount", specialDiscount, "-"))
          : []),

        // Extra charges if they exist
        ...(extraCharges > 0 ? 
          textToBytes(formatAmountLine("Extra Charges", extraCharges, "+"))
          : []),

        ...textToBytes(formatAmountLine("Subtotal", totalWithDiscount)),

        // Service charges if they exist
        ...(serviceCharges > 0 ? 
          textToBytes(formatAmountLine(`Service Ch.(${serviceChargesPercent}%)`, serviceCharges, "+"))
          : []),

        // GST if it exists
        ...(gstAmount > 0 ? 
          textToBytes(formatAmountLine(`GST(${gstPercent}%)`, gstAmount, "+"))
          : []),

        // Tip if it exists
        ...(tip > 0 ? 
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
        ...textToBytes(`Scan to Pay ${finalGrandTotal.toFixed(2)}\n\n`),
        ...textToBytes("\n"),
        ...textToBytes("-----Thank You Visit Again!-----\n"),
        ...textToBytes("https://menumitra.com/\n"),
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper
      ];

      console.log("Sending receipt commands:", commands.length, "bytes");
      await sendDataToPrinter(commands);
      return true;
    } catch (error) {
      console.error("Receipt printing error:", error);
      throw error;
    }
  };

  const generateKOTHTML = (orderDetails, menuItems) => {
    try {
      const isCancelled = orderDetails.order_status?.toLowerCase() === "cancelled";
      
      const items = menuItems
        .map(
          (item) => `
      <tr>
        <td style="text-align: left; ${isCancelled ? 'text-decoration: line-through;' : ''}">${item.menu_name}${item.half_or_full ? ` (${item.half_or_full})` : ''}</td>
        <td style="text-align: center; ${isCancelled ? 'text-decoration: line-through;' : ''}">${item.quantity}</td>
        ${item.comment ? `<td style="text-align: left; font-style: italic; color: #666; ${isCancelled ? 'text-decoration: line-through;' : ''}">Note: ${item.comment}</td>` : '<td></td>'}
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
            position: relative;
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
          .kot-title {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 10px 0;
            border: 2px solid black;
            padding: 5px;
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
          .cancelled-watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 40px;
            font-weight: bold;
            color: rgba(255, 0, 0, 0.2);
            z-index: 1000;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        ${isCancelled ? '<div class="cancelled-watermark">CANCELLED</div>' : ''}
        
        <div class="kot-title">${orderDetails.outlet_name}</div>

        <div class="order-info">
          <strong>Order:</strong> #${orderDetails.order_number}<br>
          <strong>Table:</strong> ${orderDetails.section} - ${orderDetails.table_number[0]}<br>
          <strong>Time:</strong> ${orderDetails.datetime}<br>
          <strong>Items:</strong> ${menuItems.length}
          ${orderDetails.order_status ? `<br><strong>Status:</strong> ${orderDetails.order_status.toUpperCase()}` : ''}
        </div>

        <div class="dotted-line"></div>

        <table>
          <tr>
            <th style="text-align: left;">Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: left;">Notes</th>
          </tr>
          ${items}
        </table>

        <div class="dotted-line"></div>
        
        ${isCancelled ? '<div style="text-align: center; margin-top: 15px; font-weight: bold; color: red;">*** ORDER CANCELLED ***</div>' : ''}
      </body>
    </html>
    `;
    } catch (error) {
      console.error("Error generating KOT HTML:", error);
      throw error;
    }
  };

  const printKOT = async () => {
    try {
      if (!printerDevice || !isConnected) {
        throw new Error("No printer connected");
      }

      // Calculate total quantity of all items
      const totalQuantity = menuItems.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

      // Format the current date and time
      const formattedDateTime = getCurrentDateTime();

      // Get outlet mobile from order details
      const outletMobile = orderDetails.outlet_mobile || "";

      // Build KOT printing commands exactly like owner app
      const commands = [
        ...COMMANDS.INITIALIZE,
        ...textToBytes("\x1B\x61\x01"), // Center alignment
        ...textToBytes("\x1D\x21\x11"), // Double width and height
        ...textToBytes("KOT\n"),
        ...textToBytes("\x1D\x21\x00"), // Normal size
        ...textToBytes(`${orderDetails.outlet_name || "Restaurant"}\n`),
        ...textToBytes(`${orderDetails.outlet_address || ""}\n`),
        ...textToBytes(`${orderDetails.outlet_mobile ? `${orderDetails.outlet_mobile}\n` : ""}`),
        
        ...textToBytes("\x1B\x61\x00"), // Left align
        ...textToBytes(`Bill Number: ${orderDetails.order_number}\n`),
        ...textToBytes(
          orderDetails.order_type === "dine-in"
            ? `Table: ${orderDetails.section || ""} - ${orderDetails.table_number ? orderDetails.table_number[0] : ""}\n`
            : `Type: ${
                orderDetails.order_type?.charAt(0).toUpperCase() +
                orderDetails.order_type?.slice(1) || "Takeaway"
              }\n`
        ),
        ...textToBytes(`DateTime: ${formattedDateTime}\n`),
        ...textToBytes("--------------------------------\n"),

        // Column headers
        ...textToBytes("Item                      Qty\n"),
        ...textToBytes("--------------------------------\n"),

        // Menu items - simplified format with just name and quantity
        ...menuItems.flatMap(item => {
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
        }),

        ...textToBytes("--------------------------------\n"),
        // Align "Total Items" with the quantity column by padding to 23 chars
        ...textToBytes(`${"Total Items:".padEnd(23)} ${totalQuantity}\n`),
        ...textToBytes("\n"),
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper with specific command matching owner app
      ];

      // Send to printer
      console.log("Sending KOT commands:", commands.length, "bytes");
      await sendDataToPrinter(commands);
      
      return true;
    } catch (error) {
      console.error("KOT printing error:", error);
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
        <Modal.Header>
          <HStack space={0}>
            <Text>Order Timeline - #</Text>
            <Text>{orderDetails?.order_number}</Text>
          </HStack>
        </Modal.Header>
        <Modal.Body>
          <VStack space={4}>
            {data.map((item, index) => (
              <HStack key={item.order_time_line_id} space={3} alignItems="flex-start">
                <VStack alignItems="center" space={0}>
                  <Box
                    w="12px"
                    h="12px"
                    rounded="full"
                    bg={
                      item.order_status?.toLowerCase() === "cooking"
                        ? ORDER_STATUS_COLORS.COOKING
                        : item.order_status?.toLowerCase() === "served"
                        ? ORDER_STATUS_COLORS.SERVED
                        : item.order_status?.toLowerCase() === "paid"
                        ? ORDER_STATUS_COLORS.PAID
                        : item.order_status?.toLowerCase() === "placed"
                        ? ORDER_STATUS_COLORS.PLACED
                        : item.order_status?.toLowerCase() === "cancelled"
                        ? ORDER_STATUS_COLORS.CANCELLED
                        : ORDER_STATUS_COLORS.DEFAULT
                    }
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
                    Status: <Text 
                      fontWeight="semibold" 
                      textTransform="capitalize"
                      color={
                        item.order_status?.toLowerCase() === "cooking"
                          ? "orange.600"
                          : item.order_status?.toLowerCase() === "served"
                          ? "green.600"
                          : item.order_status?.toLowerCase() === "paid"
                          ? "purple.600" 
                          : item.order_status?.toLowerCase() === "placed"
                          ? "blue.600"
                          : item.order_status?.toLowerCase() === "cancelled"
                          ? "red.600"
                          : "gray.600"
                      }
                    >
                      {item.order_status}
                  </Text>
                  </Text>
                  {item.reason && (
                    <Text color="gray.600">
                      Reason: <Text fontStyle="italic">{item.reason}</Text>
                    </Text>
                  )}
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

  // Add PrinterStatusIndicator component
  const PrinterStatusIndicator = () => (
    <Pressable
      onPress={() => {
        if (isConnected && printerDevice) {
          Alert.alert(
            "Printer Connected",
            `Connected to: ${printerDevice?.name || "Printer"}`,
            [
              {
                text: "Disconnect",
                style: "destructive",
                onPress: async () => {
                  try {
                    await printerDevice.cancelConnection();
                    setPrinterDevice(null);
                    setIsConnected(false);
                    toast.show({
                      description: "Printer disconnected",
                      status: "success",
                      duration: 3000,
                      placement: "bottom"
                    });
                  } catch (error) {
                    console.error("Error disconnecting printer:", error);
                  }
                }
              },
              { text: "OK" }
            ]
          );
        } else {
          setIsModalVisible(true);
          scanForPrinters();
        }
      }}
    >
      <HStack 
        alignItems="center" 
        justifyContent="center" 
        bg={isConnected && printerDevice ? "green.100" : "red.100"} 
        p={1} 
        px={2} 
        rounded="full"
      >
        <Icon 
          as={MaterialIcons} 
          name={isConnected && printerDevice ? "bluetooth-connected" : "bluetooth-disabled"} 
          size="sm" 
          color={isConnected && printerDevice ? "green.600" : "red.600"} 
        />
        <Text fontSize="xs" ml={1} color={isConnected && printerDevice ? "green.600" : "red.600"}>
          {isConnected && printerDevice ? "Printer Connected" : "No Printer"}
        </Text>
      </HStack>
    </Pressable>
  );

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
          <HStack space={2} alignItems="center">
            <PrinterStatusIndicator />
            {orderDetails && 
            orderDetails.order_status?.toLowerCase() !== "paid" && 
            orderDetails.order_status?.toLowerCase() !== "cancelled" ? (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon as={MaterialIcons} name="edit" size="sm" />}
                onPress={() => router.push({
                  pathname: "/screens/orders/menu-selection",
                  params: {
                    tableId: orderDetails.table_number?.[0],
                    tableNumber: orderDetails.table_number?.[0],
                    sectionId: orderDetails.section_id,
                    sectionName: orderDetails.section,
                    outletId: orderDetails.outlet_id,
                    orderId: orderDetails.order_id,
                    orderNumber: orderDetails.order_number,
                    orderType: orderDetails.order_type || "dine-in",
                    isOccupied: "1",
                    orderDetails: JSON.stringify({
                      order_id: orderDetails.order_id,
                      menu_items: menuItems.map(item => ({
                        menu_id: item.menu_id,
                        menu_name: item.menu_name,
                        name: item.menu_name,
                        price: parseFloat(item.price),
                        quantity: parseInt(item.quantity),
                        half_price: item.half_price || 0,
                        full_price: item.full_price || item.price,
                        portionSize: item.half_or_full === "half" ? "Half" : "Full",
                        offer: parseFloat(item.offer || 0),
                        specialInstructions: item.comment || "",
                        total_price: parseFloat(item.menu_sub_total),
                      })),
                      grand_total: orderDetails.grand_total,
                      table_id: orderDetails.table_number?.[0],
                      table_number: orderDetails.table_number?.[0],
                      section_id: orderDetails.section_id,
                      section_name: orderDetails.section,
                      outlet_id: orderDetails.outlet_id,
                    }),
                  },
                })}
              >
                Edit
              </Button>
            ) : null}
          </HStack>
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
                  bg={
                    orderDetails.order_status?.toLowerCase() === "cooking"
                      ? ORDER_STATUS_COLORS.COOKING
                      : orderDetails.order_status?.toLowerCase() === "served"
                      ? ORDER_STATUS_COLORS.SERVED
                      : orderDetails.order_status?.toLowerCase() === "paid"
                      ? ORDER_STATUS_COLORS.PAID
                      : orderDetails.order_status?.toLowerCase() === "placed"
                      ? ORDER_STATUS_COLORS.PLACED
                      : orderDetails.order_status?.toLowerCase() === "cancelled"
                      ? ORDER_STATUS_COLORS.CANCELLED
                      : ORDER_STATUS_COLORS.DEFAULT
                  }
                  _text={{
                    color: "white",
                    fontWeight: "bold"
                  }}
                >
                  {orderDetails.order_status?.toUpperCase()}
                </Badge>
                <Button
                  size="sm"
                  variant="subtle"
                  leftIcon={<Icon as={MaterialIcons} name="timeline" size="sm" />}
                  onPress={() => setIsTimelineModalVisible(true)}
                >
                  View Timeline
                </Button>
              </VStack>
            </HStack>
            
            {/* Display cancellation reason if order is cancelled */}
            {orderDetails.order_status?.toLowerCase() === "cancelled" && orderDetails.cancel_reason && (
              <Box bg="red.50" p={2} rounded="md" mt={2}>
                <HStack space={2} alignItems="center">
                  <Icon as={MaterialIcons} name="info" color="red.500" size="sm" />
                  <Text color="red.600" fontWeight="medium">
                    Reason: {orderDetails.cancel_reason}
                  </Text>
                </HStack>
              </Box>
            )}
            
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
              Menu Count{" "}
              <Text color="coolGray.600" fontSize="sm">
                ({menuItems.length} {menuItems.length === 1 ? "item" : "items"})
              </Text>
            </Heading>
            
          </HStack>
          <VStack space={4}>
            {menuItems.map((item, index) => (
              <Box
                key={index}
                borderBottomWidth={index !== menuItems.length - 1 ? 1 : 0}
                borderColor="coolGray.200"
                pb={index !== menuItems.length - 1 ? 4 : 0}
                opacity={orderDetails.order_status?.toLowerCase() === "cancelled" ? 0.6 : 1}
              >
                <HStack justifyContent="space-between" alignItems="flex-start">
                  <VStack flex={1} space={1}>
                    <Text 
                      fontSize="md" 
                      fontWeight="bold"
                      textDecorationLine={orderDetails.order_status?.toLowerCase() === "cancelled" ? "line-through" : "none"}
                    >
                      {item.menu_name}{" "}
                      <Text 
                        fontSize="sm" 
                        color="coolGray.600"
                        textDecorationLine={orderDetails.order_status?.toLowerCase() === "cancelled" ? "line-through" : "none"}
                      >
                        ({item.quantity})
                      </Text>
                      {item.half_or_full && (
                        <Text 
                          fontSize="sm" 
                          color="coolGray.600"
                          textDecorationLine={orderDetails.order_status?.toLowerCase() === "cancelled" ? "line-through" : "none"}
                        >
                          {" "}
                          - {item.half_or_full}
                        </Text>
                      )}
                    </Text>
                    {item.comment && (
                      <Text 
                        fontSize="sm" 
                        color="coolGray.600" 
                        italic
                        textDecorationLine={orderDetails.order_status?.toLowerCase() === "cancelled" ? "line-through" : "none"}
                      >
                        Special Instructions: {item.comment}
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
          {/* <Heading size="sm" mb={4}>Bill Details</Heading> */}
          <VStack space={3}>
            {/* Items Total */}
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Total</Text>
              <Text>₹{Number(orderDetails.total_bill_amount || 0).toFixed(2)}</Text>
            </HStack>

            {/* Total Discounts Section */}
            {(Number(orderDetails.discount_amount) > 0 || Number(orderDetails.special_discount) > 0) && (
              <VStack space={2}>
                {Number(orderDetails.discount_amount) > 0 && (
                  <HStack justifyContent="space-between">
                    <Text color="red.600">Discount ({orderDetails.discount_percent}%)</Text>
                    <Text color="red.600">-₹{Number(orderDetails.discount_amount).toFixed(2)}</Text>
                  </HStack>
                )}
                {Number(orderDetails.special_discount) > 0 && (
                  <HStack justifyContent="space-between">
                    <Text color="red.600">Special Discount</Text>
                    <Text color="red.600">-₹{Number(orderDetails.special_discount).toFixed(2)}</Text>
                  </HStack>
                )}
                
              </VStack>
            )}

            {/* Extra Charges - Always show this section */}
            <VStack space={2}>
              {Number(orderDetails.charges || 0) > 0 && (
                <HStack justifyContent="space-between">
                  <Text color="green.600">Extra Charges</Text>
                  <Text color="green.600">+₹{Number(orderDetails.charges || 0).toFixed(2)}</Text>
                </HStack>
              )}

              <HStack justifyContent="space-between" pt={2} borderTopWidth={1} borderColor="coolGray.200">
                <Text fontWeight="medium">Subtotal </Text>
                <Text fontWeight="medium">
                  ₹{(
                    Number(orderDetails.total_bill_amount || 0) -
                    Number(orderDetails.discount_amount || 0) -
                    Number(orderDetails.special_discount || 0) +
                    Number(orderDetails.charges || 0)
                  ).toFixed(2)}
                </Text>
              </HStack>
            </VStack>

            {/* Service Charge (calculated on subtotal) */}
            {Number(orderDetails.service_charges_amount) > 0 && (
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Service Charges ({orderDetails.service_charges_percent}%)</Text>
                <Text color="green.600">+₹{Number(orderDetails.service_charges_amount).toFixed(2)}</Text>
              </HStack>
            )}

        

            {/* GST */}
            {Number(orderDetails.gst_amount) > 0 && (
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">GST ({orderDetails.gst_percent}%)</Text>
                <Text color="green.600">+₹{Number(orderDetails.gst_amount).toFixed(2)}</Text>
              </HStack>
            )}

            {/* Tip */}
            {Number(orderDetails.tip) > 0 && (
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Tip</Text>
                <Text color="green.600">+₹{Number(orderDetails.tip).toFixed(2)}</Text>
              </HStack>
            )}

            {/* Grand Total */}
            <HStack justifyContent="space-between" pt={3} mt={2} borderTopWidth={2} borderColor="coolGray.200">
              <Text fontSize="lg" fontWeight="bold">Final Grand Total</Text>
              <Text fontSize="lg" fontWeight="bold">
                ₹{(
                  Number(orderDetails.total_bill_amount || 0) -
                  Number(orderDetails.discount_amount || 0) -
                  Number(orderDetails.special_discount || 0) +
                  Number(orderDetails.charges || 0) +
                  Number(orderDetails.service_charges_amount || 0) +
                  Number(orderDetails.gst_amount || 0) +
                  Number(orderDetails.tip || 0)
                ).toFixed(2)}
              </Text>
            </HStack>

            {/* Payment Status */}
            {orderDetails.is_paid === "paid" && (
              <HStack justifyContent="space-between" mt={2} bg="green.50" p={2} rounded="md">
                <Text color="green.600" fontWeight="medium">Payment Status</Text>
                <Text color="green.600" fontWeight="medium">
                  PAID ({orderDetails.payment_method?.toUpperCase() || "CASH"})
                </Text>
              </HStack>
            )}
          </VStack>
        </Box>

        {/* Status Action Button */}
        <Box px={4} pb={4}>
          <StatusActionButton />

          {/* Print Buttons */}
          <HStack space={2} mt={2}>
            <Button
              flex={1}
              variant="outline"
              leftIcon={<Icon as={MaterialIcons} name="receipt-long" size="sm" />}
              onPress={() => handlePrint("KOT")}
              isLoading={loadingMessage === "Printing KOT..."}
              isDisabled={isLoading}
            >
              Print KOT
            </Button>
            <Button
              flex={1}
              variant="outline"
              leftIcon={<Icon as={MaterialIcons} name="print" size="sm" />}
              onPress={() => handlePrint("receipt")}
              isLoading={loadingMessage === "Printing receipt..."}
              isDisabled={isLoading}
            >
              Print Receipt
            </Button>
          </HStack>
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

      {/* Cancel Order Modal */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)}>
        <Modal.Content maxWidth="90%" maxHeight="80%">
          <Modal.Header>Cancel Order</Modal.Header>
          <Modal.Body>
            <FormControl>
              <FormControl.Label>Reason for Cancellation</FormControl.Label>
              <Input
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Enter reason for cancellation"
              />
            </FormControl>
          </Modal.Body>
          <Modal.Footer>
            <Button.Group space={2}>
              <Button
                variant="ghost"
                colorScheme="blueGray"
                onPress={() => setShowCancelModal(false)}
              >
                Back
              </Button>
              <Button 
                colorScheme="red"
                onPress={handleCancelOrder}
              >
                Cancel Order
              </Button>
            </Button.Group>
          </Modal.Footer>
        </Modal.Content>
      </Modal>

      {/* Payment Method Selection Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)}>
        <Modal.Content maxWidth="90%" borderRadius="md">
          <Modal.Body p={4}>
            <Text fontSize="16" fontWeight="medium" color="gray.700" mb={4}>
              Select Payment Method
            </Text>
            
            <VStack space={4} mb={4}>
              <HStack alignItems="center" space={2}>
                <Pressable 
                  onPress={() => setSelectedPaymentMethod("cash")}
                  flex={1}
                >
                  <HStack alignItems="center" space={2}>
                    <Box 
                      size="20px" 
                      borderRadius="full" 
                      borderWidth="2px" 
                      borderColor="gray.400"
                      alignItems="center"
                      justifyContent="center"
                      bg={selectedPaymentMethod === "cash" ? "#00B5D8" : "white"}
                    >
                      {selectedPaymentMethod === "cash" && (
                        <Box size="10px" borderRadius="full" bg="white" />
                      )}
                    </Box>
                    <Text color={selectedPaymentMethod === "cash" ? "#00B5D8" : "gray.700"} fontWeight={selectedPaymentMethod === "cash" ? "bold" : "normal"}>CASH</Text>
                  </HStack>
                </Pressable>

                <Pressable 
                  onPress={() => setSelectedPaymentMethod("upi")}
                  flex={1}
                >
                  <HStack alignItems="center" space={2}>
                    <Box 
                      size="20px" 
                      borderRadius="full" 
                      borderWidth="2px" 
                      borderColor="gray.400"
                      alignItems="center"
                      justifyContent="center"
                      bg={selectedPaymentMethod === "upi" ? "#00B5D8" : "white"}
                    >
                      {selectedPaymentMethod === "upi" && (
                        <Box size="10px" borderRadius="full" bg="white" />
                      )}
                    </Box>
                    <Text color={selectedPaymentMethod === "upi" ? "#00B5D8" : "gray.700"} fontWeight={selectedPaymentMethod === "upi" ? "bold" : "normal"}>UPI</Text>
                  </HStack>
                </Pressable>

                <Pressable 
                  onPress={() => setSelectedPaymentMethod("card")}
                  flex={1}
                >
                  <HStack alignItems="center" space={2}>
                    <Box 
                      size="20px" 
                      borderRadius="full" 
                      borderWidth="2px" 
                      borderColor="gray.400"
                      alignItems="center"
                      justifyContent="center"
                      bg={selectedPaymentMethod === "card" ? "#00B5D8" : "white"}
                    >
                      {selectedPaymentMethod === "card" && (
                        <Box size="10px" borderRadius="full" bg="white" />
                      )}
                    </Box>
                    <Text color={selectedPaymentMethod === "card" ? "#00B5D8" : "gray.700"} fontWeight={selectedPaymentMethod === "card" ? "bold" : "normal"}>CARD</Text>
                  </HStack>
                </Pressable>
              </HStack>
            </VStack>
            
            <Button 
              w="full"
              onPress={() => {
                handleStatusUpdate("paid", { payment_method: selectedPaymentMethod });
                setShowPaymentModal(false);
              }}
              py={3}
              bg="gray.200"
              _text={{ color: "gray.700" }}
              leftIcon={<Icon as={MaterialIcons} name="check" size="sm" color="gray.700" />}
              _pressed={{ bg: "gray.300" }}
              borderRadius="md"
              isDisabled={!selectedPaymentMethod}
              opacity={selectedPaymentMethod ? 1 : 0.6}
            >
              Settle Order
            </Button>
          </Modal.Body>
        </Modal.Content>
      </Modal>

      <PrinterStatusIndicator />
    </Box>
  );
}
