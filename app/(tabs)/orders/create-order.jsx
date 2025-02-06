import React, { useState, useEffect } from "react";
import {
  TouchableWithoutFeedback,
  Keyboard,
  BackHandler,
  Platform,
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
} from "native-base";

import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../components/Header";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { sendNotificationToWaiter } from "../../../services/NotificationService";
import { getBaseUrl } from "../../../config/api.config";
import * as Print from "expo-print";

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
    if (isLoading) return;

    try {
      setIsLoading(true);
      setLoadingMessage("Processing KOT...");

      // First create/update the order
      await createOrder("print");

      // Generate and print receipt
      try {
        await Print.printAsync({
          html: generateKOTHTML(),
          orientation: "portrait",
        });

        // Close any existing toasts before showing new one
        toast.closeAll();
        toast.show({
          description: "KOT printed successfully",
          status: "success",
          duration: 1500,
          isClosable: true, // Allow manual closing
          onCloseComplete: () => toast.closeAll(), // Ensure toast is removed
        });
      } catch (printError) {
        console.error("Printing failed:", printError);
        toast.closeAll();
        toast.show({
          description: "Failed to print KOT. Please check printer connection.",
          status: "error",
          duration: 2000,
          isClosable: true,
          onCloseComplete: () => toast.closeAll(),
        });
      }
    } catch (error) {
      console.error("Error processing KOT:", error);
      toast.closeAll();
      toast.show({
        description: "Failed to process KOT",
        status: "error",
        duration: 2000,
        isClosable: true,
        onCloseComplete: () => toast.closeAll(),
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const generateKOTHTML = () => {
    // Generate HTML for KOT receipt
    const items = selectedItems
      .map(
        (item) => `
        <tr>
          <td style="width: 35%; text-align: left;">${item.menu_name}</td>
          <td style="width: 15%; text-align: center;">${item.quantity}</td>
          <td style="width: 15%; text-align: right;">₹${
            // For existing orders, use price from API response
            item.price ||
            (item.portionSize === "Half" ? item.half_price : item.full_price) ||
            0
          }</td>
          <td style="width: 20%; text-align: right;">₹${(
            (item.price ||
              (item.portionSize === "Half"
                ? item.half_price
                : item.full_price) ||
              0) * item.quantity
          ).toFixed(2)}</td>
          <td style="width: 15%; text-align: left;">${
            item.specialInstructions || "-"
          }</td>
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
            body { 
              font-family: 'Helvetica'; 
              padding: 20px;
              max-width: 300px;
              margin: 0 auto;
            }
            h1 { font-size: 24px; text-align: center; margin-bottom: 20px; }
            h2 { font-size: 18px; text-align: center; margin-bottom: 15px; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              font-size: 14px;
            }
            th, td { padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; }
            .total-section {
              border-top: 1px dashed #000;
              margin-top: 20px;
              padding-top: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 14px;
            }
            .grand-total {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              margin-top: 10px;
              padding: 10px 0;
              font-weight: bold;
            }
            .header-info {
              text-align: center;
              margin-bottom: 20px;
              font-size: 14px;
            }
            .footer-info {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <h1>MenuMitra</h1>
          <h2>Kitchen Order Ticket</h2>
          
          <div class="header-info">
            ${
              !params?.isSpecialOrder
                ? `<p>Table: ${params.sectionName} - ${params.tableNumber}</p>`
                : `<p>Order Type: ${orderTypeMap[params.orderType]}</p>`
            }
            <p>Order Date: ${new Date().toLocaleString()}</p>
            ${params?.orderId ? `<p>Order ID: ${params.orderId}</p>` : ""}
          </div>

          <table>
            <thead>
              <tr style="border-top: 1px dashed #000; border-bottom: 1px dashed #000;">
                <th style="width: 35%; text-align: left;">Item</th>
                <th style="width: 15%; text-align: center;">Qty</th>
                <th style="width: 15%; text-align: right;">Rate</th>
                <th style="width: 20%; text-align: right;">Amount</th>
                <th style="width: 15%; text-align: left;">Note</th>
              </tr>
            </thead>
            <tbody>
              ${items}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₹${subtotal.toFixed(2)}</span>
            </div>
            
            <div class="total-row">
              <span>Discount:</span>
              <span>-₹${discount.toFixed(2)}</span>
            </div>

            <div class="total-row">
              <span>Service Charge (${serviceChargePercentage}%):</span>
              <span>₹${serviceChargesAmount.toFixed(2)}</span>
            </div>

            <div class="total-row">
              <span>GST (${gstPercentage}%):</span>
              <span>₹${gstAmount.toFixed(2)}</span>
            </div>

            <div class="total-row grand-total">
              <span>Grand Total:</span>
              <span>₹${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer-info">
            <p>Thank you for your order!</p>
            <p>Powered by MenuMitra</p>
            <p>${new Date().toLocaleString()}</p>
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

      // Common headers for all requests
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      // Prepare common order items structure with prices
      const orderItems = selectedItems.map((item) => ({
        menu_id: item.menu_id.toString(),
        quantity: item.quantity,
        comment: item.specialInstructions || "",
        half_or_full: (item.portionSize || "full").toLowerCase(),
        price:
          item.price ||
          (item.portionSize === "Half" ? item.half_price : item.full_price),
        total_price:
          (item.price ||
            (item.portionSize === "Half" ? item.half_price : item.full_price)) *
          item.quantity,
      }));

      // Calculate total amount
      const grandTotal = calculateTotal(
        selectedItems,
        serviceChargePercentage,
        gstPercentage
      );

      // For existing orders
      if (params?.orderId) {
        setLoadingMessage("Marking order as paid...");
        const paidResponse = await fetch(
          `${getBaseUrl()}/update_order_status`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              outlet_id: storedOutletId.toString(),
              order_id: params.orderId.toString(),
              order_status: "paid",
              user_id: storedUserId.toString(),
              action: "settle",
              grand_total: grandTotal.toFixed(2),
              service_charges_percent: serviceChargePercentage,
              gst_percent: gstPercentage,
            }),
          }
        );

        const paidResult = await paidResponse.json();
        console.log("Paid Result:", paidResult); // Debug log

        if (paidResult.st !== 1) {
          throw new Error(paidResult.msg || "Failed to mark as paid");
        }

        // Clear states and navigate
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
        return;
      } else if (params?.isSpecialOrder) {
        setLoadingMessage("Creating special order...");
        const createPayload = {
          captain_id: storedCaptainId.toString(),
          outlet_id: storedOutletId.toString(),
          user_id: storedUserId.toString(),
          order_type: params.orderType.toLowerCase(),
          order_items: orderItems,
          action: "settle",
          grand_total: grandTotal.toFixed(2),
          service_charges_percent: serviceChargePercentage,
          gst_percent: gstPercentage,
        };

        const createResponse = await fetch(`${getBaseUrl()}/create_order`, {
          method: "POST",
          headers,
          body: JSON.stringify(createPayload),
        });

        const createResult = await createResponse.json();
        console.log("Create Result:", createResult); // Debug log

        if (createResult.st !== 1) {
          throw new Error(createResult.msg || "Failed to create order");
        }

        // Mark as paid with the same headers
        setLoadingMessage("Marking order as paid...");
        const paidPayload = {
          outlet_id: storedOutletId.toString(),
          order_id: createResult.order_id.toString(),
          order_status: "paid",
          user_id: storedUserId.toString(),
          action: "settle",
          grand_total: grandTotal.toFixed(2),
          service_charges_percent: serviceChargePercentage,
          gst_percent: gstPercentage,
        };

        const paidResponse = await fetch(
          `${getBaseUrl()}/update_order_status`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(paidPayload),
          }
        );

        const paidResult = await paidResponse.json();
        console.log("Paid Result:", paidResult); // Debug log

        if (paidResult.st !== 1) {
          throw new Error(paidResult.msg || "Failed to mark as paid");
        }
      } else {
        // Handle regular table orders
        setLoadingMessage("Creating new order...");
        const createPayload = {
          captain_id: storedCaptainId.toString(),
          outlet_id: storedOutletId.toString(),
          user_id: storedUserId.toString(),
          tables: [params.tableNumber.toString()],
          section_id: params.sectionId.toString(),
          order_type: "dine-in",
          order_items: orderItems,
          action: "settle",
          grand_total: grandTotal.toFixed(2),
          service_charges_percent: serviceChargePercentage,
          gst_percent: gstPercentage,
        };

        const createResponse = await fetch(`${getBaseUrl()}/create_order`, {
          method: "POST",
          headers,
          body: JSON.stringify(createPayload),
        });

        const createResult = await createResponse.json();
        console.log("Create Result:", createResult); // Debug log

        if (createResult.st !== 1) {
          throw new Error(createResult.msg || "Failed to create order");
        }

        // Mark as paid with the same headers
        setLoadingMessage("Marking order as paid...");
        const paidPayload = {
          outlet_id: storedOutletId.toString(),
          order_id: createResult.order_id.toString(),
          order_status: "paid",
          user_id: storedUserId.toString(),
          action: "settle",
          grand_total: grandTotal.toFixed(2),
          service_charges_percent: serviceChargePercentage,
          gst_percent: gstPercentage,
        };

        const paidResponse = await fetch(
          `${getBaseUrl()}/update_order_status`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(paidPayload),
          }
        );

        const paidResult = await paidResponse.json();
        console.log("Paid Result:", paidResult); // Debug log

        if (paidResult.st !== 1) {
          throw new Error(paidResult.msg || "Failed to mark as paid");
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
        description: "Order created and settled successfully",
        status: "success",
        duration: 2000,
      });

      // Navigate back to orders page
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
    return totalAfterDiscount + serviceCharges + gst;
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
              portionSize: item.half_or_full || "full",
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

                        <VStack alignItems="flex-end" space={2}>
                          <Select
                            selectedValue="Full"
                            minWidth="100"
                            accessibilityLabel="Choose portion"
                            placeholder="Choose portion"
                            onValueChange={(value) =>
                              handleAddItem(item, value)
                            }
                            _selectedItem={{
                              endIcon: (
                                <MaterialIcons
                                  name="check"
                                  size={16}
                                  color="gray"
                                />
                              ),
                            }}
                            dropdownIcon={
                              <MaterialIcons
                                name="arrow-drop-down"
                                size={24}
                                color="gray"
                              />
                            }
                            bg="white"
                          >
                            <Select.Item label="Full" value="Full" />
                            {Number(item.half_price) > 0 && (
                              <Select.Item label="Half" value="Half" />
                            )}
                          </Select>
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

                <HStack space={4} justifyContent="space-between">
                  <Button
                    bg="gray.400"
                    rounded="lg"
                    onPress={handleHold}
                    _pressed={{ bg: "gray.600" }}
                    isDisabled={isLoading}
                    isLoading={
                      isLoading && loadingMessage === "Saving order..."
                    }
                  >
                    {isLoading && loadingMessage === "Saving order..."
                      ? "Saving..."
                      : "Save"}
                  </Button>
                  <Button
                    flex={1}
                    variant="outline"
                    bg="black"
                    leftIcon={
                      <MaterialIcons name="receipt" size={20} color="white" />
                    }
                    onPress={handleKOT}
                    _text={{ color: "white" }}
                    isDisabled={isLoading}
                    isLoading={
                      isLoading && loadingMessage === "Processing KOT..."
                    }
                  >
                    {isLoading && loadingMessage === "Processing KOT..."
                      ? "Processing..."
                      : "Print "}
                  </Button>
                  <Button
                    flex={1}
                    bg="blue.500"
                    leftIcon={
                      <MaterialIcons name="payment" size={20} color="white" />
                    }
                    onPress={handleSettle}
                    _pressed={{ bg: "blue.600" }}
                    isDisabled={isLoading}
                    isLoading={
                      isLoading && loadingMessage === "Settling order..."
                    }
                  >
                    {isLoading && loadingMessage === "Settling order..."
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
    </Box>
  );
}
