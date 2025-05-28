import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Image,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Alert,
  Platform,
  IntentLauncher,
  Linking,
  PermissionsAndroid,
  Modal,
  ScrollView,
  Keyboard,
  BackHandler,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,

} from "react-native";
import RemixIcon from "react-native-remix-icon";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import AsyncStorage
import CustomTabBar from "../CustomTabBar";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import axios from "axios";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import { getRestaurantConfig } from "../utils/RestaurantConfig";
import CustomHeader from "../../components/CustomHeader";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import WebService from "../utils/WebService";
import { getOwnerName, getRestaurantName } from "../utils/getOwnerData";
import logo from "../../assets/icons/table.png"; // Ensure the image is imported correctly
import phonepe from "../../assets/01.png";
import googlepay from "../../assets/02.jpg";
import paytm from "../../assets/03.jpg";
import amazonpe from "../../assets/04.jpg";
import upi from "../../assets/05.jpg";
import * as Device from "expo-device";
import { BleManager } from "react-native-ble-plx";
import base64 from "react-native-base64";
import Constants from "expo-constants";
import * as Application from "expo-application";
import { NetworkInfo } from "react-native-network-info";
import { useFocusEffect } from "@react-navigation/native";
// Add import for PrinterContext
import { usePrinter } from "../../contexts/PrinterContext";
import axiosInstance from "../../utils/axiosConfig";
// Import necessary module
import { CommonActions } from '@react-navigation/native';
import { getSettings } from '../../utils/getSettings';
import { AndroidManifest } from "expo-constants";
// Add the import for the PaymentModal component at the top with other imports
import PaymentModal from "../../components/PaymentModal";



// Printer Constants
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

const OrderCreate = ({ route, navigation }) => {
  const { tableData, cartItems: passedMenuItems } = route.params; // Access passed menu items
  const orderType = route.params?.orderType || "dine-in";
  const [cart, setCart] = useState([]);
  const [selectedPortion, setSelectedPortion] = useState("full");
  const [showPortionDropdown, setShowPortionDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [restaurantConfig, setRestaurantConfig] = useState({
    gst: "",
    service_charges: "",
  });
  const [discount, setDiscount] = useState(0); // Percentage value
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [printerList, setPrinterList] = useState([]);
  const [restaurantName, setRestaurantName] = useState("");
  const [newMenuItems, setNewMenuItems] = useState([]);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  // Add this state to track printer connection
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  // Add this to handle keyboard behavior
  const [isPOSTerminal, setIsPOSTerminal] = useState(false);
  const [posSDKInitialized, setPosSDKInitialized] = useState(false);

  // Add new state for refresh button loading
  const [isRefreshingCart, setIsRefreshingCart] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [printerDevice, setPrinterDevice] = useState(null);
  // Add missing isConnected state
  const [isConnected, setIsConnected] = useState(false);

  const existingOrderDetails = route.params?.existingOrderDetails;
  const [refreshing, setRefreshing] = useState(false);

  // Add this state at the top with other state declarations
  const [isSaving, setIsSaving] = useState(false);

  // Add these new state variables at the top of the component with other state declarations
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [specialDiscount, setSpecialDiscount] = useState('');
  const [extraCharges, setExtraCharges] = useState('');
  const [tip, setTip] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(''); 
  const [isPaid, setIsPaid] = useState(false); // Default to false for the main payment options section
  // First, add a new state for complementary
  const [isComplementary, setIsComplementary] = useState(false);

  // Add state for customer details if not already present
  const [customerDetails, setCustomerDetails] = useState({
    customer_name: "",
    customer_mobile: "",
    customer_alternate_mobile: "",
    customer_address: "",
    customer_landmark: ""
  });

  // Add these state variables near the top of your component, with the other state declarations
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [currentAction, setCurrentAction] = useState(null); // To track whether KOT or Settle was clicked

  // Add validation error states
  const [mobileError, setMobileError] = useState("");
  const [alternateMobileError, setAlternateMobileError] = useState("");

  const [bleManager] = useState(() => {
    // Only initialize BLE manager when not in Expo Go
    if (!Constants.appOwnership || Constants.appOwnership !== "expo") {
      return new BleManager();
    }
    return null;
  });

  // Add printer context
  const {
    isConnected: printerConnected,
    printerDevice: contextPrinterDevice,
    connectToPrinter: contextConnectPrinter,
    sendDataToPrinter
  } = usePrinter();

  // Sync local printer state with printer context
  useEffect(() => {
    // Keep local state in sync with context
    console.log("Printer Context Updated - Connection:", printerConnected);
    console.log("Printer Context Updated - Device:", contextPrinterDevice ? contextPrinterDevice.id : "none");
  }, [printerConnected, contextPrinterDevice]);

  // Add a ref to track initialization
  const cartInitializedRef = useRef(false);

  // Add code to pass cart data back when navigating back
  // Add this at the beginning of the component
  const { updateCartOnReturn } = route.params || {};

  // Then add a useEffect to handle navigation back
  useEffect(() => {
    // Ensure we have the callback and cart
    if (!updateCartOnReturn || !cart) return;
    
    // Create a listener for navigation events
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Explicitly pass the current cart back to DemoScreen
      console.log("Navigation back detected - sending cart data:", cart.length);
      updateCartOnReturn([...cart]); // Make sure to pass a new array copy
    });

    return unsubscribe;
  }, [navigation, cart, updateCartOnReturn]);

  // Replace the existing useLayoutEffect with this more robust version
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          style={{ marginLeft: 15 }}
          onPress={() => {
            // Explicitly send the cart back when pressing the back button
            navigation.navigate('DemoScreen', { returnedCart: cart });
          }}
        >
          <RemixIcon name="arrow-left-line" size={24} color="#000" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, cart]); // Make sure cart is a dependency

  // Add this function to handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigation.isFocused()) {
        // Pass cart back to DemoScreen when hardware back button is pressed
        navigation.navigate('DemoScreen', { returnedCart: cart });
        return true; // Prevent default back behavior since we handle navigation
      }
      return false;
    });

    return () => backHandler.remove();
  }, [navigation, cart]); // Make sure cart is a dependency

  // Update printer reconnection logic
  useFocusEffect(
    React.useCallback(() => {
      const restoreConnection = async () => {
        try {
          const lastPrinterId = await AsyncStorage.getItem(
            "lastConnectedPrinter"
          );
          if (lastPrinterId && bleManager && !isConnected && !isDisconnecting) {
            setLoadingMessage("Reconnecting to printer...");
            setIsLoading(true);

            const devices = await bleManager.devices([lastPrinterId]);
            const device = devices[0];

            if (device) {
              await contextConnectPrinter(device);
              setPrinterDevice(contextPrinterDevice);
              setIsConnected(printerConnected);
            }
          }
        } catch (error) {
          console.error("Error restoring printer connection:", error);
        } finally {
          setIsLoading(false);
          setLoadingMessage("");
        }
      };

      restoreConnection();
    }, [
      bleManager,
      isConnected,
      isDisconnecting,
      contextPrinterDevice,
      printerConnected,
    ])
  );

 

  // Replace the current cart initialization useEffect with this more robust version
  useEffect(() => {
    // Use a ref to track whether we've already initialized the cart
    // This prevents any future re-initializations
    if (!cartInitializedRef.current && route.params?.cartItems) {
      console.log("INITIAL CART SETUP from DemoScreen:", route.params.cartItems.length);
      
      // Set the cart directly from the passed items
      setCart(route.params.cartItems);
      
      // Track which items are new for proper API handling
      const newItems = route.params.cartItems.filter(item => item.isNewItem);
      setNewMenuItems(newItems);
      
      // Mark as initialized so we don't override it later
      cartInitializedRef.current = true;
    }
  }, [route.params?.cartItems]);

  // Update search effect
 

  const addToCart = (item) => {
    setSelectedItem(item);
    setShowPortionDropdown(true);
  };

  const handleAddToCartWithPortion = (item, portion) => {
    const price =
      portion === "half"
        ? parseFloat(item.half_price || item.price)
        : parseFloat(item.full_price || item.price);

    // Check if item with same menu_id and portion already exists in cart
    const existingItemIndex = cart.findIndex(
      (cartItem) =>
        cartItem.menu_id === item.menu_id && cartItem.portion === portion
    );

    if (existingItemIndex !== -1) {
      // Item exists, update quantity
      setCart((prevCart) =>
        prevCart.map((cartItem, index) => {
          if (index === existingItemIndex) {
            const newQuantity = Math.min(cartItem.quantity + 1, 20); // Limit to 20
            return {
              ...cartItem,
              quantity: newQuantity,
              total_price: price * newQuantity,
            };
          }
          return cartItem;
        })
      );
    } else {
      // Item doesn't exist, add new item
      const newItem = {
        ...item,
        portion: portion,
        price: price,
        quantity: 1,
        total_price: price,
        full_price: parseFloat(item.full_price || item.price),
        half_price: parseFloat(item.half_price || item.price),
        isNewItem: true,
      };

      setCart((prevCart) => [...prevCart, newItem]);
      setNewMenuItems((prev) => [...prev, newItem]);
    }

    setShowPortionDropdown(false);
    setSelectedItem(null);
  
    setMenuList([]);
    setFilteredMenuList([]);
  };

  // Add or update the onRefresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      // Only refresh settings as requested
      const appSettings = await getSettings();
      setSettings(appSettings);
      console.log("Settings refreshed on pull-to-refresh in OrderCreate");
    } catch (error) {
      console.error("Error refreshing settings in OrderCreate:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const renderRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <RemixIcon
          key={i}
          name={i <= rating ? "star-fill" : "star-line"}
          size={10}
          color="#FFD700"
        />
      );
    }
    return stars;
  };

  // Update quantity handlers
  const increaseQuantity = (menu_id, portion) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.menu_id === menu_id && item.portion === portion
          ? {
              ...item,
              quantity: Math.min(item.quantity + 1, 20),
              total_price:
                parseFloat(item.price) * Math.min(item.quantity + 1, 20),
            }
          : item
      )
    );
  };

  // Update the decreaseQuantity function to check for empty cart after removing items
  const decreaseQuantity = (menu_id, portion) => {
    setCart((prevCart) => {
      const updatedCart = prevCart
        .map((item) =>
          item.menu_id === menu_id && item.portion === portion
            ? {
                ...item,
                quantity: item.quantity - 1,
                total_price: parseFloat(item.price) * (item.quantity - 1),
              }
            : item
        )
        .filter(item => item.quantity > 0); // Remove items with quantity 0
      
      // Check if cart is now empty after this operation
      if (updatedCart.length === 0) {
        // Use setTimeout to navigate after state update is complete
        setTimeout(() => {
          navigation.navigate('DemoScreen', { returnedCart: [] });
        }, 0);
      }
      
      return updatedCart;
    });
  };

  // Calculate base total (total_bill_amount)
  const calculateTotal = () => {
    return parseFloat(
      cart.reduce((sum, item) => {
        const itemPrice =
          item.portion === "half" ? item.half_price : item.full_price;
        return sum + (parseFloat(itemPrice) || 0) * (parseInt(item.quantity) || 0);
      }, 0).toFixed(2)
    );
  };

  // Fix the menu discount calculation to properly use menu item offers
  const calculateMenuDiscount = () => {
    let totalMenuDiscount = 0;
    
    // Sum up all individual menu item discounts based on their offer percentage
    cart.forEach(item => {
      if (item.offer && item.offer > 0) {
        // Calculate discount for this specific item based on its offer percentage
        const itemTotal = item.price * item.quantity;
        const itemDiscount = (itemTotal * item.offer) / 100;
        totalMenuDiscount += itemDiscount;
      }
    });
    
    return parseFloat(totalMenuDiscount.toFixed(2));
  };

  // Calculate total after menu discount
  const calculateTotalAfterMenuDiscount = () => {
    // Base total from all items
    const totalBillAmount = cart.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      return sum + price * quantity;
    }, 0);
    
    // Menu discount amount
    const discountAmount = cart.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const offer = parseFloat(item.offer) || 0;
      const itemDiscount = (price * quantity * offer) / 100;
      return sum + itemDiscount;
    }, 0);
    
    return parseFloat((totalBillAmount - discountAmount).toFixed(2));
  };

  // Calculate total after special discount
  const calculateTotalAfterSpecialDiscount = () => {
    const totalAfterMenuDiscount = calculateTotalAfterMenuDiscount();
    const specialDiscountAmount = parseFloat(specialDiscount) || 0;
    return parseFloat((totalAfterMenuDiscount - specialDiscountAmount).toFixed(2));
  };

  // Fix the sequence of calculations to include extra charges in service charge
  // Calculate total after adding extra charges (this should come BEFORE service charge)
  const calculateTotalAfterExtraCharges = () => {
    const totalAfterSpecialDiscount = calculateTotalAfterSpecialDiscount();
    const extraChargesAmount = parseFloat(extraCharges) || 0;
    return parseFloat((totalAfterSpecialDiscount + extraChargesAmount).toFixed(2));
  };

  // Calculate service charge based on amount after ALL discounts AND extra charges
  const calculateService = () => {
    // Get the appropriate service charge percentage to use
    let serviceRate = 0;
    
    // First try to get rate from existing order, then from order details, then from config
    if (existingOrderDetails && existingOrderDetails.service_charges_percent !== undefined) {
      serviceRate = parseFloat(existingOrderDetails.service_charges_percent) || 0;
    } else if (orderDetails && orderDetails.service_charges_percent !== undefined) {
      serviceRate = parseFloat(orderDetails.service_charges_percent) || 0;
    } else {
      serviceRate = parseFloat(restaurantConfig.service_charges) || 0;
    }
    
    // Calculate based on current cart and values
    const totalAfterExtraCharges = calculateTotalAfterExtraCharges();
    return parseFloat(((totalAfterExtraCharges * serviceRate) / 100).toFixed(2));
  };

  // Calculate total after service charges
  const calculateTotalAfterService = () => {
    const totalAfterExtraCharges = calculateTotalAfterExtraCharges();
    const serviceCharge = calculateService();
    return parseFloat((totalAfterExtraCharges + serviceCharge).toFixed(2));
  };

  // Calculate GST based on amount after discounts, extra charges, and service
  const calculateGST = () => {
    // Get the appropriate GST percentage to use
    let gstRate = 0;
    
    // First try to get rate from existing order, then from order details, then from config
    if (existingOrderDetails && existingOrderDetails.gst_percent !== undefined) {
      gstRate = parseFloat(existingOrderDetails.gst_percent) || 0;
    } else if (orderDetails && orderDetails.gst_percent !== undefined) {
      gstRate = parseFloat(orderDetails.gst_percent) || 0;
    } else {
      gstRate = parseFloat(restaurantConfig.gst) || 0;
    }
    
    // Calculate based on current cart and values
    const totalAfterService = calculateTotalAfterService();
    return parseFloat(((totalAfterService * gstRate) / 100).toFixed(2));
  };

  // Fix grand total calculation to reflect the new calculation flow
  const calculateGrandTotal = () => {
    const totalAfterService = calculateTotalAfterService();
    const gstAmount = calculateGST();
    const tipAmount = parseFloat(tip) || 0;
    
    // Ensure final total is not negative
    return Math.max(0, parseFloat((totalAfterService + gstAmount + tipAmount).toFixed(2)));
  };

  // Calculate total discount (including menu discounts)
  const calculateTotalDiscount = () => {
    // Base total
    const totalBillAmount = cart.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      return sum + price * quantity;
    }, 0);
    
    // Total after all discounts but before extras
    const totalAfterSpecialDiscount = calculateTotalAfterSpecialDiscount();
    
    // Total discount is the difference
    return parseFloat((totalBillAmount - totalAfterSpecialDiscount).toFixed(2));
  };

  useEffect(() => {
    // Retrieve cart from AsyncStorage when the component mounts
    const loadCartFromStorage = async () => {
      try {
        const storedCart = await AsyncStorage.getItem("cart");
        if (storedCart) {
          setCart(JSON.parse(storedCart)); // Set the cart from AsyncStorage
        }
      } catch (error) {
        console.error("Error loading cart from AsyncStorage:", error);
      }
    };

    loadCartFromStorage();
  }, []); // Empty dependency array to run once on mount

  useEffect(() => {
    // Only try to load menu items if it's a dine-in order and tableData exists
    if (
      orderType === "dine-in" &&
      tableData &&
      tableData.is_occupied &&
      tableData.menu_items?.length > 0
    ) {
      const existingItems = tableData.menu_items.map((item) => ({
        ...item,
        menu_id: item.menu_id,
        name: item.name,
        price:
          item.portion === "half"
            ? parseFloat(item.half_price || 0)
            : parseFloat(item.full_price || 0),
        quantity: parseInt(item.quantity || 0, 10),
        total_price: parseFloat(item.total_price || 0),
        portion: item.half_or_full || "full",
      }));
      setCart(existingItems);
    }
  }, [tableData, orderType]);

  // Update removeFromCart function to handle existing items properly
  const removeFromCart = (menuId, portion) => {
    // Get the item to be removed
    const itemToRemove = cart.find(
      item => item.menu_id === menuId && item.portion === portion
    );
    
    // If it's an existing item, we need to track it as removed
    if (itemToRemove && itemToRemove.isExistingItem) {
      // You might want to add it to a "removedItems" array for tracking
      console.log("Removing existing item from order:", menuId, portion);
      // If you need to track removed items, add them to a state array
    }
    
    // Update the cart by filtering out the item
    setCart((prevCart) => {
      const updatedCart = prevCart.filter(
        (item) => !(item.menu_id === menuId && item.portion === portion)
      );
      
      // Check if cart is now empty after this operation
      if (updatedCart.length === 0) {
        // Use setTimeout to navigate after state update is complete
        setTimeout(() => {
          navigation.navigate('DemoScreen', { returnedCart: [] });
        }, 0);
      }
      
      return updatedCart;
    });
    
    // Also update newMenuItems if needed
    setNewMenuItems((prev) =>
      prev.filter(
        (item) => !(item.menu_id === menuId && item.portion === portion)
      )
    );
  };

  // Add clearCart function
  const clearCart = async () => {
    // Keep only the existing items in the cart
    const existingItems = cart.filter((item) => !item.isNewItem);
    setCart(existingItems);
    setNewMenuItems([]);
    try {
      await AsyncStorage.removeItem("cart");
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };
  const toTitleCase = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  const handleOrderSuccess = (orderNumber, message) => {
    // If this is a new order, store the order number in case we need it later
  
    
    // Show success message using Alert instead of Toast
    Alert.alert(
      "Success",
      message,
      [
        {
          text: "OK",
          onPress: () => {
            // Clear the cart
            setCart([]);
            // Navigate to tables view
            navigation.navigate("RestaurantTables");
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleSettleOrder = async (modalPaymentMethod = null, modalIsPaidValue = null) => {
    try {
      setIsLoading(true);
      setLoadingMessage("Processing order...");

      if (cart.length === 0) {
        Alert.alert("Error", "Please add items to cart before settling");
        return;
      }

      // Use modal values if provided, otherwise use main screen values
      const effectiveIsPaid = modalIsPaidValue !== null ? modalIsPaidValue : isPaid;
      let effectivePaymentMethod = modalPaymentMethod || paymentMethod;

      // Ensure payment method is normalized for API
      if (effectivePaymentMethod) {
        effectivePaymentMethod = effectivePaymentMethod.toLowerCase();
      }

      // Add validation for payment method when isPaid is true
      if (effectiveIsPaid && !effectivePaymentMethod) {
        Alert.alert("Error", "Please select a payment method");
        return;
      }

      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const orderItems = cart.map((item) => ({
        menu_id: item.menu_id.toString(),
        quantity: item.quantity.toString(),
        comment: item.specialInstructions || "",
        half_or_full: (item.portion || "full").toLowerCase(),
        price: item.price?.toString() || "0",
        total_price: item.total_price?.toString() || "0",
      }));

      // Determine payment status based on complementary and paid checkboxes
      const paymentStatus = effectiveIsPaid ? "paid" : (isComplementary ? "complementary" : "unpaid");
      
      // Base request body for all order types
      const baseRequestBody = {
        user_id: userId.toString(),
        outlet_id: restaurantId.toString(),
        order_type: orderType || "dine-in",
        order_items: orderItems,
        grand_total: orderItems
          .reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0)
          .toString(),
        action: "settle",
        is_paid: paymentStatus,
        payment_method: effectiveIsPaid && effectivePaymentMethod ? effectivePaymentMethod.toLowerCase() : "", // Convert to lowercase for API
        special_discount: safeNumberToString(specialDiscount),
        charges: safeNumberToString(extraCharges),
        tip: safeNumberToString(tip),
        customer_name: customerDetails.customer_name || "",
        customer_mobile: customerDetails.customer_mobile || "",
        customer_alternate_mobile: customerDetails.customer_alternate_mobile || "",
        customer_address: customerDetails.customer_address || "",
        customer_landmark: customerDetails.customer_landmark || "",
      };
      
      // The rest of the function remains the same... 

      let apiResponse;

      // For existing orders
      if (tableData?.order_id) {
        const updateRequestBody = {
          ...baseRequestBody,
          order_id: tableData.order_id.toString(),
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number.toString()],
            section_id: tableData.section_id.toString(),
          }),
         
        };

        console.log(
          "Settle Update Body:",
          JSON.stringify(updateRequestBody, null, 2)
        );

        const updateResponse = await axiosInstance.post(
          onGetProductionUrl() + "update_order",
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
          // Display the exact error message from the API
          throw new Error(updateData.msg || "Failed to update order");
        }

        // Then mark as paid with payment information
        const settleRequestBody = {
          outlet_id: restaurantId.toString(),
          order_id: tableData.order_id.toString(),
          order_status: "paid", // For settle, always mark as paid
          user_id: userId.toString(),
          action: "settle",
          order_type: orderType || "dine-in",
          is_paid: "paid", // For settle, always mark as paid
          payment_method: effectiveIsPaid && effectivePaymentMethod ? effectivePaymentMethod.toLowerCase() : "", // Use the effective payment method instead of paymentMethod
          // Include customer details
          customer_name: customerDetails.customer_name || "",
          customer_mobile: customerDetails.customer_mobile || "",
          customer_alternate_mobile: customerDetails.customer_alternate_mobile || "",
          customer_address: customerDetails.customer_address || "",
          customer_landmark: customerDetails.customer_landmark || "",
          special_discount: safeNumberToString(specialDiscount),
          charges: safeNumberToString(extraCharges),
          tip: safeNumberToString(tip),
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number.toString()],
            section_id: tableData.section_id.toString(),
          }),
        };

        console.log(
          "Settle Status Body:",
          JSON.stringify(settleRequestBody, null, 2)
        );

        const settleResponse = await axiosInstance.post(
          onGetProductionUrl() + "update_order_status",
          settleRequestBody,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const settleData = await settleResponse.data;
        if (settleData.st !== 1) {
          // Display the exact error message from the API
          throw new Error(settleData.msg || "Failed to settle order");
        }
      } else {
        // For new orders
        const createRequestBody = {
          ...baseRequestBody,
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number.toString()],
            section_id: tableData.section_id.toString(),
          }),
        };

        console.log(
          "Settle Create Body:",
          JSON.stringify(createRequestBody, null, 2)
        );

        const response = await axiosInstance.post(
          onGetProductionUrl() + "create_order",
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
          // Display the exact error message from the API
          throw new Error(data.msg || "Failed to create order");
        }

        // For new orders, we don't need to mark as paid again since the create_order already sets it
        // The second API call was causing duplicate "paid" entries in the timeline
        apiResponse = data;
      }

      setIsLoading(false);
      Alert.alert("Success", "Order settled successfully!", [
        {
          text: "OK",
          onPress: () => {
            if (route.params?.onOrderCreated) {
              route.params.onOrderCreated();
            }
            navigation.navigate("RestaurantTables");
          },
        },
      ]);
    } catch (error) {
      console.error("Error handling order:", error);
      setIsLoading(false);
      
      // Improved error message handling
      let errorMessage = "Failed to process order. Please try again.";
      
      // Check if the error is from the API response
      if (error.response?.data?.msg) {
        errorMessage = error.response.data.msg;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(
        "Error",
        errorMessage
      );
    }
  };


  const renderCartItems = () => {
    // Using FlatList instead of ScrollView for better performance and scrolling behavior
    return (
      <FlatList
        data={cart}
        keyExtractor={(item) => `${item.menu_id}-${item.portion || 'full'}`}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <View style={styles.cartItemHeader}>
              <Text style={styles.itemName}>
                {item.name}
                {item.offer > 0 && (
                  <Text style={styles.offerText}> ({item.offer}% OFF)</Text>
                )}

              </Text>
              <Text style={styles.unitPrice}>
                  ₹{parseFloat(item.price).toFixed(2)}
                </Text>
              <View style={styles.priceRemoveContainer}>
               
               
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromCart(item.menu_id, item.portion)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increase touch area
                >
                  <RemixIcon name="close-line" size={18} color="#666666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cartItemDetails}>
              <View style={styles.leftContainer}>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={[styles.quantityButton, styles.quantityButtonUpdated]}
                    onPress={() => decreaseQuantity(item.menu_id, item.portion)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increase touch area
                  >
                    <Text style={styles.quantityButtonTextUpdated}>-</Text>
                  </TouchableOpacity>

                  <Text style={styles.quantityText}>{item.quantity}</Text>

                  <TouchableOpacity
                    style={[styles.quantityButton, styles.quantityButtonUpdated]}
                    onPress={() => increaseQuantity(item.menu_id, item.portion)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increase touch area
                  >
                    <Text style={styles.quantityButtonTextUpdated}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.rightContainer}>
                <View style={styles.totalContainer}>
                  <Text style={styles.priceLabel}>Total : </Text>
                  <Text style={styles.itemPrice}>
                  ₹{(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingBottom: 320 // Reduced padding to avoid excessive space
        }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#0dcaf0"]} // Use your app's primary color
          />
        }
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={21}
        removeClippedSubviews={false}
        ListEmptyComponent={
          <View style={styles.emptyCartContainer}>
            <RemixIcon name="restaurant-line" size={50} color="#ccc" />
            <Text style={styles.emptyCartText}>No items in the cart</Text>
          </View>
        }
      />
    );
  };

  

  const renderOrderTypeHeader = () => {
    if (orderType === "dine-in" && tableData) {
      // Get the order number
      const orderNumber = tableData?.order_number || (orderDetails && orderDetails.order_number);
      
      return (
        <View style={styles.tableInfoContainer}>
          <View>
            <Text
              style={[
                styles.tableInfoText,
                { color: tableData.is_occupied ? "#FF4B4B" : "#22C55E" },
              ]}
            >
              {tableData.section_name}-{tableData.table_number}
            </Text>
            
            {/* Show order number if it exists */}
            {orderNumber && (
              <Text style={styles.orderNumberIndicator}>
                Bill No. {orderNumber}
              </Text>
            )}
          </View>
        </View>
      );
    }
    
    // For non-dine-in orders (parcel, delivery, drive-through, counter)
    // Get the order number from either tableData or orderDetails
    const orderNumber = tableData?.order_number || (orderDetails && orderDetails.order_number);
    
    return (
      <View style={[styles.tableInfoContainer, { alignSelf: 'center' }]}>
        <View style={styles.orderTypeHeaderContainer}>
          <Text style={[styles.tableInfoText, {color: "#000000"}]}>
            {orderType.charAt(0).toUpperCase() + orderType.slice(1)}
          </Text>
          
          {/* Show order number if it exists */}
          {orderNumber && (
            <Text style={[styles.orderNumberIndicator, {color: "#000000"}]}>
              Bill No. {orderNumber}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Add this new component for the portion dropdown
  const PortionDropdown = ({ item, onSelect, onClose }) => (
    <View style={styles.portionDropdownContainer}>
      <View style={styles.portionDropdownContent}>
        <Text style={styles.portionTitle}>Select Portion</Text>

        <TouchableOpacity
          style={styles.portionOption}
          onPress={() => onSelect(item, "full")}
        >
          <Text>Full - ₹{Number(item.full_price).toFixed(2)}</Text>
        </TouchableOpacity>

        {item.half_price > 0 && (
          <TouchableOpacity
            style={styles.portionOption}
            onPress={() => onSelect(item, "half")}
          >
            <Text>Half - ₹{Number(item.half_price).toFixed(2)}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.portionCloseButton} onPress={onClose}>
          <Text style={styles.portionCloseText}>Cancel </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // First, fix the fetchInitialData function which is likely overriding our cart
  const fetchInitialData = async () => {
    try {
      // If cart is already initialized from route params, don't fetch menu items
      if (cartInitializedRef.current) {
        console.log("Cart already initialized from route params, skipping menu fetch");
        // Only fetch config data, not menu items
        const freshConfig = await getRestaurantConfig();
        setRestaurantConfig({
          gst: parseFloat(freshConfig.gst),
          service_charges: parseFloat(freshConfig.service_charges),
        });
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const [freshConfig, accessToken] = await Promise.all([
        getRestaurantConfig(),
        AsyncStorage.getItem("access_token"),
      ]);

      // Set the restaurant config regardless
      setRestaurantConfig({
        gst: parseFloat(freshConfig.gst),
        service_charges: parseFloat(freshConfig.service_charges),
      });

      // Only fetch and set menu items if cart is not already initialized
      if (tableData?.is_occupied && tableData?.order_id && !cartInitializedRef.current) {
        const orderResponse = await axiosInstance.post(
          onGetProductionUrl() + "order_view",
          {
            order_number: tableData.order_number,
            outlet_id: tableData.outlet_id,
            order_id: tableData.order_id,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (orderResponse.data.st === 1 && orderResponse.data.lists) {
          const { order_details, menu_details } = orderResponse.data.lists;

          // Debug output to see what we're getting
          console.log("*** RECEIVED ORDER DETAILS FROM API ***");
          console.log("Customer Name:", order_details.customer_name);
          console.log("Customer Mobile:", order_details.customer_mobile);
          
          // Store the full order details
          setOrderDetails(order_details);
          setOrderStatus(order_details.order_status || "");
          
          // CRITICAL FIX: Handle customer details - Use direct assignment with null checks
          if (order_details) {
            // Set customer details directly from API response with fallbacks to user_name and user_mobile
            setCustomerDetails({
              customer_name: order_details.customer_name !== null ? order_details.customer_name : (order_details.user_name || ""),
              customer_mobile: order_details.customer_mobile !== null ? order_details.customer_mobile : (order_details.user_mobile || ""),
              customer_alternate_mobile: order_details.customer_alternate_mobile !== null ? order_details.customer_alternate_mobile : "",
              customer_address: order_details.customer_address !== null ? order_details.customer_address : "",
              customer_landmark: order_details.customer_landmark !== null ? order_details.customer_landmark : ""
            });
            
            // Set all the calculation values directly
            setSpecialDiscount(parseFloat(order_details.special_discount || 0));
            setExtraCharges(parseFloat(order_details.charges || 0));
            setTip(parseFloat(order_details.tip || 0));
            setDiscount(parseFloat(order_details.discount_percent || 0));
            
            // Set payment method and status
            
            
            if (order_details.is_paid === "paid") {
              setIsPaid(true);
              setIsComplementary(false);
            } else if (order_details.is_paid === "complementary") {
              setIsPaid(false);
              setIsComplementary(true);
            }
          }
          
          // Set menu items if needed
          if (menu_details && !cartInitializedRef.current) {
            const menuItems = menu_details.map((menu) => ({
              menu_id: menu.menu_id,
              name: menu.menu_name || menu.name,
              price: parseFloat(menu.price || 0),
              quantity: parseInt(menu.quantity || 0),
              offer: parseFloat(menu.offer || 0),
              total_price: parseFloat(menu.menu_sub_total || 0),
              specialInstructions: menu.comment || "",
              portion: menu.half_or_full || "full",
              isExistingItem: true
            }));
            
            setCart(menuItems);
            cartInitializedRef.current = true;
          }
        }
      }
    } catch (error) {
      console.error("Error in fetchInitialData:", error);
    } finally {
      setLoading(false);
    }
  };

  // Modify any useEffect that might call fetchInitialData on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // First, check if we have cart items from route params
      if (route.params?.cartItems && route.params.cartItems.length > 0) {
        console.log("Using cart items from route params:", route.params.cartItems.length);
        setCart(route.params.cartItems);
        const newItems = route.params.cartItems.filter(item => item.isNewItem);
        setNewMenuItems(newItems);
        cartInitializedRef.current = true;
        
        // Still fetch config data but not menu items
        const freshConfig = await getRestaurantConfig();
        setRestaurantConfig({
          gst: parseFloat(freshConfig.gst),
          service_charges: parseFloat(freshConfig.service_charges),
        });
      } else {
        // Only fetch full data if we don't have cart items from route params
        await fetchInitialData();
      }
    };
    
    loadInitialData();
    
    return () => {
      console.log("Cleaning up OrderCreate data load effect");
    };
  }, []);

  // Make sure there are no other useEffects that might be setting the cart
  // Also ensure that cart is properly rendered even during loading state

  // Update the rendering logic to use cart regardless of loading state
  // In the return section, make sure the cart is rendered correctly

  

  const generateReceiptHTML = async (orderData) => {
    try {
      const orderDetails = orderData?.lists?.order_details || orderData || {};
      // Fix order number logic to handle existing orders
      const orderNumber =
        orderData?.order_number || // New order from API response
        orderDetails?.order_number || // Existing order details
        tableData?.order_number || // Table's existing order
        orderData?.lists?.order_number || // Alternative path for order number
        "New"; // Fallback for new orders

      const currentDate = new Date()
        .toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        .replace(",", "");

      // Get outlet details with proper fallbacks
      const outletName =
        orderDetails?.outlet_name ||
        orderDetails?.restaurant_name || // For existing orders
        await AsyncStorage.getItem("outlet_name") || // From storage
        "Restaurant";
  
      const outletAddress =
        orderDetails?.outlet_address ||
        orderDetails?.restaurant_address || // For existing orders
        await AsyncStorage.getItem("outlet_address") || // From storage
        "Address";
  
      const outletMobile =
        orderDetails?.outlet_mobile ||
        orderDetails?.restaurant_mobile || // For existing orders
        await AsyncStorage.getItem("outlet_mobile") || // From storage
        "";

      // Update order type display logic
      const orderTypeDisplay = () => {
        if (orderType === "dine-in") {
          return `Table: ${tableData?.section_name || ""}-${
            tableData?.table_number || ""
          }`;
        } else {
          // Capitalize first letter and format order type
          const formattedType =
            orderType.charAt(0).toUpperCase() + orderType.slice(1);
          return `Order Type: ${formattedType}`;
        }
      };

      // Get customer details for receipt
      const customerName = orderDetails?.customer_name || 
                           customerDetails?.customer_name || "";
      const customerMobile = orderDetails?.customer_mobile || 
                             customerDetails?.customer_mobile || "";
      const customerAddress = orderDetails?.customer_address || 
                              customerDetails?.customer_address || "";
      
      // Get payment method
      const payMethod = orderDetails?.payment_method || 
                        paymentMethod || "CASH";
  
      // Format menu items as a table to match printer format
      const menuItemsHTML = (orderDetails?.menu_details || cart)
        .map((item) => {
          const name = item.menu_name || item.name;
          const qty = item.quantity?.toString() || "1";
          const rate = parseFloat(item.price || 0).toFixed(2);
          const total = parseFloat(item.total_price || 0).toFixed(2);
          
          // Format like thermal printer
          return `
            <tr>
              <td style="width: 50%; text-align: left; padding-right: 5px;">${name}</td>
              <td style="width: 10%; text-align: center;">${qty}</td>
              <td style="width: 20%; text-align: right;">${rate}</td>
              <td style="width: 20%; text-align: right;">${total}</td>
            </tr>
          `;
        })
        .join("");
  
      return `
        <html>
          <head>
            <style>
              @page { 
                margin: 0;
                size: 80mm auto;
              }
              body { 
                font-family: monospace;
                margin: 0;
                padding: 8px;
                font-size: 14px;
                line-height: 1.3;
              }
              .center {
                text-align: center;
              }
              .header {
                margin-bottom: 8px;
              }
              .restaurant-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 4px;
              }
              .restaurant-address {
                font-size: 12px;
                margin-bottom: 2px;
              }
              .order-details {
                text-align: left;
              }
              .dotted-line {
                border-top: 1px dotted #000;
                margin: 8px 0;
              }
              .solid-line {
                border-top: 1px solid #000;
                margin: 8px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              .th-row {
                font-weight: bold;
              }
              .totals {
                width: 100%;
              }
              .totals td:first-child {
                text-align: left;
              }
              .totals td:last-child {
                text-align: right;
              }
              .customer-info {
                margin: 4px 0;
              }
              .payment-method {
                margin: 4px 0;
              }
              .grand-total {
                font-weight: bold;
              }
              .footer {
                text-align: center;
                margin-top: 12px;
                font-size: 12px;
              }
              .payment-options {
                text-align: center;
                margin: 8px 0;
              }
            </style>
          </head>
          <body>
            <!-- Header Section - Centered -->
            <div class="center header">
              <div class="restaurant-name">${outletName}</div>
              <div class="restaurant-address">${outletAddress}</div>
              ${outletMobile ? `<div class="restaurant-mobile">+91 ${outletMobile}</div>` : ""}
            </div>
            
            <!-- Order Details - Left Aligned -->
            <div class="order-details">
              <div>Bill No: ${orderNumber}</div>
              <div>${orderTypeDisplay()}</div>
              <div>DateTime: ${currentDate}</div>
              
              <!-- Customer Details (if present) -->
              ${customerName ? `<div class="customer-info">Customer: ${customerName}</div>` : ""}
              ${customerMobile ? `<div class="customer-info">Mobile: ${customerMobile}</div>` : ""}
              ${customerAddress ? `<div class="customer-info">Address: ${customerAddress}</div>` : ""}
              
              <!-- Payment Method -->
              <div class="payment-method">Payment: ${payMethod.toUpperCase()}</div>
            </div>
            
            <div class="dotted-line"></div>
            
            <!-- Menu Items Table -->
            <table>
              <tr class="th-row">
                <td style="width: 50%; text-align: left;">Item</td>
                <td style="width: 10%; text-align: center;">Qty</td>
                <td style="width: 20%; text-align: right;">Rate</td>
                <td style="width: 20%; text-align: right;">Amt</td>
              </tr>
            </table>
            
            <div class="dotted-line"></div>
            
            <table>
            ${menuItemsHTML}
            </table>
            
            <div class="dotted-line"></div>
            
            <!-- Totals Section -->
            <table class="totals">
              <tr>
                <td>Total</td>
                <td>₹${parseFloat(calculateTotal()).toFixed(2)}</td>
              </tr>
              
              ${calculateTotalDiscount() > 0 ? `
              <tr>
                <td>Discount(${getDiscountPercentage()}%)</td>
                <td>-₹${parseFloat(calculateTotalDiscount()).toFixed(2)}</td>
              </tr>
              ` : ""}
              
              ${specialDiscount > 0 ? `
              <tr>
                <td>Special Discount</td>
                <td>-₹${parseFloat(specialDiscount).toFixed(2)}</td>
              </tr>
              ` : ""}
              
              ${extraCharges > 0 ? `
              <tr>
                <td>Extra Charges</td>
                <td>+₹${parseFloat(extraCharges).toFixed(2)}</td>
              </tr>
              ` : ""}
              
              <tr>
                <td>Subtotal</td>
                <td>₹${parseFloat(calculateTotal() - calculateTotalDiscount()).toFixed(2)}</td>
              </tr>
              
              ${calculateService() > 0 ? `
              <tr>
                <td>Service(${restaurantConfig.service_charges}%)</td>
                <td>+₹${parseFloat(calculateService()).toFixed(2)}</td>
              </tr>
              ` : ""}
              
              ${calculateGST() > 0 ? `
              <tr>
                <td>GST(${restaurantConfig.gst}%)</td>
                <td>+₹${parseFloat(calculateGST()).toFixed(2)}</td>
              </tr>
              ` : ""}
              
              ${tip > 0 ? `
              <tr>
                <td>Tip</td>
                <td>+₹${parseFloat(tip).toFixed(2)}</td>
              </tr>
              ` : ""}
            </table>
            
            <div class="dotted-line"></div>
            
            <table class="totals">
              <tr class="grand-total">
                <td>Grand Total</td>
                <td>₹${parseFloat(calculateGrandTotal()).toFixed(2)}</td>
              </tr>
            </table>
            
            <!-- Footer Section -->
            <div class="payment-options">
              <div style="margin-top: 12px;">------ Payment Options ------</div>
              <div style="margin-top: 8px;">PhonePe  GPay  Paytm  UPI</div>
              <div style="margin-top: 6px;">------------------------</div>
            </div>
            
            <div class="footer">
              <div>-----Thank You Visit Again!-----</div>
              <div>https://menumitra.com/</div>
            </div>
          </body>
        </html>
      `;
    } catch (error) {
      console.error("Error generating receipt HTML:", error);
      throw error;
    }
  };

  // Request necessary permissions
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

  // Scan for available printers
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

  // Add device selection handler
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

  // Print receipt
  const printReceipt = async (apiResponse) => {
    try {
      console.log("Preparing receipt data...");
  
      const orderNumber = 
        apiResponse?.lists?.order_details?.order_number || // For existing orders
        apiResponse?.order_number || // For new orders
        tableData?.order_number || // Fallback to table data
        "New"; 
  
      // Make sure all values are properly parsed as numbers to avoid string comparison issues
      const parsedSpecialDiscount = parseFloat(specialDiscount) || 0; // Renamed for clarity
      const parsedExtraCharges = parseFloat(extraCharges) || 0;
      const parsedTip = parseFloat(tip) || 0;
      const parsedGST = calculateGST() || 0;
      const parsedServiceCharges = calculateService() || 0;
      
      // Log values for debugging
      console.log("Receipt pricing values:", {
        specialDiscount: parsedSpecialDiscount,
        extraCharges: parsedExtraCharges,
        tip: parsedTip,
        GST: parsedGST,
        serviceCharges: parsedServiceCharges
      });
  
      // Enhanced receipt data with ALL pricing fields and customer details
      const receiptData = {
        // Basic order info
        order_number: orderNumber,
        datetime: new Date().toLocaleString("en-IN"),
        payment_method: paymentMethod || "CASH",
        
        // Customer details - include all possible sources
        customer_name: customerDetails?.customer_name || customerName || "",
       
        
        // Be explicit about payment status values
        is_paid: isPaid ? "paid" : (isComplementary ? "complementary" : "unpaid"),
        is_complementary: isComplementary, // Add this explicit boolean flag
        
        // Menu items
        items: cart.map((item) => ({
          menu_name: item.name,
          quantity: item.quantity,
          price: item.price,
          total_price: item.total_price,
          portion: item.portion || "full",
          specialInstructions: item.specialInstructions
        })),
        
        // Complete pricing information in correct sequence
        total_bill_amount: calculateTotal(),
        discount_amount: calculateMenuDiscount(), // Regular percentage discount only
        discount_percent: getDiscountPercentage(),
        special_discount: parsedSpecialDiscount, // Special fixed discount - renamed variable
        extra_charges: parsedExtraCharges,
        
        // Calculate this properly from the calculation functions
        total_bill_with_discount: calculateTotalAfterSpecialDiscount(),
        
        service_charges_amount: parsedServiceCharges,
        service_charges_percent: restaurantConfig?.service_charges || 0,
        gst_amount: parsedGST,
        gst_percent: restaurantConfig?.gst || 0,
        tip: parsedTip,
        
        // Final total
        grand_total: calculateGrandTotal()
      };
  
      // Generate printer commands with the complete receipt data
      const printCommands = await generatePrinterCommands(receiptData);
      await sendToDevice(printCommands);
      Alert.alert("Success", "Receipt printed successfully");

      // Log payment status specifically for debugging
      console.log("Print Receipt Payment Status:", {
        isPaid,
        isComplementary,
        paymentMethod,
        statusSentToReceipt: isPaid ? "paid" : (isComplementary ? "complementary" : "unpaid")
      });
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert("Print Error", error.message);
    }
  };

  // Helper functions
  const textToBytes = (text) => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(text));
  };

  const generatePrinterCommands = async (orderData) => {
    try {
      // Get the correct order details structure based on API response
      const orderDetails = orderData?.lists?.order_details || orderData || {};

      // ENHANCED DEBUGGING - log complete object
      console.log("=== PRINT RECEIPT DATA (COMPLETE) ===");
      console.log(JSON.stringify(orderData, null, 2));
      console.log("=== PARSED ORDER DETAILS ===");
      console.log(JSON.stringify(orderDetails, null, 2));

      // Get outlet details from storage with proper fallbacks
      const [storedOutletName, storedOutletAddress, storedOutletMobile, storedUpiId] = 
        await Promise.all([
          AsyncStorage.getItem("outlet_name"),
          AsyncStorage.getItem("outlet_address"),
          AsyncStorage.getItem("outlet_mobile"),
          AsyncStorage.getItem("upi_id"),
        ]);

      // Get order number with proper fallbacks
      const orderNumber = 
        orderData?.lists?.order_details?.order_number || // For existing orders (from API response)
        orderData?.order_number || // For new orders
        tableData?.order_number || // From table data
        "New"; // Fallback

      // Get outlet details with proper fallbacks
      const outletName =
        orderDetails?.outlet_name ||
        orderDetails?.restaurant_name || // For existing orders
        storedOutletName || // From storage
        "Restaurant";

      const outletAddress =
        orderDetails?.outlet_address ||
        orderDetails?.restaurant_address || // For existing orders
        storedOutletAddress || // From storage
        "Address";

      const outletMobile =
        orderDetails?.outlet_mobile ||
        orderDetails?.restaurant_mobile || // For existing orders
        storedOutletMobile || // From storage
        "";

      // Get order type text
      const getOrderTypeText = () => {
        switch (orderType) {
          case "dine-in":
            return `Table: ${tableSectionName} - ${tableNumber}\n`;
          case "parcel":
            return "Type: Parcel\n";
          case "drive-through":
            return "Type: Drive-Through\n";
          case "counter":
            return "Type: Counter\n";
          case "delivery":
            return "Type: Delivery\n";
          default:
            return "Type: Unknown\n";
        }
      };

      // Get current date for new orders
      // Replace the existing currentDate declaration with this:
const currentDate = (() => {
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
})();

      // Get UPI ID and website URL from storage
      const upiId = 
        orderDetails?.upi_id || // First try from order details
        storedUpiId || // Then from storage
        "merchant@upi"; // Default fallback

      // Get menu items based on whether it's a new or existing order
      const menuItems = orderDetails?.menu_details || cart || [];

      // Calculate totals based on order type with default values
      const grandTotal = parseFloat(orderDetails?.grand_total || 0);
      const subtotal = parseFloat(orderDetails?.total_bill_amount || 0);
      const discount = parseFloat(orderDetails?.discount_amount || 0);
      const discountPercent = parseFloat(orderDetails?.discount_percent || 0);

      const serviceCharges = parseFloat(orderDetails?.service_charges_amount || 0); 
      const serviceChargesPercent = parseFloat(orderDetails?.service_charges_percent || 0);
      const gstAmount = parseFloat(orderDetails?.gst_amount || 0);
      const gstPercent = parseFloat(orderDetails?.gst_percent || 0);

      // FIXED: Use direct property access with fallbacks
      const specialDiscountAmount = parseFloat(orderDetails?.special_discount || 0);
      const extraChargesAmount = parseFloat(orderDetails?.extra_charges || 0);
      const tipAmount = parseFloat(orderDetails?.tip || 0);
      
      // FIXED: Calculate total with discount
      const totalWithDiscount = parseFloat(orderDetails?.total_bill_with_discount +  orderDetails?.extra_charges || 0);
      
      // Customer details - carefully extract from multiple sources
      const extractedCustomerName = 
        orderDetails?.customer_name || 
        orderData?.customer_name || 
        customerDetails?.customer_name ||  // Updated to use customer_name instead of name
        customerName ||  // Use the state variable as final fallback
        "";

      // PAYMENT STATUS - Improved processing of payment status
      const isPaidStatus = (
        (typeof orderData?.is_paid === 'string' && 
         ['paid', 'PAID', 'true'].includes(orderData?.is_paid.toLowerCase())) ||
        (typeof orderDetails?.is_paid === 'string' && 
         ['paid', 'PAID', 'true'].includes(orderDetails?.is_paid.toLowerCase())) ||
        isPaid === true
      );

      const isComplementaryStatus = (
        (typeof orderData?.is_paid === 'string' && 
         ['complementary', 'COMPLEMENTARY'].includes(orderData?.is_paid.toLowerCase())) ||
        (typeof orderDetails?.is_paid === 'string' && 
         ['complementary', 'COMPLEMENTARY'].includes(orderDetails?.is_paid.toLowerCase())) ||
        (typeof orderData?.is_complementary === 'boolean' && orderData?.is_complementary) ||
        (typeof orderDetails?.is_complementary === 'boolean' && orderDetails?.is_complementary) ||
        isComplementary === true
      );

      // Enhanced debugging for payment status
      console.log("Payment Status Debug:", {
        orderDataIsPaid: orderData?.is_paid,
        orderDetailsIsPaid: orderDetails?.is_paid,
        isPaidContextValue: isPaid,
        isComplementaryContextValue: isComplementary,
        calculatedIsPaidStatus: isPaidStatus,
        calculatedIsComplementaryStatus: isComplementaryStatus
      });

      // Generate QR code data with safe values
      const qrData = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(outletName)}&am=${grandTotal.toFixed(2)}`;

      // Function for dotted line
      const getDottedLine = () => "--------------------------------\n";

      const centerText = (text) => {
        const padding = Math.max(0, 32 - text.length) / 2;
        return " ".repeat(Math.floor(padding)) + text;
      };

      // Safe access to table data
      const tableSectionName =
        tableData?.section_name || orderDetails?.section || "";
      const tableNumber =
        tableData?.table_number || orderDetails?.table_number?.[0] || "";

      // QR Code commands for ESC/POS printer
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

      const splitLongText = (text, maxLength) => {
        const words = text.split(" ");
        const lines = [];
        let currentLine = "";
        for (const word of words) {
          if (currentLine.length + word.length + 1 <= maxLength) {
            currentLine += (currentLine ? " " : "") + word;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) {
          // Add this check
          lines.push(currentLine); // Make sure to push the last line
        }
        return lines;
      };

      const formatCurrency = (amount) => {
        const value = parseFloat(amount || 0).toFixed(2);
        return `₹${value}`; // Using Г₹ for proper alignment
      };

      // Update formatting functions
      const formatMenuItem = (item) => {
        const name = item?.menu_name || item?.name || "";
        const qty = item?.quantity?.toString() || "0";
        const rate = Math.floor(item?.price || 0).toString();
        const total = (item?.menu_sub_total || item?.total_price || 0).toFixed(
          2
        );

        // Fixed to properly show second line of item name
        if (name.length > 14) {
          const lines = splitLongText(name, 14);
          const firstLine = `${lines[0].padEnd(14)} ${qty.padStart(
            2
          )} ${rate.padStart(5)} ${total.padStart(8)}\n`;
          if (lines.length > 1) {
            // Changed this part to properly handle remaining lines
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

      const formatAmountLine = (label, amount, symbol = "") => {
        const amountStr = Math.abs(amount).toFixed(2);
        const totalWidth = 32; // Total width of the receipt
        const amountWidth = 12; // Increased width for larger amounts (e.g., 10000.00)

        const padding = Math.max(2, totalWidth - label.length - amountWidth);
        const amountWithSymbol = `${symbol}${amountStr}`;
        const amountPadded = amountWithSymbol.padStart(amountWidth);

        return `${label}${" ".repeat(padding)}${amountPadded}\n`;
      };
      
      return [
        // Header section - centered
        ...textToBytes("\x1B\x61\x01"), // Center align
        
        // Improved payment status detection - much simpler condition
        ...(isPaidStatus ? [
          ...textToBytes("\x1B\x21\x10"), // Larger text for PAID
          ...textToBytes("PAID\n"),
          ...textToBytes("\x1B\x21\x00") // Reset text size
        ] : isComplementaryStatus ? [
          ...textToBytes("\x1B\x21\x10"), // Larger text
          ...textToBytes("COMPLEMENTARY\n"),
          ...textToBytes("\x1B\x21\x00") // Reset text size
        ] : []),
        
        ...textToBytes("\x1B\x21\x08"), // Double height
        ...textToBytes(`${outletName}\n`),
        ...textToBytes("\x1B\x21\x00"), // Normal height
        ...textToBytes(`${outletAddress}\n`),
        ...textToBytes(`${outletMobile ? `${outletMobile}\n\n` : ""}`), // Remove +91 prefix

        // Order details - left aligned
        ...textToBytes("\x1B\x61\x00"), // Left align
        ...textToBytes(`Bill No: ${orderNumber}\n`),
        ...textToBytes(getOrderTypeText()),
        ...textToBytes(`DateTime: ${currentDate}\n`),
        
        // FIXED: Always try to display customer name if it exists
        ...(extractedCustomerName ? [
          ...textToBytes("\x1B\x21\x08"), // Double height for customer name
          ...textToBytes(`Customer: ${extractedCustomerName}\n`),
          ...textToBytes("\x1B\x21\x00") // Reset text size
        ] : []),
        
        // Payment method - Improved extraction and display logic
        ...(isPaidStatus ? 
          textToBytes(`Payment: ${
            // Try multiple sources for payment method in priority order
            (orderDetails?.payment_method || 
             orderData?.payment_method ||
             paymentMethod || 
             "").toString().toUpperCase()
          }\n`) 
          : []), 
        
        ...textToBytes(getDottedLine()),

        // Column headers - aligned with data columns
        ...textToBytes("Item           Qty  Rate     Amt\n"),
        ...textToBytes(getDottedLine()),

        // Menu items
        ...menuItems.flatMap((item) => textToBytes(formatMenuItem(item))),
        ...textToBytes(getDottedLine()),

        // FIXED: Always show all payment items - removed all conditions
        ...textToBytes(formatAmountLine("Total", subtotal)),
        
        // Display discount only if amount is non-zero
        ...(Math.abs(discount) > 0.001 ? 
  textToBytes(formatAmountLine(`Discount(${discountPercent}%)`, discount, "-")) 
  : []),

// FIXED: Only show special discount as a separate line if it exists and is non-zero
...(Math.abs(specialDiscountAmount) > 0.001 ? 
  textToBytes(formatAmountLine("Special Discount", specialDiscountAmount, "-"))
  : []),
        
        // Display extra charges only if amount is non-zero
        ...(Math.abs(extraChargesAmount) > 0.001 ? 
          textToBytes(formatAmountLine("Extra Charges", extraChargesAmount, "+"))
          : []),
        
        // Always show subtotal after discounts/charges
        ...textToBytes(formatAmountLine("Subtotal", totalWithDiscount)),
        
        // Display service charges only if amount is non-zero
        ...(Math.abs(serviceCharges) > 0.001 ? 
          textToBytes(formatAmountLine(`Service(${serviceChargesPercent}%)`, serviceCharges, "+"))
          : []),
        
        // Display GST only if amount is non-zero
        ...(Math.abs(gstAmount) > 0.001 ? 
          textToBytes(formatAmountLine(`GST(${gstPercent}%)`, gstAmount, "+"))
          : []),
        
        // Display tip only if amount is non-zero
        ...(Math.abs(tipAmount) > 0.001 ? 
          textToBytes(formatAmountLine("Tip", tipAmount, "+"))
          : []),

        ...textToBytes(getDottedLine()),
        // Final total
        ...textToBytes(formatAmountLine("Total", grandTotal)),
        ...textToBytes("\n"),

        // Footer - centered
        ...textToBytes("\x1B\x61\x01"), // Center align
        ...textToBytes(`Scan to Pay ${grandTotal.toFixed(2)}\n`),
        
        // QR Code
        ...generateQRCode(qrData),
        ...textToBytes('\n'),
        ...textToBytes("PhonePe  GPay  Paytm  UPI\n"),
        ...textToBytes("\n"),
        ...textToBytes("-----Thank You Visit Again!-----"),
        ...textToBytes("https://menumitra.com/)\n\n\n"),
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper
      ];
    } catch (error) {
      console.error("Error generating printer commands:", error);
      throw error;
    }
  };

  const sendToDevice = async (commands) => {
    try {
      console.log("Sending to device, total bytes:", commands.length);

      // Use printer context for sending data
      if (sendDataToPrinter) {
        // If sendDataToPrinter is available in context, use it
        await sendDataToPrinter(commands);
      } else {
        // Fallback to manual sending if needed
        if (!printerConnected || !contextPrinterDevice) {
          throw new Error("Printer not connected");
        }

        const services = await contextPrinterDevice.services();
        const service = services.find((s) =>
          PRINTER_SERVICE_UUIDS.includes(s.uuid.toUpperCase())
        );

        if (!service) throw new Error("Printer service not found");

        const characteristics = await service.characteristics();
        const printCharacteristic = characteristics.find((c) =>
          PRINTER_CHARACTERISTIC_UUIDS.includes(c.uuid.toUpperCase())
        );

        if (!printCharacteristic)
          throw new Error("Printer characteristic not found");

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

        // Send data in chunks with optimized delays for better speed
        const CHUNK_SIZE = 150; // Increased from 20 to 150
        for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
          if (!printerConnected) {
            throw new Error("Printer connection lost during transmission");
          }

          const chunk = commands.slice(
            i,
            Math.min(i + CHUNK_SIZE, commands.length)
          );
          const base64Data = base64.encode(String.fromCharCode(...chunk));

          await printCharacteristic.writeWithoutResponse(base64Data);
          // Reduced delay between chunks to speed up printing
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Reduced final delay while still ensuring all data is processed
      await new Promise((resolve) => setTimeout(resolve, 300));

      console.log("All data sent successfully");
    } catch (error) {
      console.error("Send to device error:", error);
      throw new Error(`Failed to send data to device: ${error.message}`);
    }
  };

  const validateMobileNumbers = () => {
    // Check if mobile number is provided but not 10 digits
    if (customerDetails.customer_mobile && customerDetails.customer_mobile.length > 0 && 
        customerDetails.customer_mobile.length !== 10) {
      Alert.alert("Invalid Number", "Mobile number must be exactly 10 digits");
      return false;
    }
    
    // Check if alternate mobile number is provided but not 10 digits
    if (customerDetails.customer_alternate_mobile && customerDetails.customer_alternate_mobile.length > 0 && 
        customerDetails.customer_alternate_mobile.length !== 10) {
      Alert.alert("Invalid Number", "Alternate mobile number must be exactly 10 digits");
      return false;
    }
    
    return true;
  };

  // Update handlePrint function
  const handlePrint = async () => {
    try {
      // Dismiss keyboard and ensure updates are processed
      Keyboard.dismiss();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Validate mobile numbers
      if (!validateMobileNumbers()) {
        return;
      }
      
      // Log customer details right before sending the request
      console.log("Customer details being used for print:", JSON.stringify(customerDetails));
      
      setIsLoading(true);
      setLoadingMessage("Processing order...");

      if (cart.length === 0) {
        Alert.alert("Error", "Please add items to cart before printing");
        return;
      }

      // Get required IDs and tokens
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token")
      ]);
      
      // Determine payment status
      const paymentStatus = isPaid ? "paid" : (isComplementary ? "complementary" : "unpaid");

      // Base request body - ensure customer details are included
      const baseRequestBody = {
        user_id: userId.toString(),
        outlet_id: restaurantId.toString(),
        order_type: orderType || "dine-in",
        order_items: cart.map((item) => ({
          menu_id: item.menu_id.toString(),
          quantity: item.quantity.toString(),
          comment: item.specialInstructions || "",
          half_or_full: (item.portion || "full").toLowerCase(),
          price: item.price?.toString() || "0",
          total_price: item.total_price?.toString() || "0",
        })),
        grand_total: cart
          .reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0)
          .toString(),
        action: "print_and_save",
        is_paid: paymentStatus,
        payment_method: isPaid ? paymentMethod : "",
        // Ensure customer details are included with fallbacks to empty strings
        customer_name: customerDetails.customer_name || "",
        customer_mobile: customerDetails.customer_mobile || "",
        customer_alternate_mobile: customerDetails.customer_alternate_mobile || "",
        customer_address: customerDetails.customer_address || "",
        customer_landmark: customerDetails.customer_landmark || "",
        special_discount: safeNumberToString(specialDiscount),
        charges: safeNumberToString(extraCharges),
        tip: safeNumberToString(tip),
        
      };
      
      // Log the full request body for debugging
      console.log("Sending request body:", baseRequestBody);

      let apiResponse;
      setLoadingMessage("Creating order...");

      // Process order (create/update)
      if (tableData?.order_id) {
        const updateRequestBody = {
          ...baseRequestBody,
          order_id: tableData.order_id.toString(),
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number.toString()],
            section_id: tableData.section_id.toString(),
          }),
        };

        const updateResponse = await axiosInstance.post(
          onGetProductionUrl() + "update_order",
          updateRequestBody,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        apiResponse = updateResponse.data;
      } else {
        const createRequestBody = {
          ...baseRequestBody,
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number.toString()],
            section_id: tableData.section_id.toString(),
          }),
        };

        const response = await axiosInstance.post(
          onGetProductionUrl() + "create_order",
          createRequestBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

        apiResponse = response.data;
      }
      if (apiResponse.st === 1) {
        // Order created/updated successfully
        
        // Now check if we can print - only for printing, not for order creation
        if (printerConnected && contextPrinterDevice) {
          setLoadingMessage("Processing print...");
          try {
            // Verify printer connection is stable before printing
            const isDeviceConnected = await contextPrinterDevice.isConnected();
            if (!isDeviceConnected) {
              console.log("Device reports as not connected despite context state");
              throw new Error("Printer connection not stable");
            }
            
            // Additional verification for auto-reconnected printers
            console.log("Verifying printer is ready for printing");
            
            // Pass just the API response, since printReceipt now handles all the data structuring
            await printReceipt(apiResponse);
            
            // Navigate away after successful printing
            setCart([]);
            navigation.navigate("RestaurantTables");
          } catch (printError) {
            console.error("Print error:", printError);
            
            // Show error but don't block order completion
            Alert.alert(
              "Print Error",
              "The order was created successfully, but printing failed. Would you like to try printing again?",
              [
                {
                  text: "Try Again",
                  onPress: async () => {
                    try {
                      await printReceipt(apiResponse);
                      setCart([]);
                      navigation.navigate("RestaurantTables");
                    } catch (retryError) {
                      console.error("Retry print error:", retryError);
                      Alert.alert(
                        "Print Failed",
                        "Cannot print the receipt. The order has been saved.",
                        [
                          {
                            text: "OK",
                            onPress: () => {
                              setCart([]);
                              navigation.navigate("RestaurantTables");
                            }
                          }
                        ]
                      );
                    }
                  }
                },
                {
                  text: "Skip Printing",
                  style: "cancel",
                  onPress: () => {
                    setCart([]);
                    navigation.navigate("RestaurantTables");
                  }
                }
              ]
            );
          }
        } else {
          // No printer connected - order created but can't print
          // Check if running in Expo Go
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
                        html: await generateReceiptHTML(apiResponse),
                        printerUrl: printerList[0]?.url,
                        orientation: "portrait",
                      });
          setCart([]);
          navigation.navigate("RestaurantTables");
                    } catch (error) {
                      console.error("PDF print error:", error);
                      Alert.alert("Error", "Failed to generate PDF");
                    }
                  },
                },
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => {
                    setCart([]);
                    navigation.navigate("RestaurantTables");
                  },
                },
              ],
              {
                cancelable: true,
                onDismiss: () => {
                  setCart([]);
                  navigation.navigate("RestaurantTables");
                },
              }
            );
          } else {
            // Production build options - order created but prompt for printer connection
            Alert.alert(
              "Order Created",
              "Order has been created successfully. Connect a printer to print the receipt.",
              [
                {
                  text: "Connect Printer",
                  onPress: () => navigation.navigate("PrinterManagement"),
                },
                {
                  text: "Skip Printing",
                  style: "cancel",
                  onPress: () => {
                    setCart([]);
                    navigation.navigate("RestaurantTables");
                  },
                },
              ],
              {
                cancelable: true,
                onDismiss: () => {
                  setCart([]);
                  navigation.navigate("RestaurantTables");
                },
              }
            );
          }
        }
      } else {
        throw new Error(apiResponse.msg || "Failed to process order");
      }
    } catch (error) {
      console.error("Order/Print error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.msg ||
          error.message ||
          "Failed to process order and print receipt"
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // Cleanup

  useEffect(() => {
    const fetchRestaurantName = async () => {
      try {
        const name = await getRestaurantName();
        setRestaurantName(name || "Restaurant"); // Default fallback if not found
      } catch (error) {
        console.error("Error fetching restaurant name:", error);
        setRestaurantName("Restaurant"); // Default fallback on error
      }
    };

    fetchRestaurantName();
  }, []);

  // Update the device selection modal component
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
            {/* Add close button in top-right corner */}
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
  };

  // Update the connectToPrinter function to maintain connection
  const connectToPrinter = async (device) => {
    try {
      console.log("Attempting to connect to:", device.name);
      setLoadingMessage(`Connecting to ${device.name}...`);
      setIsLoading(true);

      const connectedDevice = await device.connect({
        // Add these options to maintain connection
        requestMTU: 512,
        autoConnect: true,
      });

      // Monitor connection state
      device.onDisconnected((error, disconnectedDevice) => {
        if (!isDisconnecting) {
          console.log("Unexpected disconnect, attempting to reconnect...");
          // Attempt to reconnect
          connectToPrinter(device).catch(console.error);
        }
      });

      console.log("Connected to device");
      setLoadingMessage("Discovering services...");
      const discoveredDevice =
        await connectedDevice.discoverAllServicesAndCharacteristics();
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

  // Update the printThermal function to use sendToDevice instead of sendToPrinter
 

  // Update generateKOTCommands to return byte array instead of HTML
  const generateKOTCommands = async (orderData) => {
    try {
      // Get order details with proper structure
      const orderDetails = orderData?.lists?.order_details || orderData;
    
      const orderNumber = 
        orderDetails?.order_number || 
        orderData?.order_number || 
        tableData?.order_number || 
        "New";

      // Fix datetime retrieval for existing orders
    // For the first getCurrentDateTime function
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
      
      console.log("Cart items for KOT:", cart.map(item => `${item.name || item.menu_name}: ${item.quantity} (${item.isNewItem ? 'new' : 'existing'}, orig: ${item.originalQuantity || 0})`));
      
      if (isExistingOrder) {
        console.log("Existing order detected. Preparing incremental KOT");
        
        // Extract cart items with their isNewItem and other flags
        let hasChanges = false;
        
        itemsToPrint = cart.map(item => {
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
              quantity: diff, // Only print the incremental quantity
              isNewItem: false,
              isQuantityChange: true
            };
          }
          
          // Items without changes are not included in KOT
          return null;
        }).filter(Boolean); // Remove null items
        
        // If no changes, print all items from the order
        if (!hasChanges || itemsToPrint.length === 0) {
          console.log("No changes detected. Printing all items from existing order");
          itemsToPrint = cart.map(item => ({
            ...item,
            isExistingReprint: true // Mark these as reprints
          }));
        }
          
        // Calculate total quantity of items being printed
        totalQuantityToPrint = itemsToPrint.reduce((sum, item) => {
          return sum + (parseInt(item.quantity) || 0);
        }, 0);
      } else {
        // For new orders, print all items
        console.log("New order detected. Printing all items");
        itemsToPrint = cart;
        
        // Calculate total quantity across all items
        totalQuantityToPrint = cart.reduce((sum, item) => {
          return sum + (parseInt(item.quantity) || 0);
        }, 0);
      }

   
      
      // Add a clear header to indicate whether this is a new KOT or an addition
      const kotHeader = isExistingOrder 
        ? "*** ADDITIONAL KOT ***\n\n"
        : "*** KOT ***\n\n";

      // Generate KOT commands
      return [
        ...textToBytes("\x1B\x40"), // Initialize printer
        ...textToBytes("\x1B\x61\x01"), // Center alignment
        // --- ADD: Complementary at the top if applicable ---
        
        ...textToBytes("\x1B\x21\x10"), // Double width, double height
        ...textToBytes(kotHeader),
        ...textToBytes(`${outletName}\n`),
        ...textToBytes("\x1B\x21\x00"), // Normal text
        ...textToBytes(`${outletAddress}\n`),
        ...textToBytes(`${outletNumber}\n\n`),
        
        ...textToBytes("\x1B\x61\x00"), // Left align
        ...textToBytes(`Bill No: ${orderNumber}\n`),
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
        
        // Items to print with clear indicators for new/changed items
        ...itemsToPrint.map(item => {
          const name = item.name || item.menu_name || "";
          const qty = item.quantity?.toString() || "";
          
          // Prefix for item status
          let prefix = "";
          if (isExistingOrder && !item.isExistingReprint) {
            if (item.isNewItem) {
              prefix = "";
            } else if (item.isQuantityChange) {
              prefix = "";
            }
          }
          
          // Format item text with prefix
          let itemText = "";
          if ((prefix + name).length > 23) {
            const prefixLength = prefix.length;
            const firstLineMaxLength = 23 - prefixLength;
            const restMaxLength = 23;
            
            let lines = [];
            let remaining = name;
            
            // First line with prefix
            lines.push(`${prefix}${remaining.substring(0, firstLineMaxLength)}`);
            remaining = remaining.substring(firstLineMaxLength);
            
            // Remaining lines
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

          // Add portion and special instructions if available
          if (item.portion && item.portion !== "full") {
            itemText += `   (${item.portion})\n`;
          }
          if (item.comment) {
            itemText += `   Note: ${item.comment}\n`;
          }

          return textToBytes(itemText);
        }).flat(),
        
        ...textToBytes(getDottedLine()),
        // Align "Total Items" with the quantity column by padding to 23 chars
        ...textToBytes(`${"Total Items:".padEnd(23)} ${totalQuantityToPrint}\n`),
        ...textToBytes("\n"),
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper
      ];
    } catch (error) {
      console.error("Error generating KOT commands:", error);
      throw error;
    }
  };

  // Update handleKOT to use printThermal
  const handleKOT = async (modalPaymentMethod = null, modalIsPaidValue = null) => {
    try {
      // Dismiss keyboard and ensure updates are processed
      Keyboard.dismiss();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Validate mobile numbers
      if (!validateMobileNumbers()) {
        return;
      }
      
      setIsLoading(true);
      setLoadingMessage("Processing KOT...");

      if (cart.length === 0) {
        Alert.alert("Error", "Please add items to cart before generating KOT");
        return;
      }

      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const orderItems = cart.map((item) => ({
        menu_id: item.menu_id.toString(),
        quantity: item.quantity.toString(),
        comment: item.specialInstructions || "",
        half_or_full: (item.portion || "full").toLowerCase(),
        price: item.price?.toString() || "0",
        total_price: item.total_price?.toString() || "0",
      }));

      // Use modal values if provided, otherwise use main screen values
      const effectiveIsPaid = modalIsPaidValue !== null ? modalIsPaidValue : isPaid;
      const effectivePaymentMethod = modalPaymentMethod || paymentMethod;

      // Determine payment status based on complementary and paid checkboxes
      const paymentStatus = effectiveIsPaid ? "paid" : (isComplementary ? "complementary" : "unpaid");

      // Base request body
      const baseRequestBody = {
        user_id: userId.toString(),
        outlet_id: restaurantId.toString(),
        order_type: orderType || "dine-in",
        order_items: orderItems,
        grand_total: orderItems
          .reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0)
          .toString(),
        action: "settle",
        is_paid: paymentStatus,
        payment_method: effectiveIsPaid && effectivePaymentMethod ? effectivePaymentMethod.toLowerCase() : "", // Convert to lowercase for API
        special_discount: safeNumberToString(specialDiscount),
        charges: safeNumberToString(extraCharges),
        tip: safeNumberToString(tip),
        customer_name: customerDetails.customer_name || "",
        customer_mobile: customerDetails.customer_mobile || "",
        customer_alternate_mobile: customerDetails.customer_alternate_mobile || "",
        customer_address: customerDetails.customer_address || "",
        customer_landmark: customerDetails.customer_landmark || "",
      };
      
      // The rest of the function remains the same...

      let apiResponse;

      // For existing orders
      if (tableData?.order_id) {
        // First update the order
        const updateRequestBody = {
          ...baseRequestBody,
          order_id: tableData.order_id.toString(),
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number.toString()],
            section_id: tableData.section_id.toString(),
          }),
          // Remove is_paid parameter from this call to avoid duplicate status entries
          is_paid: null
        };

        const updateResponse = await axiosInstance.post(
          onGetProductionUrl() + "update_order",
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

        // Then update status - using same status logic as KOTAndSave
        const statusRequestBody = {
          outlet_id: restaurantId.toString(),
          order_id: tableData.order_id.toString(),
          order_status: isPaid ? "paid" : (orderDetails?.order_status || existingOrderDetails?.order_status || "placed"),
          user_id: userId.toString(),
          action: "settle",
          order_type: orderType || "dine-in",
          is_paid: paymentStatus,
          payment_method: effectiveIsPaid && effectivePaymentMethod ? effectivePaymentMethod.toLowerCase() : "", // Use the effective payment method instead of paymentMethod
          // Include customer details here as well
          customer_name: customerDetails.customer_name || "",
          customer_mobile: customerDetails.customer_mobile || "",
          customer_alternate_mobile: customerDetails.customer_alternate_mobile || "",
          customer_address: customerDetails.customer_address || "",
          customer_landmark: customerDetails.customer_landmark || "",
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number.toString()],
            section_id: tableData.section_id.toString(),
          }),
        };

        const statusResponse = await axiosInstance.post(
          onGetProductionUrl() + "update_order_status",
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
        // For new orders
        const createRequestBody = {
          ...baseRequestBody,
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number.toString()],
            section_id: tableData.section_id.toString(),
          }),
        };

        const response = await axiosInstance.post(
          onGetProductionUrl() + "create_order",
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

        // For new orders, we don't need to update the status again
        // The create_order already sets the status properly
        apiResponse = data;
      }

      // Continue with KOT printing logic
      if (apiResponse.st === 1) {
        setLoadingMessage("Processing KOT...");

        // For new orders, add the order number to the API response
        if (!tableData?.order_id) {
          apiResponse.order_number =
            apiResponse.order_number || String(apiResponse.order_id);
        }

        if (!tableData?.order_id) {
          apiResponse.order_number =
            apiResponse.order_number || String(apiResponse.order_id);
        }
      
        // Use contextPrinterDevice and printerConnected directly from context
        if (printerConnected && contextPrinterDevice) {
          try {
            // Verify printer connection is stable before KOT printing
            // This is especially important for auto-reconnected printers
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
            
            // Generate KOT commands for the order
            setLoadingMessage("Printing KOT receipt...");
            const kotCommands = await generateKOTCommands(apiResponse);
            
            // Print the KOT receipt
            await sendToDevice(kotCommands);
            
            // Add a short delay between prints (500ms)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Print actual bill receipt instead of second KOT
            setLoadingMessage("Printing bill receipt...");
            
            // Prepare receipt data
            const receiptData = {
              // Basic order info
              order_number: apiResponse?.lists?.order_details?.order_number || apiResponse?.order_number || tableData?.order_number || "New",
              datetime: new Date().toLocaleString("en-IN"),
              payment_method: effectivePaymentMethod || "CASH",
              
              // Be explicit about payment status values
              is_paid: effectiveIsPaid ? "paid" : (isComplementary ? "complementary" : "unpaid"),
              is_complementary: isComplementary, // Add this explicit boolean flag
              
              // Menu items
              menu_details: cart.map((item) => ({
                menu_name: item.name || item.menu_name,
                quantity: item.quantity,
                price: item.price,
                menu_sub_total: item.total_price,
                portion: item.portion || "full"
              })),
              
              // Complete pricing information
              total_bill_amount: calculateTotal(),
              discount_amount: calculateMenuDiscount(),
              discount_percent: getDiscountPercentage(),
              special_discount: parseFloat(specialDiscount) || 0,
              extra_charges: parseFloat(extraCharges) || 0,
              
              total_bill_with_discount: calculateTotalAfterSpecialDiscount(),
              
              service_charges_amount: calculateService() || 0,
              service_charges_percent: restaurantConfig?.service_charges || 0,
              gst_amount: calculateGST() || 0,
              gst_percent: restaurantConfig?.gst || 0,
              tip: parseFloat(tip) || 0,
              
              // Final total
              grand_total: calculateGrandTotal(),
              
              // Customer details
              customer_name: customerDetails.customer_name || "",
              // Add items field to match the printReceipt format
              items: cart.map((item) => ({
                menu_name: item.name || item.menu_name,
                quantity: item.quantity,
                price: item.price,
                total_price: item.total_price,
                portion: item.portion || "full",
                specialInstructions: item.specialInstructions
              })),
            };
            
            // Generate and print the bill receipt
            const receiptCommands = await generatePrinterCommands(receiptData);
            await sendToDevice(receiptCommands);
            
            // Continue with the rest of the logic
            setCart([]);
            navigation.navigate("RestaurantTables");
          } catch (error) {
            console.error("KOT/Receipt print error:", error);
            Alert.alert("Error", "Failed to print receipts. Please try again.");
          }
        } else {
          // Check if running in Expo Go
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
                      setCart([]);
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
                    setCart([]);
                    navigation.navigate("RestaurantTables");
                  },
                },
              ],
              {
                cancelable: true,
                onDismiss: () => {
                  setCart([]);
                  navigation.navigate("RestaurantTables");
                },
              }
            );
          } else {
            // Production build options
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
                    setCart([]);
                    navigation.navigate("RestaurantTables");
                  },
                },
              ],
              {
                cancelable: true,
                onDismiss: () => {
                  setCart([]);
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

  // Add the KOT HTML generator function outside handleKOT
  const generateKOTHTML = async (orderData) => {
    try {
      const orderDetails = orderData?.lists?.order_details;
      // Fix order number logic to handle existing orders
      
      // Update order number logic to handle new orders from API response
      const orderNumber =
        orderData?.order_number || // Direct from create_order API response
        orderDetails?.order_number || // For existing orders
        "Unknown";  // Fallback for new orders

      // For new orders, use current date in the required format
      const currentDate = new Date()
        .toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        .replace(",", "");

      // Format menu items with special instructions
      const menuItemsHTML = (orderDetails?.menu_details || cart)
        .map((item, index) => {
          const itemHTML = `
            <div class="table-row item-row">
              <span class="item-number">${index + 1}</span>
              <div class="item-details">
                <div class="item-name-qty">
                  <span class="item-name">${item.menu_name || item.name}</span>
                  <span class="item-qty">${item.quantity}x</span>
                </div>
                <div class="portion">${item.portion || "Full"}</div>
                ${
                  item.specialInstructions
                    ? `<div class="special-instructions">Note: ${item.specialInstructions}</div>`
                    : ""
                }
              </div>
            </div>
          `;
          return itemHTML;
        })
        .join("");

      // Update order type display logic
      const orderTypeDisplay = () => {
        if (orderType === "dine-in") {
          return `Table: ${tableData?.section_name || ""}-${
            tableData?.table_number || ""
          }`;
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
                size: 80mm auto;
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
              .title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 8px;
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
              .table-info {
                font-size: 16px;
                font-weight: bold;
                margin: 8px 0;
              }
              .item-row {
                margin: 8px 0;
                display: flex;
              }
              .item-number {
                width: 30px;
              }
              .item-details {
                flex: 1;
              }
              .item-name-qty {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
              }
              .portion {
                font-size: 12px;
                color: #666;
                margin-top: 2px;
              }
              .special-instructions {
                font-size: 12px;
                font-style: italic;
                margin-top: 4px;
                padding-left: 8px;
              }
              .total-items {
                font-weight: bold;
                margin-top: 8px;
              }
              .order-type {
                text-align: center;
                font-weight: bold;
                margin: 8px 0;
                padding: 4px;
                border: 2px solid #000;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">KOT</div>
            </div>
            
            <div class="order-details">
              <span>Order #${orderNumber}</span>
              <span>${ currentDate}</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="order-type">
              ${orderTypeDisplay()}
            </div>
            
            <div class="dotted-divider"></div>
            
            ${menuItemsHTML}
            
            <div class="divider"></div>
            
            <div class="total-items">
              Total Items: ${(orderDetails?.menu_details || cart).length}
            </div>
            
            <div class="dotted-divider"></div>
          </body>
        </html>
      `;
    } catch (error) {
      console.error("Error generating KOT HTML:", error);
      throw error;
    }
  };

  // Add this to handle keyboard behavior
 

  // Modify the fetchInitialData function to show loading
  const handleCartRefresh = async () => {
    setIsRefreshingCart(true);
    await fetchInitialData();
    setIsRefreshingCart(false);
  };

  // Add a cleanup function to the component to prevent cart resets
  useEffect(() => {
    // This function runs when the component unmounts or when dependencies change
    return () => {
      console.log("Cleaning up OrderCreate component");
    };
  }, []);

  // Add a cleanup function
  useEffect(() => {
    return () => {
      // Reset the initialization ref when component unmounts
      cartInitializedRef.current = false;
    };
  }, []);

  // Ensure navigation and cart data is properly handled
  useEffect(() => {
    // Function to handle sending cart back
    const sendCartBack = () => {
      if (updateCartOnReturn && typeof updateCartOnReturn === 'function' && cart) {
        console.log("Sending cart data back to DemoScreen:", cart.length);
        updateCartOnReturn([...cart]);
      }
    };
    
    // Component will unmount or navigate away
    return () => {
      sendCartBack();
    };
  }, [cart, updateCartOnReturn]); // Only depend on cart and updateCartOnReturn

  // Add navigation function to go to DemoScreen with current cart
  const navigateToAddMoreItems = () => {
    // Pass the current cart state to DemoScreen
    navigation.navigate("DemoScreen", {
      tableData,
      orderType,
      currentCart: cart, // Pass the current cart to DemoScreen
      onOrderCreated: route.params?.onOrderCreated,
      onCartUpdated: (updatedCart) => {
        console.log("Setting cart from DemoScreen:", updatedCart.length);
        setCart(updatedCart);
      }
    });
  };

  // Update the back navigation and cleanup logic to ensure proper cart data transfer

  // In OrderCreate.js - Update the cart return logic
  // First, create a separate function to handle passing cart back
  const passCartBackToParent = () => {
    if (route.params?.updateCartOnReturn && cart) {
      console.log("passCartBackToParent with cart:", cart.length);
      // Always send a copy to avoid reference issues
      route.params.updateCartOnReturn([...cart]);
    }
  };

  // Update the useEffect for cleanup
  useEffect(() => {
    return () => {
      console.log("OrderCreate cleanup - cart length:", cart.length);
      passCartBackToParent();
    };
  }, [cart]);

  // Handle back button press
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          style={{ marginLeft: 15 }}
          onPress={() => {
            console.log("Back button pressed - cart length:", cart.length);
            // Make sure to pass cart BEFORE navigation
            passCartBackToParent();
            setTimeout(() => {
              navigation.goBack();
            }, 50); // Small delay to ensure passCartBackToParent completes
          }}
        >
          <RemixIcon name="arrow-left-line" size={24} color="#000" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, cart]);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigation.isFocused()) {
        console.log("Hardware back pressed - cart length:", cart.length);
        passCartBackToParent();
        // Use small timeout to ensure cart is passed before navigation
        setTimeout(() => navigation.goBack(), 50);
        return true; // Prevent default behavior
      }
      return false;
    });

    return () => backHandler.remove();
  }, [navigation, cart]);

  // In OrderCreate.js - Implement a better back navigation handler

  // Import necessary module


  // Handle back navigation more effectively
  const handleBackNavigation = () => {
    console.log("Back navigation with cart items:", cart.length);
    
    // Use CommonActions to pass the current cart back to DemoScreen
    // This ensures the data is passed *before* navigation occurs
    navigation.dispatch(
      CommonActions.navigate({
        name: 'DemoScreen',
        params: {
          tableData,
          orderType,
          updatedCart: cart, // Pass the current cart state back
          timestamp: Date.now(), // Add timestamp to ensure params change is detected
        },
        merge: true, // Merge with existing params
      })
    );
  };

  // Update the header back button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          style={{ marginLeft: 15 }}
          onPress={handleBackNavigation}
        >
          <RemixIcon name="arrow-left-line" size={24} color="#000" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, cart]);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log("Hardware back button pressed");
      
      // Always use our handleBackNavigation function
      // Remove the navigation.isFocused() check since it's causing issues
      handleBackNavigation();
      
      // Always return true to prevent default back navigation
      return true;
    });
  
    return () => backHandler.remove();
  }, [navigation, cart]);

  // Add these state variables for the input fields and modal
  
  
  // Add this function to handle the + button press
  const handleAddCustomerDetails = () => {
    setShowCustomerDetailsModal(true);
  };

  // Modify your renderCartHeader or similar function to include the input fields
  // Or add this as a new component
  const renderCustomerInfoContainer = () => {
    return (
      // Replace any KeyboardAvoidingView here with a regular View
      <View style={styles.customerInfoContainer}>
        <TextInput
          style={styles.customerInput}
          placeholder="Customer Name"
          onBlur={() => Keyboard.dismiss()}
          value={customerDetails?.customer_name || ""}
          onChangeText={(text) => handleCustomerDetailsChange("customer_name", text)}
        />
        <TextInput
          style={styles.customerInput}
          placeholder="Mobile Number"
          value={customerDetails?.customer_mobile || ""}
          onChangeText={(text) => handleCustomerDetailsChange("customer_mobile", text)}
          keyboardType="phone-pad"
        />
        <TouchableOpacity
          style={styles.addCustomerButton}
          onPress={() => setShowCustomerDetailsModal(true)}
        >
          <Icon name="add" size={24} color="#333" />
        </TouchableOpacity>
      </View>
    );
  };

  // Add these state variables for the customer details modal
 

  // Updated modal component to match the image
  const renderCustomerDetailsModal = () => {
    return (
      <Modal
        visible={showCustomerDetailsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCustomerDetailsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.customerDetailsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Additional Customer Details</Text>
              <TouchableOpacity 
                onPress={() => setShowCustomerDetailsModal(false)}
                style={styles.modalCloseButton}
              >
                <RemixIcon name="close-line" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.fieldLabel}>Alternate Mobile</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter alternate mobile"
              value={customerDetails.customer_alternate_mobile}
              onChangeText={(text) => handleCustomerDetailsChange("customer_alternate_mobile", text)}
              keyboardType="phone-pad"
            />
            
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              style={[styles.modalInput, styles.multilineInput]}
              placeholder="Enter address"
              value={customerDetails.customer_address}
              onChangeText={(text) => handleCustomerDetailsChange("customer_address", text)}
              multiline={true}
              numberOfLines={3}
            />
            
            <Text style={styles.fieldLabel}>Landmark</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter landmark"
              value={customerDetails.customer_landmark}
              onChangeText={(text) => handleCustomerDetailsChange("customer_landmark", text)}
            />
            
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setShowCustomerDetailsModal(false)}
              >
                <RemixIcon name="close-line" size={18} color="#666" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={() => {
                  console.log("Customer details being saved:", customerDetails);
                  
                  // Use the common validation function
                  if (!validateMobileNumbers()) {
                    return;
                  }
                  
                  setShowCustomerDetailsModal(false);
                }}
              >
                <RemixIcon name="save-line" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };



 

  // Add this new component to display the pricing totals and action buttons
  
  // Add this new function to render the payment options section
  const renderPaymentOptions = () => {
    return (
      <View style={styles.paymentOptionsContainer}>
      <TouchableOpacity 
  style={[
    styles.expandButton, 
    { borderBottomWidth: showPaymentOptions ? 1 : 0 }
  ]} 
  onPress={() => setShowPaymentOptions(!showPaymentOptions)}
>
  <View style={styles.arrowLineRow}>
    <View style={styles.dashLine} />
    <RemixIcon 
      name={showPaymentOptions ? "arrow-down-s-line" : "arrow-up-s-line"} 
      size={24} 
      color="#666" 
      style={styles.arrowIcon}
    />
    <View style={styles.dashLine} />
  </View>
</TouchableOpacity>
        
        {showPaymentOptions && (
          <View style={[styles.paymentOptionsContent, { paddingVertical: 10 }]}>
            {/* Input fields row */}
            <View style={styles.paymentInputsRow}>
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Special Discount</Text>
                <TextInput
                  style={styles.paymentInput}
                  value={specialDiscount}
                  onChangeText={(text) => setSpecialDiscount(text)}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Extra Charges</Text>
                <TextInput
                  style={styles.paymentInput}
                  value={extraCharges}
                  onChangeText={(text) => setExtraCharges(text)}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Tip</Text>
                <TextInput
                  style={styles.paymentInput}
                  value={tip}
                  onChangeText={(text) => setTip(text)}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            {/* Payment options row */}
            <View style={styles.paymentOptionsRow}>
              {/* Left side - Show Complementary when Paid is not selected */}
              {!isPaid && (
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setIsComplementary(!isComplementary)}
                >
                  <View style={[
                    styles.checkbox,
                    isComplementary && styles.checkedCheckbox
                  ]}>
                    {isComplementary && <RemixIcon name="check-line" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.optionText}>Complementary</Text>
                </TouchableOpacity>
              )}

              {/* Show payment methods when Paid is selected */}
              {isPaid && (
                <View style={styles.paymentMethodsContainer}>
                  <TouchableOpacity 
                    style={styles.radioOptionContainer}
                    onPress={() => setPaymentMethod('cash')}
                  >
                    <View style={[
                      styles.radioButton,
                      paymentMethod === 'cash' && styles.selectedRadioButton
                    ]}>
                      {paymentMethod === 'cash' && <View style={styles.radioButtonInner} />}
                    </View>
                    <Text style={[styles.paymentOptionText, { minWidth: 55, paddingRight: 5 }]}>CASH</Text>
                    </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.radioOptionContainer}
                    onPress={() => setPaymentMethod('upi')}
                  >
                    <View style={[
                      styles.radioButton,
                      paymentMethod === 'upi' && styles.selectedRadioButton
                    ]}>
                      {paymentMethod === 'upi' && <View style={styles.radioButtonInner} />}
                    </View>
                    <Text style={[styles.paymentOptionText, { minWidth: 55, paddingRight: 5 }]}>UPI</Text>
                    </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.radioOptionContainer}
                    onPress={() => setPaymentMethod('card')}
                  >
                    <View style={[
                      styles.radioButton,
                      paymentMethod === 'card' && styles.selectedRadioButton
                    ]}>
                      {paymentMethod === 'card' && <View style={styles.radioButtonInner} />}
                    </View>
                    <Text style={[styles.paymentOptionText, { minWidth: 55, paddingRight: 5 }]}>CARD</Text>
                    </TouchableOpacity>
                </View>
              )}

              {/* Right side - Paid checkbox */}
              <TouchableOpacity 
                style={[styles.checkboxContainer, styles.paidCheckbox]}
                onPress={() => setIsPaid(!isPaid)}
              >
                <View style={[
                  styles.checkbox,
                  isPaid && styles.checkedCheckbox
                ]}>
                  {isPaid && <RemixIcon name="check-line" size={16} color="#fff" />}
                </View>
                <Text style={styles.optionText}>Paid</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Then modify the existing renderPricingFooter function to add our new component at the top
  const renderPricingFooter = () => {
    // Use calculation functions
    const subtotal = calculateTotal();
    const menuDiscount = calculateMenuDiscount();
    const serviceCharges = calculateService();
    const gstAmount = calculateGST();
    const finalTotal = calculateGrandTotal();

    // Get percentages for display
    const discountPercentage = parseFloat(getDiscountPercentage()) || 0; // Fixed: Call the function with parentheses
    const servicePercentage = parseFloat(restaurantConfig.service_charges || 0);
    const gstPercentage = parseFloat(restaurantConfig.gst || 0);

    return (
      <View style={styles.footerContainerMain}>
        {/* Pricing row */}
        <View style={styles.pricingRow}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceValue}>₹{subtotal.toFixed(2)}</Text>
            <Text style={styles.priceLabel}>Total</Text>
          </View>
          
          <View style={styles.priceBlock}>
            <Text style={styles.discountValue}>-₹{menuDiscount.toFixed(2)}</Text>
            <Text style={styles.priceLabel}>Disc ({discountPercentage}%)</Text>
          </View>
          
          <View style={styles.priceBlock}>
            <Text style={styles.priceValue}>+₹{serviceCharges.toFixed(2)}</Text>
            <Text style={styles.priceLabel}>Service ({servicePercentage}%)</Text>
          </View>
          
          <View style={styles.priceBlock}>
            <Text style={styles.priceValue}>+₹{gstAmount.toFixed(2)}</Text>
            <Text style={styles.priceLabel}>GST ({gstPercentage}%)</Text>
          </View>
          
          <View style={styles.grandTotalBlock}>
            <Text style={styles.grandTotalValue}>₹{finalTotal.toFixed(2)}</Text>
            <Text style={styles.priceLabel}>Grand Total</Text>
          </View>
        </View>
        
        {/* Action buttons - first row */}
        <View style={styles.actionButtonsRow}>
          {/* Print & Save Button */}
          <TouchableOpacity 
            style={[
              styles.printSaveButton,
              { display: settings?.print_and_save ? 'flex' : 'none' }
            ]}
            onPress={handlePrint}
            disabled={!settings?.print_and_save}
          >
            <RemixIcon name="printer-line" size={16} color="#fff" />
            <Text style={styles.buttonText}>Print & Save</Text>
          </TouchableOpacity>
          
          {/* KOT Button */}
          <TouchableOpacity 
            style={[
              styles.kotButton,
              { display: settings?.KOT_and_save ? 'flex' : 'none' }
            ]}
            onPress={onKOTPress}
            disabled={!settings?.KOT_and_save}
          >
            <RemixIcon name="file-list-line" size={16} color="#fff" />
            <Text style={styles.buttonText}>KOT</Text>
          </TouchableOpacity>
          
          {/* Settle Button */}
          <TouchableOpacity 
            style={[
              styles.settleButton,
              { display: settings?.settle ? 'flex' : 'none' }
            ]}
            onPress={onSettlePress}
            disabled={!settings?.settle}
          >
            <RemixIcon name="checkbox-circle-line" size={16} color="#fff" />
            <Text style={styles.buttonText}>Settle</Text>
          </TouchableOpacity>
        </View>
        
        {/* Action buttons - second row */}
        <View style={styles.secondaryButtonsRow}>
          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.printSaveButton, 
              { display: settings?.has_save? 'flex' : 'none', backgroundColor: '#28a745' }
            ]}
            onPress={handleSave}
            disabled={isLoading || !settings?.has_save}
          >
            <RemixIcon name="save-line" size={16} color="#fff" />
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
          
          {/* KOT & Save Button */}
          <TouchableOpacity 
            style={[
              styles.kotSaveButton,
              { display: settings?.KOT_and_save ? 'flex' : 'none' }
            ]}
            onPress={handleKOTAndSave}
            disabled={!settings?.KOT_and_save}
          >
            <RemixIcon name="save-line" size={16} color="#fff" />
            <Text style={styles.buttonText}>KOT & Save</Text>
          </TouchableOpacity>
          
          {/* Only show cancel button for existing orders */}
          {settings?.cancel && tableData?.order_id && 
            !(tableData?.is_paid === "paid" || 
              tableData?.order_status === "paid" || 
              existingOrderDetails?.order_status === "paid") && (
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCancelOrder}
            >
                <RemixIcon name="close-line" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Add a function to handle the KOT & Save button
  const handleKOTAndSave = async () => {
    try {
      Keyboard.dismiss();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setIsLoading(true);
      setLoadingMessage("Processing order...");

      if (cart.length === 0) {
        Alert.alert("Error", "Please add items to cart before generating KOT");
        return;
      }

      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const orderItems = cart.map((item) => ({
        menu_id: item.menu_id.toString(),
        quantity: item.quantity.toString(),
        comment: item.specialInstructions || "",
        half_or_full: (item.portion || "full").toLowerCase(),
        price: item.price?.toString() || "0",
        total_price: item.total_price?.toString() || "0",
      }));

      const paymentStatus = isPaid ? "paid" : (isComplementary ? "complementary" : "unpaid");

      const baseRequestBody = {
        user_id: userId.toString(),
        outlet_id: restaurantId.toString(),
        order_type: orderType || "dine-in",
        order_items: orderItems,
        grand_total: orderItems
          .reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0)
          .toString(),
        action: "KOT_and_save",
        is_paid: paymentStatus,
        payment_method: isPaid ? paymentMethod : "",
        special_discount: safeNumberToString(specialDiscount),
        charges: safeNumberToString(extraCharges),
        tip: safeNumberToString(tip),
        customer_name: customerDetails.customer_name || "",
        customer_mobile: customerDetails.customer_mobile || "",
        customer_alternate_mobile: customerDetails.customer_alternate_mobile || "",
        customer_address: customerDetails.customer_address || "",
        customer_landmark: customerDetails.customer_landmark || "",
      };

      let apiResponse;

      // For existing orders
      if (tableData?.order_id) {
        const updateRequestBody = {
          ...baseRequestBody,
          order_id: tableData.order_id.toString(),
          order_status: orderDetails?.order_status || existingOrderDetails?.order_status || "placed",
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number.toString()],
            section_id: tableData.section_id.toString(),
          }),
        };

        const updateResponse = await axiosInstance.post(
          onGetProductionUrl() + "update_order",
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

        apiResponse = updateData;
      } else {
        // For new orders
        const createRequestBody = {
          ...baseRequestBody,
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number.toString()],
            section_id: tableData.section_id.toString(),
          }),
        };

        const response = await axiosInstance.post(
          onGetProductionUrl() + "create_order",
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

      // Continue with KOT printing logic
      if (apiResponse.st === 1) {
        setLoadingMessage("Processing KOT...");

        if (!tableData?.order_id) {
          apiResponse.order_number =
            apiResponse.order_number || String(apiResponse.order_id);
        }
      
        // Use contextPrinterDevice and printerConnected directly from context
        if (printerConnected && contextPrinterDevice) {
          try {
            const kotCommands = await generateKOTCommands(apiResponse);
            await sendToDevice(kotCommands);
            
            setCart([]);
            navigation.navigate("RestaurantTables");
    } catch (error) {
            console.error("KOT print error:", error);
            Alert.alert("Error", "Failed to print KOT. Please try again.");
          }
        } else {
          // Check if running in Expo Go
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
                      setCart([]);
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
                    setCart([]);
                    navigation.navigate("RestaurantTables");
                  },
                },
              ],
              {
                cancelable: true,
                onDismiss: () => {
                  setCart([]);
                  navigation.navigate("RestaurantTables");
                },
              }
            );
          } else {
            // Production build options
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
                    setCart([]);
                    navigation.navigate("RestaurantTables");
                  },
                },
              ],
              {
                cancelable: true,
                onDismiss: () => {
                  setCart([]);
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

  // Update the cancel order function to use force_cancel_order API
  const handleCancelOrder = async () => {
    // Show confirmation dialog
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
        {
          text: "No",
          style: "cancel"
        },
        {
          text: "Yes",
          onPress: async () => {
            try {
              setIsLoading(true);
              setLoadingMessage("Cancelling order...");
              
              // Check if there's a valid order_id to cancel (from tableData or orderDetails)
              const orderIdToCancel = tableData?.order_id || (orderDetails && orderDetails.order_id);
              
              if (orderIdToCancel) {
                const [userId, accessToken] = await Promise.all([
                  getUserId(),
                  AsyncStorage.getItem("access_token")
                ]);
                
                // Use force_cancel_order API
                const response = await axiosInstance.post(
                  onGetProductionUrl() + "force_cancel_order",
                  {
                    order_id: orderIdToCancel.toString(),
                    user_id: userId.toString()
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                  }
                );
                
                if (response.data.st === 1) {
                  Alert.alert("Success", "Order has been cancelled", [
                    {
                      text: "OK",
                      onPress: () => navigation.navigate("RestaurantTables") // Navigate to tables view instead
                    }
                  ]);
                } else {
                  Alert.alert("Error", response.data.msg || "Failed to cancel order");
                }
              } else {
                // If no existing order, just go back
                Alert.alert("Warning", "No valid order ID found to cancel", [
                  {
                    text: "OK",
                    onPress: () => navigation.goBack()
                  }
                ]);
              }
            } catch (error) {
              console.error("Error cancelling order:", error);
              Alert.alert("Error", error.response?.data?.msg || error.message || "Failed to cancel the order");
            } finally {
              setIsLoading(false);
              setLoadingMessage("");
            }
          }
        }
      ]
    );
  };

  // Add table reservation function
  

  // Update the createOrUpdateOrder function to use the new API format
  

  // Add this useEffect to initialize modal fields from customerDetails state
  useEffect(() => {
    if (customerDetails) {
      setLandmark(customerDetails.customer_landmark || "");
      setAddress(customerDetails.customer_address || "");
      setAlternativeNumber(customerDetails.customer_alternate_mobile || "");
    }
  }, [customerDetails]);

  // First, add state declarations for the modal input fields if they don't exist already
  // These should be near the other state declarations
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [alternativeNumber, setAlternativeNumber] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  // Add state for controlling the modal visibility
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);

  // Add this function to update all customer details at once when saving the modal
  const saveCustomerDetails = () => {
    // Create a new customer details object with ALL fields
    const updatedDetails = {
      customer_name: customerName,
      customer_mobile: customerMobile,
      customer_alternate_mobile: alternativeNumber,
      customer_address: address,
      customer_landmark: landmark
    };
    
    // Update the state
    setCustomerDetails(updatedDetails);
    
    console.log("Saved customer details:", updatedDetails);
    
    // Close the modal
    setShowCustomerDetailsModal(false);
  };

  // Add this function to initialize the modal fields when opening it
  const openCustomerDetailsModal = () => {
    // Set the modal fields from the current customerDetails state
    setCustomerName(customerDetails.customer_name || "");
    setCustomerMobile(customerDetails.customer_mobile || "");
    setAlternativeNumber(customerDetails.customer_alternate_mobile || "");
    setAddress(customerDetails.customer_address || "");
    setLandmark(customerDetails.customer_landmark || "");
    
    // Show the modal
    setShowCustomerDetailsModal(true);
  };

  // First, let's fix how the customer details get updated from the modal
  // Add this function to properly update the customer details state
  

  // Add this function near other state handling functions to update the customer details state
  const handleCustomerDetailsChange = (field, value) => {
    // Existing validations for main fields
    if (field === "customer_name") {
      const nameRegex = /^[a-zA-Z\s.]*$/;
      if (!nameRegex.test(value)) return;
    }
    
    if (field === "customer_mobile" || field === "customer_alternate_mobile") {
      const numberRegex = /^\d*$/;
      if (!numberRegex.test(value)) return;
      
      // If first digit is being entered, validate it starts with 6, 7, 8, or 9
      if (value.length === 1 && !['6', '7', '8', '9'].includes(value)) {
        if (field === "customer_mobile") {
          setMobileError("Mobile number must start with 6, 7, 8, or 9");
        } else {
          setAlternateMobileError("Mobile number must start with 6, 7, 8, or 9");
        }
        return;
      }
      
      // Limit to exactly 10 digits
      if (value.length > 10) {
        if (field === "customer_mobile") {
          setMobileError("Mobile number cannot exceed 10 digits");
        } else {
          setAlternateMobileError("Mobile number cannot exceed 10 digits");
        }
        return;
      }
      
      // Check if the number is less than 10 digits when it's not empty
      if (value.length > 0 && value.length < 10) {
        if (field === "customer_mobile") {
          setMobileError("Mobile number must be 10 digits");
        } else {
          setAlternateMobileError("Alternate mobile number must be 10 digits");
        }
      } else {
        // Clear error when valid input is entered or field is empty
        if (field === "customer_mobile") {
          setMobileError("");
        } else {
          setAlternateMobileError("");
        }
      }
    }
    
    // New validations for modal fields
    if (field === "customer_address") {
      // Allow alphanumeric, spaces, commas, dots, hyphens, forward slash, hash
      const addressRegex = /^[a-zA-Z0-9\s,.-/#]*$/;
      if (!addressRegex.test(value)) return;
      if (value.length > 200) return; // Reasonable address length limit
    }
    
    if (field === "customer_landmark") {
      // Allow alphanumeric, spaces, commas, dots, hyphens
      const landmarkRegex = /^[a-zA-Z0-9\s,.-]*$/;
      if (!landmarkRegex.test(value)) return;
      if (value.length > 100) return; // Reasonable landmark length limit
    }

    setCustomerDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Add a useEffect at the beginning of the component to handle existing order details
  useEffect(() => {
    // Check if we received existing order details from DemoScreen
    if (route.params?.existingOrderDetails) {
      const orderDetails = route.params.existingOrderDetails;
      console.log("🔵 Received existing order details in OrderCreate", orderDetails);
      console.log("Customer Name:", orderDetails.customer_name);
      console.log("User Name:", orderDetails.user_name);
      console.log("Customer Mobile:", orderDetails.customer_mobile);
      console.log("User Mobile:", orderDetails.user_mobile);
      
      // Set customer details directly from the passed data with fallbacks to user_name and user_mobile
      setCustomerDetails({
        customer_name: orderDetails.customer_name || orderDetails.user_name || "",
        customer_mobile: orderDetails.customer_mobile || orderDetails.user_mobile || "",
        customer_alternate_mobile: orderDetails.customer_alternate_mobile || "",
        customer_address: orderDetails.customer_address || "",
        customer_landmark: orderDetails.customer_landmark || ""
      });
      
      // Also set these directly for the modal in case that's used
      setCustomerName(orderDetails.customer_name || orderDetails.user_name || "");
      setCustomerMobile(orderDetails.customer_mobile || orderDetails.user_mobile || "");
      
      // Set other order-related values
      if (orderDetails.special_discount !== undefined) {
        setSpecialDiscount(parseFloat(orderDetails.special_discount || 0));
      }
      
      if (orderDetails.charges !== undefined) {
        setExtraCharges(parseFloat(orderDetails.charges || 0));
      }
      
      if (orderDetails.tip !== undefined) {
        setTip(parseFloat(orderDetails.tip || 0));
      }
      
      if (orderDetails.discount_percent !== undefined) {
        setDiscount(parseFloat(orderDetails.discount_percent || 0));
      }
      
      // Set payment details
      if (orderDetails.payment_method) {
        setPaymentMethod(orderDetails.payment_method.toUpperCase());
      }
      
      if (orderDetails.is_paid === "paid") {
        setIsPaid(true);
        setIsComplementary(false);
      } else if (orderDetails.is_paid === "complementary") {
        setIsPaid(false);
        setIsComplementary(true);
      }
    }
  }, [route.params?.existingOrderDetails]);

  // Add this check at the beginning of the component


  // Update the calculateTotals function to match the API response calculations
  

  // Add settings state
  const [settings, setSettings] = useState({
    print_and_save: true,
    KOT_and_save: true,
    settle: true,
  has_save:true,
    cancel: true
  });
  
  // Replace useEffect with useFocusEffect
  useFocusEffect(
    React.useCallback(() => {
      const loadSettings = async () => {
        try {
          console.log("Loading settings in OrderCreate");
          // Always get the latest settings from API
          const appSettings = await getSettings();
          console.log("Loaded settings in OrderCreate:", appSettings);
          
          // Use settings directly from API
          setSettings(appSettings);
        } catch (error) {
          console.error("Error loading settings in OrderCreate:", error);
        }
      };
      
      loadSettings();
      
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  // Update the action buttons rendering
  

 

// FIXED: Calculate discount percentage by summing all menu item offer percentages
const getDiscountPercentage = () => {
  // Using the formula provided in the requirements (sum of all offers)
  return cart.reduce((acc, item) => {
    const offer = parseFloat(item.offer) || 0;
    return acc + offer; // Simply summing up all offers
  }, 0);
};

  // Add this new useEffect to handle existingOrderDetails from navigation
  useEffect(() => {
    const handleExistingOrder = async () => {
      // Check if we have existingOrderDetails from navigation params
      const existingDetails = route.params?.existingOrderDetails;
      if (existingDetails) {
        try {
          console.log("Existing order details received:", existingDetails);
          
          // Set payment method if it exists in the existing details
          if (existingDetails.payment_method) {
            const methodLower = existingDetails.payment_method.toLowerCase();
            console.log("Setting payment method from navigation:", methodLower);
            setPaymentMethod(methodLower);
          }
          
          // Handle numeric values - ensure they're converted to strings
          const safeNumberToString = (value) => {
            if (value === null || value === undefined) return "0";
            return value.toString();
          };

          // Set special discount, charges, and tip
          setSpecialDiscount(safeNumberToString(existingDetails.special_discount));
          setExtraCharges(safeNumberToString(existingDetails.charges));
          setTip(safeNumberToString(existingDetails.tip));
          
          // Set discount percentage
          if (existingDetails.discount_percent !== undefined) {
            setDiscount(safeNumberToString(existingDetails.discount_percent));
          }

          // Set payment status
          if (existingDetails.is_paid === "paid") {
            setIsPaid(true);
            setIsComplementary(false);
          } else if (existingDetails.is_paid === "complementary") {
            setIsPaid(false);
            setIsComplementary(true);
          }
        } catch (error) {
          console.error("Error processing existing order details:", error);
        }
      }
    };

    handleExistingOrder();
  }, [route.params?.existingOrderDetails]);

  // Find the back button handler or wherever navigation back happens
  // Make sure you're passing the cart back, even when empty

  const handleGoBack = () => {
    // Pass the current cart back to the previous screen
    navigation.navigate('DemoScreen', { returnedCart: cart });
  };

  // If using a standard back button, ensure it calls this function
  // Or modify the back button press handler to include this logic

  // Add this useEffect to log the payment status for debugging
  useEffect(() => {
    if (tableData) {
      console.log("Order payment status:", {
        orderId: tableData.order_id,
        isPaid: tableData.is_paid,
        paymentStatus: tableData.payment_status,
        orderStatus: tableData.order_status
      });
    }
  }, [tableData]);

  // Helper function to safely format numeric values - add this to your component
  const safeNumberToString = (value) => {
    if (value === null || value === undefined || value === '') {
      return '0'; // Return '0' for empty values
    }
    // Remove any non-numeric characters except decimal point
    const numericValue = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
    return numericValue.toString();
  };

  // Add this PaymentModal component inside your OrderCreate component
 

  // Update handlePaymentModalConfirm to sync with main screen state
  const handlePaymentModalConfirm = (paymentMethod, isPaid) => {
    setIsPaymentModalVisible(false);
    
    // Update our local state with the values from the modal
    setSelectedPaymentMethod(paymentMethod);
    setModalIsPaid(isPaid);
    
    // Handle the current action with the selected payment method
    if (currentAction === 'kot') {
      handleKOT(paymentMethod, isPaid);
    } else {
      handleSettleOrder(paymentMethod, isPaid);
    }
  };

  // Modify the KOT button press handler
   // Update onKOTPress to format payment method correctly
   const onKOTPress = () => {
    if (cart.length === 0) {
      Alert.alert("Error", "Please add items to cart before generating KOT");
      return;
    }

    // If complementary, skip modal and proceed directly
    if (isComplementary) {
      handleKOT(null, false);
      return;
    }

    // If payment method is selected in main screen and isPaid is true
    if (isPaid && paymentMethod) {
      handleKOT(paymentMethod.toUpperCase(), isPaid);
      return;
    }

    // For existing paid orders, use their payment method
    if (orderDetails?.is_paid === "paid" && orderDetails?.payment_method) {
      handleKOT(orderDetails.payment_method.toUpperCase(), isPaid);
      return;
    }

    // If no payment method selected, show modal
    setSelectedPaymentMethod(orderDetails?.payment_method?.toUpperCase() || 'CASH');
    setCurrentAction('kot');
    setModalIsPaid(isPaid);
    setIsPaymentModalVisible(true);
  };

  // Update onSettlePress to format payment method correctly
  const onSettlePress = () => {
    if (cart.length === 0) {
      Alert.alert("Error", "Please add items to cart before settling");
      return;
    }

    // If complementary, skip modal and proceed directly
    if (isComplementary) {
      handleSettleOrder(null, false);
      return;
    }

    // If payment method is selected in main screen and isPaid is true
    if (isPaid && paymentMethod) {
      handleSettleOrder(paymentMethod.toUpperCase(), isPaid);
      return;
    }

    // For existing paid orders, use their payment method
    if (orderDetails?.is_paid === "paid" && orderDetails?.payment_method) {
      handleSettleOrder(orderDetails.payment_method.toUpperCase(), isPaid);
      return;
    }

    // If no payment method selected, show modal
    setSelectedPaymentMethod(orderDetails?.payment_method?.toUpperCase() || 'CASH');
    setCurrentAction('settle');
    setModalIsPaid(isPaid);
    setIsPaymentModalVisible(true);
  };

  // Add a new state for tracking the PAID checkbox in the modal
  const [modalIsPaid, setModalIsPaid] = useState(true);

  // Add this useEffect for Android keyboard behavior
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Configure Android to not resize the screen when keyboard appears
      if (AndroidManifest && AndroidManifest.softwareKeyboardLayoutMode) {
        AndroidManifest.softwareKeyboardLayoutMode = 'pan';
      }
    }
    
    return () => {
      // Reset when component unmounts
      if (Platform.OS === 'android' && AndroidManifest && AndroidManifest.softwareKeyboardLayoutMode) {
        AndroidManifest.softwareKeyboardLayoutMode = 'resize';
      }
    };
  }, []);

  // Add this state near your other state declarations
  const [hasCartChanged, setHasCartChanged] = useState(false);

  // Then update your useEffect that handles cart changes
  useEffect(() => {
    // Check if this is an existing order and if the cart has changed
    if (orderDetails && cart.length > 0) {
      // Simple comparison to detect if cart items have changed from original
      const originalMenuCount = orderDetails.menu_count || 0;
      const originalTotal = orderDetails.total_bill_amount || 0;
      const currentTotal = calculateSubtotal();
      
      if (cart.length !== originalMenuCount || Math.abs(currentTotal - originalTotal) > 0.01) {
        setHasCartChanged(true);
      } else {
        setHasCartChanged(false);
      }
    }
  }, [cart, orderDetails]);

  // Helper function to format payment value
  const formatPaymentValue = (value) => {
    return (value === 0 || value === 0.0 || value === "0" || value === "0.0") ? "" : value.toString();
  };

  // When setting initial values or handling response
  useEffect(() => {
    if (orderDetails) {
      setSpecialDiscount(formatPaymentValue(orderDetails.special_discount));
      setExtraCharges(formatPaymentValue(orderDetails.charges));
      setTip(formatPaymentValue(orderDetails.tip));
    }
  }, [orderDetails]);

  // In the render part, use the values directly
  <View style={styles.paymentInputsRow}>
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>Special Discount</Text>
      <TextInput
        style={styles.paymentInput}
        value={specialDiscount}
        onChangeText={(text) => setSpecialDiscount(text)}
        keyboardType="numeric"
      />
    </View>
    
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>Extra Charges</Text>
      <TextInput
        style={styles.paymentInput}
        value={extraCharges}
        onChangeText={(text) => setExtraCharges(text)}
        keyboardType="numeric"
      />
    </View>
    
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>Tip</Text>
      <TextInput
        style={styles.paymentInput}
        value={tip}
        onChangeText={(text) => setTip(text)}
        keyboardType="numeric"
      />
    </View>
  </View>

  // Add this useEffect to handle payment value updates
  useEffect(() => {
    if (route.params?.existingOrderDetails) {
      const orderDetails = route.params.existingOrderDetails;
      
      // Helper function to safely convert numbers to strings
      const safeNumberToString = (value) => {
        if (value === null || value === undefined || value === 0) return "";
        return value.toString();
      };

      // Set the payment values
      setSpecialDiscount(safeNumberToString(orderDetails.special_discount));
      setExtraCharges(safeNumberToString(orderDetails.charges));
      setTip(safeNumberToString(orderDetails.tip));
      
      // Set payment method and status
      if (orderDetails.payment_method) {
        setPaymentMethod(orderDetails.payment_method.toLowerCase());
      }
      
      if (orderDetails.is_paid === "paid") {
        setIsPaid(true);
        setIsComplementary(false);
      } else if (orderDetails.is_paid === "complementary") {
        setIsPaid(false);
        setIsComplementary(true);
      }
    }
  }, [route.params?.existingOrderDetails]);

  // First, add a new handler function for the Save button
  const handleSave = async () => {
    try {
      // Dismiss keyboard and ensure updates are processed
      Keyboard.dismiss();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Validate mobile numbers
      if (!validateMobileNumbers()) {
        return;
      }
      
      // Log customer details right before sending the request
      console.log("Customer details being used for save:", JSON.stringify(customerDetails));
      
      setIsLoading(true);
      setLoadingMessage("Processing order...");

      if (cart.length === 0) {
        Alert.alert("Error", "Please add items to cart before saving");
        return;
      }

      // Get required IDs and tokens
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token")
      ]);
      
      // Determine payment status
      const paymentStatus = isPaid ? "paid" : (isComplementary ? "complementary" : "unpaid");

      // Base request body - ensure customer details are included
      const baseRequestBody = {
        user_id: userId.toString(),
        outlet_id: restaurantId.toString(),
        order_type: orderType || "dine-in",
        order_items: cart.map((item) => ({
          menu_id: item.menu_id.toString(),
          quantity: item.quantity.toString(),
          comment: item.specialInstructions || "",
          half_or_full: (item.portion || "full").toLowerCase(),
          price: item.price?.toString() || "0",
          total_price: item.total_price?.toString() || "0",
        })),
        grand_total: cart
          .reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0)
          .toString(),
        action: "has_save",
        is_paid: paymentStatus,
        payment_method: isPaid ? paymentMethod : "",
        // Ensure customer details are included with fallbacks to empty strings
        customer_name: customerDetails.customer_name || "",
        customer_mobile: customerDetails.customer_mobile || "",
        customer_alternate_mobile: customerDetails.customer_alternate_mobile || "",
        customer_address: customerDetails.customer_address || "",
        customer_landmark: customerDetails.customer_landmark || "",
        special_discount: safeNumberToString(specialDiscount),
        charges: safeNumberToString(extraCharges),
        tip: safeNumberToString(tip),
       
      };
      
      // Log the full request body for debugging
      console.log("Sending save request body:", baseRequestBody);

      let apiResponse;
      setLoadingMessage("Saving order...");

      // Process order (create/update)
      if (tableData?.order_id) {
        const updateRequestBody = {
          ...baseRequestBody,
          order_id: tableData.order_id.toString(),
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number.toString()],
            section_id: tableData.section_id.toString(),
          }),
        };

        const updateResponse = await axiosInstance.post(
          onGetProductionUrl() + "update_order",
          updateRequestBody,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        apiResponse = updateResponse.data;
      } else {
        const createRequestBody = {
          ...baseRequestBody,
          ...(orderType === "dine-in" && {
            tables: [tableData.table_number.toString()],
            section_id: tableData.section_id.toString(),
          }),
        };

        const response = await axiosInstance.post(
          onGetProductionUrl() + "create_order",
          createRequestBody,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        apiResponse = response.data;
      }

      if (apiResponse.st === 1) {
        // Order created/updated successfully
        handleOrderSuccess(
          apiResponse.order_number || tableData?.order_number,
          "Order saved successfully!"
        );
      } else {
        throw new Error(apiResponse.msg || "Failed to save order");
      }
    } catch (error) {
      console.error("Order save error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.msg ||
          error.message ||
          "Failed to save order"
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // Now, modify the footer button rendering to include the Save button
 

    return (
    <>
      <StatusBar
        backgroundColor="#fff"
        barStyle="dark-content"
        translucent={true}
      />
      <CustomHeader
  title={tableData?.order_id || orderDetails?.order_id ? "Update Order" : "Create Order"}
  showBackButton={true}
  titleStyle={{ marginLeft: 20 }} // Move title slightly left
  onBackPress={handleBackNavigation} // Add this prop to handle back navigation
  rightComponent={
    <View style={styles.orderTypeContainer}>
      
      
      {renderOrderTypeHeader()}
    </View>
  }
/>
      {/* Use View instead of KeyboardAvoidingView for simplicity */}
      <View style={{ flex: 1 }}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            {/* Add More Items button */}
            <TouchableOpacity 
              style={styles.addMoreButton}
              onPress={() => navigateToAddMoreItems()}
            >
              <View style={styles.addMoreButtonContent}>
                <RemixIcon name="ri-add-line" size={20} color="#fff" />
                <Text style={styles.addMoreButtonText}>Add More Items</Text>
              </View>
            </TouchableOpacity>

            {/* Customer info container */}
            {renderCustomerInfoContainer()}

            {/* Cart content with improved scroll handling */}
            <View style={[styles.cartContentContainer, { flex: 1 }]}>
              {/* {cart.length > 0 && (
                <View style={styles.cartHeader}>
                  <View style={styles.cartTitleRow}>
                    <View style={styles.cartTitleContainer}>
                      <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={handleCartRefresh}
                        disabled={isRefreshingCart}
                      >
                        {isRefreshingCart ? (
                          <ActivityIndicator size="small" color="#4b89dc" />
                        ) : (
                          <RemixIcon name="refresh-line" size={20} color="#666" />
                        )}
                      </TouchableOpacity>
                      <Text style={styles.cartTitle}>
                        Items ({cart.length})
                      </Text>
                    </View>
                  </View>
                </View>
              )} */}

              {/* Improved cart items render */}
              {renderCartItems()}
            </View>

            {/* Position payment section with absolute positioning */}
            {cart.length > 0 && (
              <View style={[styles.fixedFooterContainer, { bottom: 0 }]}>
                {/* Payment Options Section */}
                <View style={styles.paymentOptionsWrapper}>
                  {renderPaymentOptions()}
                </View>
                
                {/* Pricing Footer Card */}
                <View style={styles.footerCard}>
                  {renderPricingFooter()}
                </View>
              </View>
            )}
          </View>
          
          {/* Fix tab bar to bottom of screen */}
          <View style={styles.tabBarContainer}>
            <CustomTabBar />
          </View>
        </SafeAreaView>
      </View>
      
      {/* Modals remain unchanged */}
      <DeviceSelectionModal />
      {renderCustomerDetailsModal()}
      <PaymentModal 
        visible={isPaymentModalVisible}
        onClose={() => setIsPaymentModalVisible(false)}
        onConfirm={handlePaymentModalConfirm}
        orderData={{
          order_number: tableData?.order_number || '',
          table_number: tableData?.table_number || '',
          grand_total: calculateGrandTotal().toFixed(2),
          order_type: orderType,
          is_paid: modalIsPaid,
          payment_method: selectedPaymentMethod
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 4,
  },
  statusContainer: {
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 5,
    marginTop: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCartText: {
    marginTop: 10,
    fontSize: 16,
    color: "#aaa",
  },
  cartContentContainer: {
    flex: 1,
    marginTop: 10,
    marginBottom: 170,
  },
  cartContainer: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    elevation: 5,
    marginTop: 10,
    marginHorizontal: 15,
  },
  cartTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
    marginTop: 2,
  },
  cartItem: {
    backgroundColor: "#fff",
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 2,
  },
  cartItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  removeItemButton: {
    padding: 4,
  },
  removeItemIcon: {
    color: "#000",
    fontSize: 20,
    fontWeight: "bold",
  },
  cartItemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 4,
  },
  leftContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 28,
  },
  quantityButton: {
    backgroundColor: "#FF9A6C",
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 0,
  },
  quantityButtonText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    lineHeight: 24,
    textAlign: "center",
    textAlignVertical: "center",
  },
  quantityText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: "center",
  },
  portionText: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "500",
    color: "#219ebc",
  },
  searchBar: {
    margin: 10,
    padding: 10,
    borderTopLeftRadius: 8, // Radius for bottom-left corner
    borderTopRightRadius: 8, // Radius for bottom-right corner
    backgroundColor: "#fff",
    elevation: 2, // Android shadow
    shadowColor: "#000", // iOS shadow color
    shadowOffset: { width: 0, height: 2 }, // iOS shadow offset
    shadowOpacity: 0.1, // iOS shadow opacity
    shadowRadius: 4, // iOS shadow blur radius
  },
  dropdown: {
    position: "absolute",
    top: 53,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    maxHeight: "50%", // Limit dropdown height to 50% of screen
    zIndex: 1, // Lower zIndex so footer stays on top
    overflow: "scroll", // Allow scrolling within dropdown
  },
  menuCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginVertical: 4,
    borderRadius: 8,
    elevation: 2,
    padding: 8,
  },
  menuImage: {
    width: 80,
    height: "auto",
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 80,
    height: "auto",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "black", // Red border color
    borderStyle: "solid",
    borderRadius: 8,
  },
  placeholderText: {
    color: "#aaa",
  },
  menuDetails: {
    flex: 1,
    marginLeft: 8,
  },
  menuNamePriceContainer: {
    marginBottom: 4,
  },
  menuName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  menuPriceWrapper: {
    marginVertical: 4,
  },
  menuPriceText: {
    fontSize: 13,
    color: "#219ebc",
    fontWeight: "500",
    marginBottom: 2,
  },
  offerText: {
    color: "#28a745",
    fontSize: 12,
    fontWeight: "500",
  },
  menuCategoryRatingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  menuCategoryContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuCategory: {
    fontSize: 10,
    color: "#28a745",
    marginLeft: 5,
  },
  menuRatingContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 150,
  },
  floatingButton: {
    flexDirection: "row",
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#FF9A6C",
    borderRadius: 30,
    padding: 10,
    alignItems: "center",
  },
  floatingButtonText: {
    color: "#fff",
    marginLeft: 5,
    fontSize: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#aaa",
    marginTop: 20,
    fontSize: 16,
  },
  quantityCartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerCard: {
    position: "absolute",
    bottom: 70,
    left: 8,
    right: 8,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    elevation: 5,
    borderColor: "#ddd",
    borderWidth: 1,
    zIndex: 2,
    // Add these to ensure visibility with keyboard
   
  },
  footerPricing: {
    marginBottom: 10,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingLeft: 4, // Reduced from 8
    paddingRight: 4, // Added to ensure consistent spacing
  },
  pricingLabel: {
    fontSize: 10, // Reduced from 11
    color: '#666',
    textAlign: 'center',
    marginTop: 0,
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    textAlign: 'center',
    marginBottom: 1,
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: 1,
  },
  priceLabel: {
    fontSize: 10, // Reduced from 11
    color: '#666',
    textAlign: 'center',
    marginTop: 0,
  },
  grandTotalBlock: {
    alignItems: 'center',
    minWidth: 70, // Reduced from 75
    marginLeft: 'auto',
    marginRight: 4, // Reduced from 8
    flex: 1.2, // Slightly larger flex to ensure grand total has enough space
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 1,
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 8,
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 5,
    width: 36, // Fixed width for icon button
    alignItems: "center",
    justifyContent: "center",
  },
  footerButton: {
    padding: 8,
    borderRadius: 5,
    flex: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginLeft: 8,
  },
  footerButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 4,
    fontSize: 13,
  },
  cartHeader: {
    marginBottom: 5,
  },
  cartTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clearCartButton: {
    padding: 5,
  },
  clearCartText: {
    color: "red",
    fontSize: 14,
  },
  tableInfoContainer: {
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tableInfoText: {
    color: "black",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  orderTypeContainer: {
    paddingRight: 8,
    marginRight: 10,
    minWidth: 90, // Increase this value as needed
    justifyContent: "center",
    alignItems: "flex-end",
  },
  orderTypeHeaderContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#000000",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#fff",
  },
  menuNamePriceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  menuName: {
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  portionDropdownContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  portionDropdownContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    maxWidth: 300,
  },
  portionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  portionOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  portionCloseButton: {
    marginTop: 15,
    padding: 10,
    alignItems: "center",
  },
  portionCloseText: {
    color: "red",
  },
  cartTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshButton: {
    position: "absolute",
    right: -30,
    top: -1,
    padding: 2,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  refreshButtonText: {
    color: "#219ebc",
    fontSize: 12,
    fontWeight: "500",
  },
  offerText: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "500",
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  menuPrice: {
    fontSize: 14,
    color: "#219ebc",
    marginTop: 2,
  },
  cartItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  removeButton: {
    padding: 4,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  priceRemoveContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  printerControls: {
    position: "absolute",
    bottom: 75, // Position it right below the footer card
    left: 8,
    right: 8,
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    elevation: 5,
    borderColor: "#ddd",
    borderWidth: 1,
  },
  scanButton: {
    backgroundColor: "#219ebc",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  connectedText: {
    color: "#28a745",
    textAlign: "center",
    marginTop: 4,
    fontSize: 12,
  },
  unsupportedText: {
    color: "#666",
    textAlign: "center",
    padding: 10,
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
    zIndex: 1000,
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
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
    position: "relative", // For absolute positioning of refresh button
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  deviceList: {
    maxHeight: 300,
  },
  deviceItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  noDevicesText: {
    textAlign: "center",
    color: "#666",
    padding: 20,
  },
  closeButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#219ebc",
    borderRadius: 5,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  cartListContent: {
    paddingHorizontal: 10,
    paddingTop: 5,
    // Don't set paddingBottom here as we're setting it dynamically in renderCartItems
  },
  quantityButtonUpdated: {
    backgroundColor: "#f0f0f0", // Light gray background
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14, // Make it circular
    borderWidth: 1,
    borderColor: "#ddd",
  },
  quantityButtonTextUpdated: {
    color: "#333", // Dark text color
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 20,
    textAlign: "center",
    textAlignVertical: "center",
  },
  connectionStatus: {
    textAlign: "center",
    marginVertical: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    fontSize: 14,
  },
  successText: {
    backgroundColor: "#d4edda",
    color: "#155724",
    borderColor: "#c3e6cb",
    borderWidth: 1,
  },
  errorText: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    borderColor: "#f5c6cb",
    borderWidth: 1,
  },
  connectingText: {
    backgroundColor: "#fff3cd",
    color: "#856404",
    borderColor: "#ffeeba",
    borderWidth: 1,
  },
  deviceItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    opacity: (props) => (props.disabled ? 0.5 : 1), // Add opacity when disabled
  },

  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
    position: "relative",
  },

  refreshButton: {
    position: "absolute",
    right: 20,
    top: 20,
    padding: 8,
    zIndex: 1,
  },

  scanningContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },

  scanningText: {
    marginLeft: 10,
    color: "#219ebc",
    fontSize: 14,
  },

  connectionStatus: {
    textAlign: "center",
    marginVertical: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    fontSize: 14,
  },

  successText: {
    backgroundColor: "#d4edda",
    color: "#155724",
    borderColor: "#c3e6cb",
    borderWidth: 1,
  },

  errorText: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    borderColor: "#f5c6cb",
    borderWidth: 1,
  },

  connectingText: {
    backgroundColor: "#fff3cd",
    color: "#856404",
    borderColor: "#ffeeba",
    borderWidth: 1,
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
    color: "#333",
  },

  deviceId: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },

  noDevicesText: {
    textAlign: "center",
    color: "#666",
    padding: 20,
    fontSize: 14,
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

  successText: {
    backgroundColor: "#d4edda",
    color: "#155724",
    borderColor: "#c3e6cb",
    borderWidth: 1,
  },

  connectingText: {
    backgroundColor: "#fff3cd",
    color: "#856404",
    borderColor: "#ffeeba",
    borderWidth: 1,
  },

  errorText: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    borderColor: "#f5c6cb",
    borderWidth: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  refreshButton: {
    padding: 5, // Add padding for better touch area
  },
  addMoreButton: {
    backgroundColor: '#0dcaf0',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  addMoreButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cartSection: {
    marginBottom: 20,
  },
  unitPrice: {
    fontSize: 15,
    fontWeight: "500",
    color: "#219ebc",
    marginRight: 8,
    
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerInfoContainer: {
    flexDirection: 'row',
    marginVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  customerInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  addCustomerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  customerDetailsModal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxWidth: 300,
  },
  modalInput: {
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#219ebc',
  },
  cancelButtonText: {
    color: '#333',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  customerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 8,
    justifyContent: 'space-between',
  },
  customerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    flex: 1,
    marginRight: 8,
    fontSize: 14,
  },
  addCustomerButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerDetailsModal: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginVertical: 8,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#219ebc',
  },
  cancelButtonText: {
    color: '#333',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalCloseButton: {
    padding: 5,
    borderRadius: 5,
    backgroundColor: '#ccc',
    alignItems: 'center',
  },
  cancelModalButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginRight: 5,
    alignItems: 'center',
  },
  saveModalButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginLeft: 5,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#444',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  cancelModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
    flex: 1,
    marginRight: 8,
  },
  saveModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 4,
    flex: 1,
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
    marginLeft: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 5,
  },
  customerDetailsModal: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 500,
  },
 // Updated styles for the footer
footerContainerMain: {
  paddingHorizontal: 0,
  paddingTop: 6, // Reduced from 8
  paddingBottom: 1,
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: '#eee',

},
pricingRow: {
  flexDirection: 'row',
  alignItems: 'flex-start', // Changed from center to align from top
  marginBottom: 8, // Reduced from 10
  paddingBottom: 8, // Reduced from 10
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
  paddingLeft: 8, // Added to move everything left
},
priceBlock: {
  marginHorizontal: 0, // Removed horizontal margin
  alignItems: 'center',
  minWidth: 60, // Reduced from 65
  marginRight: 4, // Reduced from 8 to bring items closer
  flex: 1, // Added to distribute space evenly
},
priceValue: {
  fontSize: 14,
  fontWeight: '500',
  color: '#000',
  textAlign: 'center',
  marginBottom: 1,
},
discountValue: {
  fontSize: 14,
  fontWeight: '500',
  color: '#FF0000',
  textAlign: 'center',
  marginBottom: 1,
},
priceLabel: {
  fontSize: 10, // Reduced from 11
  color: '#666',
  textAlign: 'center',
  marginTop: 0,
},
grandTotalBlock: {
  alignItems: 'center',
  minWidth: 70, // Reduced from 75
  marginLeft: 'auto',
  marginRight: 4, // Reduced from 8
  flex: 1.2, // Slightly larger flex to ensure grand total has enough space
},
grandTotalValue: {
  fontSize: 14,
  fontWeight: '500',
  color: '#4CAF50', // Green color for grand total
},
actionButtonsRow: {
  flexDirection: 'row',
  marginBottom: 8,
  height: 44,
},
secondaryButtonsRow: {
  flexDirection: 'row',
  height: 44,
},
printSaveButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f39c12',
  borderRadius: 4,
  marginRight: 6,
  height: '100%',
},
kotButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#000',
  borderRadius: 4,
  marginHorizontal: 3,
  height: '100%',
},
settleButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#3498db',
  borderRadius: 0,
  marginLeft: 6,
  height: '100%',
},
buttonText: {
  color: '#fff',
  fontWeight: '500',
  fontSize: 13,
  marginLeft: 5,
},
lockButton: {
  width: 44, 
  height: '100%',
  backgroundColor: '#f2f2f2',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 4,
  marginRight: 6,
},
kotSaveButton: {
  flex: 2,
  flexDirection: 'row',
  backgroundColor: '#000',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  height: '100%',
},
closeButton: {
  width: 44,
  height: '100%',
  backgroundColor: '#e74c3c',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 4,
  marginLeft: 6,
},
saveButton: {
  flex: 1,
  flexDirection: 'row',
  backgroundColor: '#28a745',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  height: '100%',
  marginRight: 6,
},
paymentOptionsContainer: {
  
  backgroundColor: '#fff',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#eee',
},
expandButton: {
  width: '100%',
  alignItems: 'center',
  paddingVertical: 4,
  borderBottomColor: '#eee',
},
paymentOptionsContent: {
  padding: 8,
},
paymentInputsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
 
},
inputBlock: {
  flex: 1,
  marginHorizontal: 4,
},
inputLabel: {
  fontSize: 12,
  color: '#666',
  marginBottom: 4,
},
paymentInput: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 4,
  padding: 4,
  textAlign: 'center',
  marginBottom: 4,
},
paymentMethodRow: {
  flexDirection: 'row',
  alignItems: 'center',
},
radioOptionContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginRight: 15, // Increase from 12 to 15
  minWidth: 70, // Add minWidth to ensure enough space
  paddingRight: 5, // Add padding to prevent text from being cut off at the edge
},
radioButton: {
  width: 18,
  height: 18,
  borderRadius: 9,
  borderWidth: 2,
  borderColor: '#ccc',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 6
},
radioButtonSelected: {
  borderColor: '#55C2FF'
},

checkbox: {
  width: 18,
  height: 18,
  borderRadius: 4,
  borderWidth: 2,
  borderColor: '#ccc',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 6
},
checkboxChecked: {
  backgroundColor: '#55C2FF',
  borderColor: '#55C2FF'
},
optionText: {
  fontWeight: '500',
  color: '#333',
  fontSize: 14,
},
checkboxContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},
checkbox: {
  width: 20,
  height: 20,
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 4,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 6,
},
checkedCheckbox: {
  backgroundColor: '#4CAF50',
  borderColor: '#4CAF50',
},
// Add this to your StyleSheet
bottomSection: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#fff',
},

paymentOptionsWrapper: {
  position: 'absolute',
  bottom: 255,
  left: 8,
  right: 8,
  backgroundColor: '#fff',
  borderRadius: 10,
  elevation: 5,
  borderColor: '#ddd',
  borderWidth: 1,
  marginBottom: 0, // Changed from 8 to 0
  zIndex: 11,
},

footerCard: {
  position: 'absolute',
  bottom: 70,
  left: 8,
  right: 8,
  backgroundColor: '#fff',
  padding: 12,
  borderRadius: 10,
  elevation: 5,
  borderColor: '#ddd',
  borderWidth: 1,
  zIndex: 12,
  android_hyphenationFrequency: 'none',
},

checkboxesRow: {
  flexDirection: 'row',
  justifyContent: 'flex-start',
  alignItems: 'center',
  marginBottom: 12,
  gap: 24,
},



paymentOptionsContent: {
  padding: 8,
},

paymentInputsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 8,
},

paymentOptionsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 4,
},

paymentMethodsContainer: {
  flex: 1,
  flexDirection: 'row',
  justifyContent: 'flex-start',
  gap: 16,
},

paidCheckbox: {
  marginLeft: 'auto',
},

radioOptionContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},

// Add these styles to your StyleSheet
customerDetailsContainer: {
  backgroundColor: '#f8f9fa',
  borderRadius: 10,
  padding: 12,
  marginTop: 16,
  marginBottom: 16,
  marginHorizontal: 8,
  borderWidth: 1,
  borderColor: '#e1e1e1',
},
sectionHeading: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 12,
  color: '#333',
},
detailsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
},
detailLabel: {
  width: 80,
  fontSize: 16,
  color: '#555',
},
detailInput: {
  flex: 1,
  height: 40,
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 4,
  paddingHorizontal: 10,
  backgroundColor: '#fff',
},
// Add these styles to your StyleSheet
billNumberContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 10,
},
billNumberText: {
  fontSize: 14,
  fontWeight: '500',
  color: '#0dcaf0', // Use the app's theme color
},
orderTypeContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
},
// Add this style to your StyleSheet
orderNumberIndicator: {
  fontSize: 12,
  color: "#0dcaf0",
  fontWeight: "500",
  marginTop: 2,
  textAlign: "center",
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

// Add these styles to your StyleSheet
safeArea: {
  flex: 1,
  backgroundColor: "#fff",
},

container: {
  flex: 1,
  position: 'relative',
  backgroundColor: '#fff',
},



scrollViewContent: {
  flexGrow: 1,
  paddingBottom: 20, // Base padding
},

menuItemsContainer: {
  flex: 1,
},

// This creates extra space at the bottom when payment is open
bottomScrollSpace: {
  height: 280, // Adjust this value based on the height of your payment section
},

paymentSectionContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: '#ddd',
  paddingTop: 10,
  paddingBottom: Platform.OS === 'ios' ? 25 : 10,
  paddingHorizontal: 15,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -3 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 5,
  zIndex: 100,
},

// Add these to your existing styles
modalContainer: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContent: {
  backgroundColor: '#fff',
  borderRadius: 8,
  padding: 20,
  width: '90%',
  maxWidth: 500,
},

closeModalButton: {
  position: 'absolute',
  top: 10,
  right: 10,
  padding: 5,
},
paymentModalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 20,
},
paymentMethodLabel: {
  fontSize: 16,
  color: '#666',
  marginBottom: 10,
},

paymentMethodsRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginBottom: 15,
},
paymentOption: {
  marginRight: 20,
  marginBottom: 10,
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
  borderColor: '#ccc',
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
  minWidth: 60, // Increase from 45 to 60
  fontWeight: '500', // Make text slightly bolder
  paddingHorizontal: 5, // Add horizontal padding
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
  borderRadius: 4,
},
settleButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
  marginLeft: 8,
},
// Add this to your existing styles
settleButtonDisabled: {
  backgroundColor: '#cccccc',
  opacity: 0.7,
},
fixedFooterContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: '#ddd',
  zIndex: 10,
  // Add these styles to keep it fixed regardless of keyboard
  position: 'absolute',
  elevation: 8,
},
tabBarContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 15,  // Increased zIndex to ensure it stays on top
  backgroundColor: '#fff',
},

// Add this to your StyleSheet
cartItemsContainer: {
  flex: 1,
  flexGrow: 1, 
  height: '100%',
  position: 'relative',
  overflow: 'visible', // Make sure nothing is clipped
},

// Update the cartContentContainer style 
cartContentContainer: {
  flex: 1,
  position: 'relative',
  overflow: 'visible', // Allow content to overflow
},

// Add a more specific style for the container holding the FlatList
cartListContent: {
  paddingHorizontal: 10,
  paddingTop: 5,
  // Removed paddingBottom as we're setting it dynamically
},

cartHeader: {
  paddingHorizontal: 10,
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},

cartTitleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},

cartItem: {
  backgroundColor: '#fff',
  padding: 10,
  marginHorizontal: 10,
  marginVertical: 5,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#eee',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 1,
  elevation: 2,
},

// Make sure the fixed footer is properly positioned without interfering with the list
fixedFooterContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: '#ddd',
  zIndex: 10,
  elevation: 8,

  posSettingsButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    padding: 8,
    zIndex: 100,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  settingButton: {
    backgroundColor: '#0dcaf0',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statusText: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    fontSize: 14,
    color: '#666',
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
 
  paymentMethodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '95%',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: 4,
  },
  radioButtonSelected: {
    borderColor: '#0dcaf0',
  },


  paidCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
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
  settleButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  kotButton: {
    backgroundColor: '#000',
  },
  arrowLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dashLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  arrowIcon: {
    marginHorizontal: 8,
  },

}
});

export default OrderCreate;