import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
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
  Switch,
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
  const [printerDevice, setPrinterDevice] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  // Add this state to track printer connection
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  // Add this to handle keyboard behavior
  const [isPOSTerminal, setIsPOSTerminal] = useState(false);
const [posSDKInitialized, setPosSDKInitialized] = useState(false);
const [showPOSSettings, setShowPOSSettings] = useState(false);

  // Add new state for refresh button loading
  const [isRefreshingCart, setIsRefreshingCart] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState("");

  const existingOrderDetails = route.params?.existingOrderDetails;


  // Add this state at the top with other state declarations
  const [isSaving, setIsSaving] = useState(false);

  // Add these new state variables at the top of the component with other state declarations
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [specialDiscount, setSpecialDiscount] = useState('');
  const [extraCharges, setExtraCharges] = useState('');
  const [tip, setTip] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // Default to CARD as shown in image
  const [isPaid, setIsPaid] = useState(false); // Changed from true to false to not be checked by default
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [currentAction, setCurrentAction] = useState(null); // To track whether KOT or Settle was clicked

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
  } = usePrinter();


  useEffect(() => {
    // Run this immediately when component mounts
    checkIfPOSTerminal();
  }, []);

  // Improved POS terminal detection function
  const checkIfPOSTerminal = async () => {
    try {
      console.log("Checking if device is a POS terminal...");
      
      // First check if setting is explicitly set
      const posPrinterSetting = await AsyncStorage.getItem("use_pos_printer");
      if (posPrinterSetting === "true") {
        console.log("POS terminal mode enabled by settings");
        setIsPOSTerminal(true);
        return true;
      }
      
      // Try to detect based on device model and manufacturer
      // Fix for Expo Go - use the correct Device API based on what's available
      let deviceName = "Unknown";
      let manufacturer = "Unknown";
      
      try {
        // Try different methods that might be available in different Expo versions
        if (Device.deviceName) {
          // Property access (newer versions)
          deviceName = Device.deviceName;
        } else if (typeof Device.getDeviceName === 'function') {
          // Synchronous method (some versions)
          deviceName = Device.getDeviceName();
        }
        
        // Same for manufacturer
        if (Device.manufacturer) {
          manufacturer = Device.manufacturer;
        } else if (typeof Device.getManufacturerAsync === 'function') {
          manufacturer = await Device.getManufacturerAsync();
        }
      } catch (deviceError) {
        console.log("Error accessing device info:", deviceError);
        // Continue with default values if there's an error
      }
      
      console.log(`Device info - Name: ${deviceName}, Manufacturer: ${manufacturer}`);
      
      // Check against known POS manufacturers/models
      const knownPOSDevices = [
        "sunmi", "posiflex", "partner", "verifone", "pax", "ingenico", 
        "elo", "pos", "terminal", "vx520", "vx670", "p2000", "p2100",
        "newland", "pt", "v1s", "android pos"
      ];
      
      const deviceNameLower = deviceName?.toLowerCase() || "";
      const manufacturerLower = manufacturer?.toLowerCase() || "";
      
      let isPOS = false;
      
      for (const keyword of knownPOSDevices) {
        if (deviceNameLower.includes(keyword) || manufacturerLower.includes(keyword)) {
          isPOS = true;
          console.log(`Detected as POS terminal (matched: ${keyword})`);
          break;
        }
      }
      
      // In Expo Go, we can't reliably detect POS features
      // So also check if we're in Expo Go and allow manual override
      const isExpoGo = Constants.appOwnership === 'expo';
      if (isExpoGo) {
        console.log("Running in Expo Go - can't reliably detect POS hardware");
        // Don't automatically set isPOS to true in Expo Go
        // Let the user toggle it manually for testing
      }
      
      setIsPOSTerminal(isPOS);
      
      if (isPOS && !isExpoGo) {
        // Save the preference for future use, but not in Expo Go
        await AsyncStorage.setItem("use_pos_printer", "true");
      }
      
      return isPOS;
    } catch (error) {
      console.error("Error detecting POS terminal:", error);
      return false;
    }
  };

  // Helper function to check for POS printer services (Android-specific)
  const hasPOSPrinterServices = async () => {
    // This is conceptual and would need to be implemented with native modules
    // For now, we'll simulate this check
    if (NativeModules.POSPrinter || 
        global.sunmiPrinter || 
        NativeModules.InnerPrinterManager ||
        NativeModules.PAXPrinter) {
      return true;
    }
    return false;
  };

  const initPOSSDK = async () => {
    try {
      // Check if any of the known SDKs are available
      if (global.sunmiPrinter) {
        // Sunmi POS terminals
        await global.sunmiPrinter.initPrinter();
        setPosSDKInitialized(true);
        console.log("Sunmi POS printer initialized");
      } else if (NativeModules.PosPrinter) {
        // Generic POS printer module
        await NativeModules.PosPrinter.init();
        setPosSDKInitialized(true);
        console.log("Generic POS printer initialized");
      } else if (NativeModules.PAXPrinter) {
        // PAX terminals
        await NativeModules.PAXPrinter.initPrinter();
        setPosSDKInitialized(true);
        console.log("PAX POS printer initialized");
      } else {
        // No recognized SDK found
        console.log("No recognized POS SDK found");
      }
    } catch (error) {
      console.error("Failed to initialize POS SDK:", error);
    }
  };



  const printToPOSTerminal = async (orderData, type = "KOT") => {
    try {
      setLoadingMessage(`Printing ${type} to POS terminal...`);
      
      // Generate the print content (either KOT or receipt)
      const htmlContent = type === "KOT" 
        ? await generateKOTHTML(orderData)
        : await generateReceiptHTML(orderData);
      
      // Try various SDKs based on the terminal model
      if (global.sunmiPrinter) {
        // Sunmi POS terminals
        // First, reset the printer
        await global.sunmiPrinter.initPrinter();
        
        // Set alignment to center
        await global.sunmiPrinter.setAlignment(1);
        
        // Print the restaurant name in bold and larger size
        await global.sunmiPrinter.setFontSize(2);
        await global.sunmiPrinter.setBold(true);
        const restaurantName = await getRestaurantName() || "Restaurant";
        await global.sunmiPrinter.printText(restaurantName + "\n");
        
        // Reset font settings
        await global.sunmiPrinter.setFontSize(1);
        await global.sunmiPrinter.setBold(false);
        
        // Print order information
        await global.sunmiPrinter.printText("--------------------------------\n");
        await global.sunmiPrinter.printText(`${type} #: ${orderData.order_number || ""}\n`);
        await global.sunmiPrinter.printText(`Date: ${new Date().toLocaleString()}\n`);
        await global.sunmiPrinter.printText(`Table: ${tableData?.table_number || ""}\n`);
        await global.sunmiPrinter.printText("--------------------------------\n\n");
        
        // Print items header
        await global.sunmiPrinter.setBold(true);
        await global.sunmiPrinter.printText("ITEMS\n");
        await global.sunmiPrinter.setBold(false);
        
        // Print each item
        const items = cart.map(item => ({
          name: item.name || "",
          quantity: item.quantity || 0,
          price: item.price || 0,
          portion: item.portion || "full"
        }));
        
        for (const item of items) {
          const portionText = item.portion === "half" ? " (Half)" : "";
          await global.sunmiPrinter.printText(`${item.name}${portionText}\n`);
          await global.sunmiPrinter.printText(`  x${item.quantity}  $${item.price.toFixed(2)}\n`);
        }
        
        await global.sunmiPrinter.printText("\n--------------------------------\n");
        
        // Print totals for receipt only
        if (type === "Receipt") {
          await global.sunmiPrinter.printText(`Subtotal: $${calculateTotal().toFixed(2)}\n`);
          
          const discount = calculateTotalDiscount();
          if (discount > 0) {
            await global.sunmiPrinter.printText(`Discount: -$${discount.toFixed(2)}\n`);
          }
          
          const serviceCharge = calculateService();
          if (serviceCharge > 0) {
            await global.sunmiPrinter.printText(`Service Charge: $${serviceCharge.toFixed(2)}\n`);
          }
          
          const gst = calculateGST();
          if (gst > 0) {
            await global.sunmiPrinter.printText(`GST: $${gst.toFixed(2)}\n`);
          }
          
          await global.sunmiPrinter.setBold(true);
          await global.sunmiPrinter.printText(`TOTAL: $${calculateGrandTotal().toFixed(2)}\n`);
          await global.sunmiPrinter.setBold(false);
          
          await global.sunmiPrinter.printText("--------------------------------\n");
          await global.sunmiPrinter.printText(`Payment Method: ${paymentMethod.toUpperCase()}\n`);
          await global.sunmiPrinter.printText(`Paid: ${isPaid ? "Yes" : "No"}\n\n`);
        }
        
        // Print footer
        await global.sunmiPrinter.setAlignment(1);
        await global.sunmiPrinter.printText("Thank You!\n\n");
        await global.sunmiPrinter.printText("Powered by MenuMitra\n\n\n");
        
        // Cut paper
        await global.sunmiPrinter.cutPaper();
        
        return true;
      } else if (NativeModules.PosPrinter) {
        // Generic POS printer
        return await NativeModules.PosPrinter.printReceipt({
          content: htmlContent,
          type: type
        });
      } else if (NativeModules.PAXPrinter) {
        // PAX terminals
        return await NativeModules.PAXPrinter.printHtml(htmlContent);
      } else {
        // Try using print via document.write if on a browser-capable POS
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
          return true;
        }
        
        throw new Error("No compatible POS printing method available");
      }
    } catch (error) {
      console.error(`Error printing to POS terminal:`, error);
      throw error;
    }
  };


  const generatePlainTextReceipt = (orderData) => {
    let receipt = "";
    
    // Header
    receipt += `${restaurantName || "Restaurant"}\n\n`;
    receipt += `Order #: ${orderData.order_number || ""}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n`;
    receipt += `Table: ${tableData?.table_number || ""}\n`;
    receipt += "--------------------------------\n\n";
    
    // Items
    receipt += "ITEMS\n";
    cart.forEach(item => {
      const portionText = item.portion === "half" ? " (Half)" : "";
      receipt += `${item.name}${portionText}\n`;
      receipt += `  x${item.quantity}  $${item.price.toFixed(2)}\n`;
    });
    
    receipt += "\n--------------------------------\n";
    
    // Totals
    receipt += `Subtotal: $${calculateTotal().toFixed(2)}\n`;
    
    const discount = calculateTotalDiscount();
    if (discount > 0) {
      receipt += `Discount: -$${discount.toFixed(2)}\n`;
    }
    
    const serviceCharge = calculateService();
    if (serviceCharge > 0) {
      receipt += `Service Charge: $${serviceCharge.toFixed(2)}\n`;
    }
    
    const gst = calculateGST();
    if (gst > 0) {
      receipt += `GST: $${gst.toFixed(2)}\n`;
    }
    
    receipt += `TOTAL: $${calculateGrandTotal().toFixed(2)}\n`;
    receipt += "--------------------------------\n";
    receipt += `Payment Method: ${paymentMethod.toUpperCase()}\n`;
    receipt += `Paid: ${isPaid ? "Yes" : "No"}\n\n`;
    receipt += "Thank You!\n\n";
    receipt += "Powered by MenuMitra\n\n";
    
    return receipt;
  };



  const togglePOSTerminalMode = async (value) => {
    try {
      await AsyncStorage.setItem("use_pos_printer", value ? "true" : "false");
      setIsPOSTerminal(value);
      if (value) {
        initPOSSDK();
      }
      Alert.alert(
        "POS Printer Mode",
        value 
          ? "Device will now use internal printer." 
          : "Device will now look for external printers."
      );
    } catch (error) {
      console.error("Error saving POS printer setting:", error);
    }
  };
  
  // Add a diagnostic function to check POS printer status
  const checkPOSPrinterStatus = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage("Checking POS printer status...");
      
      if (!isPOSTerminal) {
        Alert.alert("POS Printer", "Device is not in POS printer mode.");
        return;
      }
      
      let status = "Unknown";
      
      if (global.sunmiPrinter) {
        status = await global.sunmiPrinter.getPrinterStatus();
      } else if (NativeModules.PosPrinter) {
        const result = await NativeModules.PosPrinter.getStatus();
        status = result.status;
      } else if (NativeModules.PAXPrinter) {
        const result = await NativeModules.PAXPrinter.getPrinterStatus();
        status = result;
      }
      
      Alert.alert(
        "POS Printer Status",
        `Printer Status: ${status}\nPOS SDK Initialized: ${posSDKInitialized ? "Yes" : "No"}`
      );
    } catch (error) {
      console.error("Error checking POS printer status:", error);
      Alert.alert("Error", "Failed to check POS printer status: " + error.message);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };
  
  // Add a UI button for printing test receipt on POS printer
  const printPOSTestReceipt = async () => {
    try {
      if (!isPOSTerminal || !posSDKInitialized) {
        Alert.alert("POS Printer", "POS printer is not available or initialized.");
        return;
      }
      
      setIsLoading(true);
      setLoadingMessage("Printing test receipt...");
      
      const testOrderData = {
        order_number: "TEST-123",
        table_number: tableData?.table_number || "N/A",
        items: [
          { name: "Test Item 1", quantity: 1, price: 10.99, portion: "full" },
          { name: "Test Item 2", quantity: 2, price: 5.99, portion: "half" }
        ]
      };
      
      await printToPOSTerminal(testOrderData, "Test");
      Alert.alert("Success", "Test receipt printed successfully.");
    } catch (error) {
      console.error("Error printing test receipt:", error);
      Alert.alert("Error", "Failed to print test receipt: " + error.message);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

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

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

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
    const subtotal = calculateTotal();
    const menuDiscount = calculateMenuDiscount();
    return parseFloat((subtotal - menuDiscount).toFixed(2));
  };


  const calculateTotalAfterSpecialDiscount = () => {
    const totalAfterMenuDiscount = calculateTotalAfterMenuDiscount();
    const discountRate = parseFloat(discount) || 0;
    const discountAmount = ((totalAfterMenuDiscount * discountRate) / 100);
    const specialDiscountAmount = parseFloat(specialDiscount) || 0;
    return parseFloat((totalAfterMenuDiscount - discountAmount - specialDiscountAmount).toFixed(2));
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
    const totalAfterExtraCharges = calculateTotalAfterExtraCharges();
    const serviceRate = parseFloat(restaurantConfig.service_charges) || 0;
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
    const totalAfterService = calculateTotalAfterService();
    const gstRate = parseFloat(restaurantConfig.gst) || 0;
    return parseFloat(((totalAfterService * gstRate) / 100).toFixed(2));
  };

  // Fix grand total calculation to reflect the new calculation flow
  const calculateGrandTotal = () => {
    const totalAfterService = calculateTotalAfterService();
    const gstAmount = calculateGST();
    const tipAmount = parseFloat(tip) || 0;
    return parseFloat((totalAfterService + gstAmount + tipAmount).toFixed(2));
  };

  // Calculate total discount (including menu discounts)
  const calculateTotalDiscount = () => {
    return calculateMenuDiscount();
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
    Alert.alert(
      "Success",
      message,
      [
        {
          text: "OK",
          onPress: () => {
            // Clear the cart
            setCart([]);
            // First navigate to MainScreen
            
           
            setTimeout(() => {
              navigation.navigate("RestaurantTables");
            }, 100);
          },
        },
      ],
      { cancelable: false }
    );
  };
  const createOrUpdateOrder = async (action = "create_order") => {
    try {
      if (cart.length === 0) {
        Alert.alert("Error", "Please add items to cart before creating order");
        return;
      }

      // Capture the current cart to a local const to ensure it doesn't change
      const currentCart = [...cart];

      // Use isSaving instead of isLoading
      setIsSaving(true);
      setLoadingMessage("Processing order...");

      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const orderItems = currentCart.map((item) => ({
        menu_id: item.menu_id.toString(),
        quantity: item.quantity.toString(),
        comment: (item.specialInstructions || "").trim(),
        half_or_full: (item.portion || "full").toLowerCase(),
        price: item.price?.toString() || "0",
        total_price: item.total_price?.toString() || "0",
      }));

      // Base request body for all order types
      const baseRequestBody = {
        user_id: userId.toString(),
        outlet_id: restaurantId.toString(),
        order_type: orderType || "dine-in",
        order_items: orderItems,
        grand_total: orderItems
          .reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0)
          .toString(),
        action: action,
        customer_name: customerDetails.customer_name || "",
        customer_mobile: customerDetails.customer_mobile || "",
        customer_alternate_mobile: customerDetails.customer_alternate_mobile || "",
        customer_address: customerDetails.customer_address || "",
        customer_landmark: customerDetails.customer_landmark || "",
      };

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
          "Update Request Body:",
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

        if (updateResponse.data.st !== 1) {
          throw new Error(updateResponse.data.msg || "Failed to update order");
        }

        // Then update status if needed
        if (action === "create_order" || action === "settle") {
          const statusRequestBody = {
            outlet_id: restaurantId.toString(),
            order_id: tableData.order_id.toString(),
            order_status: action === "settle" ? "paid" : "cooking",
            user_id: userId.toString(),
            action: action,
            order_type: orderType || "dine-in",
            ...(orderType === "dine-in" && {
              tables: [tableData.table_number.toString()],
              section_id: tableData.section_id.toString(),
            }),
          };

          console.log(
            "Status Update Body:",
            JSON.stringify(statusRequestBody, null, 2)
          );

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

          if (statusResponse.data.st !== 1) {
            throw new Error(
              statusResponse.data.msg || "Failed to update order status"
            );
          }
        }

        handleOrderSuccess(
          tableData.order_number,
          `Order ${
            action === "create_order"
              ? "created"
              : action === "settle"
              ? "settled"
              : "updated"
          } successfully!`
        );
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

        if (response.data.st !== 1) {
          throw new Error(response.data.msg || "Failed to create order");
        }

        handleOrderSuccess(
          response.data.order_number,
          "Order created successfully!"
        );
      }
    } catch (error) {
      console.error("Error with order:", error);
      console.log("Full error details:", error.stack);
      Alert.alert(
        "Error",
        error.message || "Failed to process order. Please try again."
      );
    } finally {
      // Clear saving state
      setIsSaving(false);
      setLoadingMessage("");
    }
  };

  // Update the button handlers

  const handleSettleOrder = async (modalPaymentMethod = null) => {
    try {
      if (cart.length === 0) {
        Alert.alert("Error", "Please add items to cart before settling");
        return;
      }

      setIsLoading(true);
      setLoadingMessage("Processing order...");

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
      const paymentStatus = isPaid ? "paid" : (isComplementary ? "complementary" : "unpaid");
      
      // Use modalPaymentMethod with priority if provided
      // This guarantees we use the value from the modal if it was just selected
      const effectivePaymentMethod = modalPaymentMethod 
        ? modalPaymentMethod.toLowerCase() 
        : (paymentMethod || "cash").toLowerCase();

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
        payment_method: isPaid ? effectivePaymentMethod : "", // Use the effective payment method
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
          payment_method: effectivePaymentMethod, // Use the effective payment method instead of paymentMethod
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

        // For new orders, immediately mark as paid with payment method
        const settleRequestBody = {
          outlet_id: restaurantId.toString(),
          order_id: data.order_id.toString(),
          order_status: "paid",
          user_id: userId.toString(),
          action: "settle",
          order_type: orderType || "dine-in",
          is_paid: "paid",
          payment_method: effectivePaymentMethod,
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
          "New Order Settle Status Body:",
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
          throw new Error(settleData.msg || "Failed to settle the new order");
        }
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
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 400 }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={1} // More responsive scrolling
        decelerationRate="normal"
        scrollIndicatorInsets={{ right: 1 }} // Forces the scrollbar to show
        directionalLockEnabled={true} // Lock to vertical scrolling
        alwaysBounceVertical={true} // Provides feedback that content is scrollable
        onScrollBeginDrag={() => {}} // Explicitly capture scroll events
        onScroll={() => {}} // Ensure scroll events are captured
      >
        {cart.map((item) => (
          <View key={item.menu_id.toString()} style={styles.cartItem}>
            <View style={styles.cartItemHeader}>
              <Text style={styles.itemName}>
                {item.name}
                {item.offer > 0 && (
                  <Text style={styles.offerText}> ({item.offer}% OFF)</Text>
                )}
              </Text>
              <View style={styles.priceRemoveContainer}>
                <Text style={styles.priceLabel}>Price : </Text>
                <Text style={styles.unitPrice}>
                  ₹{parseFloat(item.price).toFixed(2)}
                </Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromCart(item.menu_id, item.portion)}
                >
                  <Icon name="close" size={18} color="#FF4B4B" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cartItemDetails}>
              <View style={styles.leftContainer}>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={[styles.quantityButton, styles.quantityButtonUpdated]}
                    onPress={() => decreaseQuantity(item.menu_id, item.portion)}
                  >
                    <Text style={styles.quantityButtonTextUpdated}>-</Text>
                  </TouchableOpacity>

                  <Text style={styles.quantityText}>{item.quantity}</Text>

                  <TouchableOpacity
                    style={[styles.quantityButton, styles.quantityButtonUpdated]}
                    onPress={() => increaseQuantity(item.menu_id, item.portion)}
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
        ))}
      </ScrollView>
    );
  };

  // Add this to show order type in the header
  // Utility function to convert a string to title case

  const renderOrderTypeHeader = () => {
    if (orderType === "dine-in" && tableData) {
      // Get the order number
      const orderNumber = tableData?.order_number || (orderDetails && orderDetails.order_number);
      
      return (
        <View style={styles.tableInfoContainer}>
          <View
            style={[
              styles.statusContainer,
              {
                borderColor: tableData.is_occupied ? "#FF4B4B" : "#22C55E",
                borderStyle: "dashed",
                borderWidth: 1,
                backgroundColor: tableData.is_occupied
                  ? "rgba(255, 75, 75, 0.1)"
                  : "rgba(34, 197, 94, 0.1)",
              },
            ]}
          >
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
                Bill #{orderNumber}
              </Text>
            )}
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.tableInfoContainer, { backgroundColor: "#FF9A6C" }]}>
        <Text style={styles.tableInfoText}>
          {orderType.charAt(0).toUpperCase() + orderType.slice(1)}
        </Text>
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
            // Set customer details directly from API response
            setCustomerDetails({
              customer_name: order_details.customer_name !== null ? order_details.customer_name : "",
              customer_mobile: order_details.customer_mobile !== null ? order_details.customer_mobile : "",
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
              <div>Bill Number: ${orderNumber}</div>
              <div>${orderTypeDisplay()}</div>
              <div>DateTime: ${orderDetails?.datetime || currentDate}</div>
              
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


      if (isPOSTerminal && posSDKInitialized) {
        try {
          await printToPOSTerminal(orderDetails || tableData, "Receipt");
          setIsLoading(false);
          setLoadingMessage("");
          return; // Exit early if POS printing succeeded
        } catch (posError) {
          console.error("POS printer error:", posError);
          // Continue to existing printer logic as fallback
        }
      }
  
      const orderNumber = 
        apiResponse?.lists?.order_details?.order_number || // For existing orders
        apiResponse?.order_number || // For new orders
        tableData?.order_number || // Fallback to table data
        "New"; 
  
      // Make sure all values are properly parsed as numbers to avoid string comparison issues
      const parsedDiscount = parseFloat(specialDiscount) || 0;
      const parsedExtraCharges = parseFloat(extraCharges) || 0;
      const parsedTip = parseFloat(tip) || 0;
      const parsedGST = calculateGST() || 0;
      const parsedServiceCharges = calculateService() || 0;
      
      // Log values for debugging
      console.log("Receipt pricing values:", {
        discount: parsedDiscount,
        extraCharges: parsedExtraCharges,
        tip: parsedTip,
        GST: parsedGST,
        serviceCharges: parsedServiceCharges
      });
  
      // Enhanced receipt data with ALL pricing fields
      const receiptData = {
        // Basic order info
        order_number: orderNumber,
        datetime: new Date().toLocaleString("en-IN"),
        payment_method: paymentMethod || "CASH",
        is_paid: isPaid ? "paid" : (isComplementary ? "complementary" : "unpaid"),  // Added payment status
        
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
        discount_amount: calculateTotalDiscount(),
        discount_percent: getDiscountPercentage(),
        special_discount: parsedDiscount,
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
        orderDetails?.order_number || // For existing orders (from API response)
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
      const totalWithDiscount = parseFloat(orderDetails?.total_bill_with_discount || 0);
      
      // Customer details - carefully extract from multiple sources
      const customerName = 
        orderDetails?.customer_name || 
        orderData?.customer_name || 
        "";

      // PAYMENT STATUS - Explicitly check all possible sources
      const isPaidStatus = 
        orderData?.is_paid || 
        orderDetails?.is_paid || 
        isPaid || 
        false;
      
      const isComplementaryStatus = 
        orderData?.is_complementary || 
        orderDetails?.is_complementary || 
        isComplementary || 
        false;

      // Enhanced logging for debugging
      console.log("Receipt values:", {
        customerName,
        isPaidStatus,
        isComplementaryStatus,
        subtotal,
        discount,
        specialDiscountAmount,
        extraChargesAmount,
        tipAmount,
        serviceCharges,
        gstAmount,
        grandTotal
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
        
        // FIXED: Always check payment status - no conditions that could be false
        ...(isPaidStatus || orderDetails?.is_paid === "paid" || orderDetails?.is_paid === "PAID" || 
            (paymentMethod && isPaid !== false) ? 
          [
            textToBytes("\x1B\x21\x10"), // Larger text for PAID
            textToBytes("PAID\n"),
            textToBytes("\x1B\x21\x00") // Reset text size
          ] : 
          (isComplementaryStatus ? 
            [
              textToBytes("\x1B\x21\x10"), // Larger text
              textToBytes("COMPLEMENTARY\n"),
              textToBytes("\x1B\x21\x00") // Reset text size
            ] : 
            [] // Empty if not paid or complementary
          )
        ),
        
        ...textToBytes("\x1B\x21\x08"), // Double height
        ...textToBytes(`${outletName}\n`),
        ...textToBytes("\x1B\x21\x00"), // Normal height
        ...textToBytes(`${outletAddress}\n`),
        ...textToBytes(`${outletMobile ? `${outletMobile}\n\n` : ""}`), // Remove +91 prefix

        // Order details - left aligned
        ...textToBytes("\x1B\x61\x00"), // Left align
        ...textToBytes(`Bill Number: ${orderNumber}\n`),
        ...textToBytes(getOrderTypeText()),
        ...textToBytes(`DateTime: ${orderDetails?.datetime || currentDate}\n`),
        
        // FIXED: Always try to display customer name if it exists
        ...(customerName ? [textToBytes(`Name: ${customerName}\n`)] : []),
        
        // Payment method
        ...textToBytes(`Payment: ${
          orderDetails?.payment_method ? 
          orderDetails.payment_method.toUpperCase() : 
          (paymentMethod ? paymentMethod.toUpperCase() : "CASH")
        }\n`),
        
        ...textToBytes(getDottedLine()),

        // Column headers - aligned with data columns
        ...textToBytes("Item           Qty  Rate     Amt\n"),
        ...textToBytes(getDottedLine()),

        // Menu items
        ...menuItems.flatMap((item) => textToBytes(formatMenuItem(item))),
        ...textToBytes(getDottedLine()),

        // FIXED: Always show all payment items - removed all conditions
        ...textToBytes(formatAmountLine("Total", subtotal)),
        
        // Display discount only if there's a percentage or amount
        ...textToBytes(formatAmountLine(`Discount(${discountPercent}%)`, discount, "-")),
        
        // Display special discount
        ...textToBytes(formatAmountLine("Special Discount", specialDiscountAmount, "-")),
        
        // Display extra charges
        ...textToBytes(formatAmountLine("Extra Charges", extraChargesAmount, "+")),
        
        // Always show subtotal after discounts/charges
        ...textToBytes(formatAmountLine("Subtotal", totalWithDiscount)),
        
        // Display service charges
        ...textToBytes(formatAmountLine(`Service(${serviceChargesPercent}%)`, serviceCharges, "+")),
        
        // Display GST
        ...textToBytes(formatAmountLine(`GST(${gstPercent}%)`, gstAmount, "+")),
        
        // Display tip
        ...textToBytes(formatAmountLine("Tip", tipAmount, "+")),

        ...textToBytes(getDottedLine()),
        // Final total
        ...textToBytes(formatAmountLine("Total", grandTotal)),
        ...textToBytes("\n"),

        // Footer - centered
        ...textToBytes("\x1B\x61\x01"), // Center align
        ...textToBytes("------ Payment Options ------\n\n\n"),
        ...textToBytes("\x1B\x21\x00"), // Normal text
        ...textToBytes("PhonePe  GPay  Paytm  UPI\n"),
        ...textToBytes("------------------------\n"),
        
        // QR Code
        ...generateQRCode(qrData),
        ...textToBytes('\n\n'),
        ...textToBytes(`Scan to Pay ${grandTotal.toFixed(2)}\n\n`),
        ...textToBytes("\n"),
        ...textToBytes("-----Thank You Visit Again!-----"),
        ...textToBytes("https://menumitra.com/)\n\n\n\n"),
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

      if (!printerDevice || !isConnected) {
        throw new Error("Printer not connected");
      }

      const services = await printerDevice.services();
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

      // Send data in chunks with proper delays
      const CHUNK_SIZE = 20;
      for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
        if (!isConnected) {
          throw new Error("Printer connection lost during transmission");
        }

        const chunk = commands.slice(
          i,
          Math.min(i + CHUNK_SIZE, commands.length)
        );
        const base64Data = base64.encode(String.fromCharCode(...chunk));

        await printCharacteristic.writeWithoutResponse(base64Data);
        // Increased delay between chunks to prevent buffer overflow
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      // Final delay to ensure all data is processed
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("All data sent successfully");
    } catch (error) {
      console.error("Send to device error:", error);
      throw new Error(`Failed to send data to device: ${error.message}`);
    }
  };

  // Update handlePrint function
  const handlePrint = async () => {
    try {
      // Dismiss keyboard and ensure updates are processed
      Keyboard.dismiss();
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
        AsyncStorage.getItem("access_token"),
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
        order_status: "placed"
      };
      
      // Log the full request body for debugging
      console.log("Sending request body:", baseRequestBody);

      let apiResponse;

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
        setLoadingMessage("Processing print...");
      
        if (printerConnected && contextPrinterDevice) {
          try {
            // Pass just the API response, since printReceipt now handles all the data structuring
            await printReceipt(apiResponse);
            setCart([]);
            navigation.navigate("RestaurantTables");
          } catch (error) {
            console.error("Print error:", error);
            Alert.alert("Error", "Failed to print receipt. Please try again.");
          }
        }
        
       else {
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
            // Production build options
            Alert.alert(
              "Printer Not Connected",
              "Please connect a printer to print the receipt",
              [
                {
                  text: "Connect Printer",
                  onPress: scanForPrinters,
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
  const printThermal = async (html, isKOT = false) => {
    try {
      if (!printerDevice || !isConnected) {
        throw new Error("No printer connected");
      }

      // Convert HTML to printer commands
      const commands = isKOT
        ? generateKOTCommands(html)
        : generatePrinterCommands(html);

      // Send commands to printer using sendToDevice instead of sendToPrinter
      await sendToDevice(commands);
      return true;
    } catch (error) {
      console.error("Thermal print error:", error);
      throw error;
    }
  };

  // Update generateKOTCommands to return byte array instead of HTML
  const generateKOTCommands = async (orderData) => {
    try {
      // Get order details with proper structure
      const orderDetails = orderData?.lists?.order_details;
    
      // Fix order number retrieval to properly handle nested structure
      const orderNumber = 
        orderDetails?.order_number || // For existing orders (from lists.order_details)
        orderData?.order_number || // For new orders from create_order response
        tableData?.order_number || // From table data
        "New"; // Fallback

      // Get datetime with proper format
     // Get datetime from order details or use current time as fallback

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


      // Rest of the code remains the same...
      const [storedOutletName, storedOutletAddress, storedOutletNumber] = 
        await Promise.all([
          AsyncStorage.getItem("outlet_name"),
          AsyncStorage.getItem("outlet_address"),
          AsyncStorage.getItem("outlet_mobile"), // Changed from "outlet_number" to "outlet_mobile"
        ]);
      
      const outletName = storedOutletName || "Restaurant";
      const outletAddress = storedOutletAddress || "";
      const outletNumber = storedOutletNumber || "";
      const getDottedLine = () => "-------------------------------\n";

      // FIX: More robust detection of existing orders
      const isExistingOrder = tableData?.order_id && (existingOrderDetails || orderDetails);
      
      // Get list of items to print based on whether it's a new or existing order
      let itemsToPrint = [];
      let totalQuantityToPrint = 0;
      
      if (isExistingOrder) {
        // For existing orders, only print new or increased quantity items
        console.log("Generating incremental KOT for existing order");
        
        // FIX: Get previous order items with better fallbacks
        const previousOrderDetails = existingOrderDetails || orderDetails;
        const previousItems = previousOrderDetails?.order_details || 
                              previousOrderDetails?.lists?.order_details || 
                              [];
        
        // FIX: Debug log to check previous items
        console.log("Previous order items:", JSON.stringify(previousItems));
        console.log("Current cart items:", JSON.stringify(cart));
        
        // Create a map of previous items by menu_id for easy lookup
        const previousItemsMap = {};
        if (Array.isArray(previousItems)) {
          previousItems.forEach(item => {
            const menuId = item.menu_id?.toString() || "";
            if (menuId) {
              previousItemsMap[menuId] = {
                quantity: parseInt(item.quantity) || 0,
                name: item.menu_name || item.name || ""
              };
            }
          });
        }
        
        // Debug log for the map
        console.log("Previous items map:", JSON.stringify(previousItemsMap));
        
        // Find items that are new or have increased quantity
        cart.forEach(item => {
          const menuId = item.menu_id?.toString() || "";
          const currentQuantity = parseInt(item.quantity) || 0;
          const previousQuantity = previousItemsMap[menuId]?.quantity || 0;
          
          console.log(`Item ${item.name}, Current: ${currentQuantity}, Previous: ${previousQuantity}`);
          
          // Only include if it's a new item or quantity increased
          if (previousQuantity < currentQuantity) {
            // Add the item with only the incremental quantity
            const incrementalQuantity = currentQuantity - previousQuantity;
            
            itemsToPrint.push({
              ...item,
              quantity: incrementalQuantity,
              // Add note that this is an additional quantity if it's not a new item
              comment: previousQuantity > 0 
                ? `${item.specialInstructions || ""} (Additional ${incrementalQuantity})`.trim()
                : item.specialInstructions || ""
            });
            
            totalQuantityToPrint += incrementalQuantity;
          }
        });
        
        // If no new items, print a message indicating this
        if (itemsToPrint.length === 0) {
          itemsToPrint.push({
            name: "No new items added",
            quantity: "",
            comment: "This is a duplicate KOT"
          });
        }
      } else {
        // For new orders, print all items
        console.log("Generating complete KOT for new order");
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

      return [
        ...textToBytes("\x1B\x40"), // Initialize printer
        ...textToBytes("\x1B\x61\x01"), // Center alignment
        ...textToBytes("\x1B\x21\x10"), // Double width, double height
        ...textToBytes(kotHeader),
        ...textToBytes(`${outletName}\n`),
        ...textToBytes("\x1B\x21\x00"), // Normal text
        ...textToBytes(`${outletAddress}\n`),
        ...textToBytes(`${outletNumber}\n\n`),
        
        ...textToBytes("\x1B\x61\x00"), // Left align
        ...textToBytes(`Bill no: ${orderNumber}\n`),
        ...textToBytes(
          orderType === "dine-in"
            ? `Table: ${tableData?.section_name} - ${tableData?.table_number}\n`
            : `Type: ${orderType?.toUpperCase()}\n`
        ),
        ...textToBytes(`DateTime: ${orderDetails?.datetime || currentDate}\n`),
        ...textToBytes(getDottedLine()),

        // Column headers
        ...textToBytes("Item                    Qty\n"),
        ...textToBytes(getDottedLine()),
        
        // Menu items - now using itemsToPrint instead of cart directly
        ...itemsToPrint.map(item => {
          const name = item.name || item.menu_name || "";
          const qty = item.quantity?.toString() || "";
          
          let itemText = "";
          if (name.length > 23) {
            const lines = name.match(/.{1,23}/g) || [];
            itemText = lines
              .map((line, index) =>
                index === 0
                  ? `${line.padEnd(23)} ${qty}\n`
                  : `${line.padEnd(26)}\n`
              )
              .join("");
          } else {
            itemText = `${name.padEnd(23)} ${qty}\n`;
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
        // Updated to show total quantity of items being printed
        ...textToBytes(`Total Items: ${totalQuantityToPrint}\n`),
        ...textToBytes("\n\n\n"),
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper
      ];
    } catch (error) {
      console.error("Error generating KOT commands:", error);
      throw error;
    }
  };

  // Update handleKOT to use printThermal
  const handleKOT = async (modalPaymentMethod = null) => {
    try {
      Keyboard.dismiss();
      // Wait a moment to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setIsLoading(true);
      setLoadingMessage("Processing order...");

      if (cart.length === 0) {
        Alert.alert("Error", "Please add items to cart before generating KOT");
        return;
      }

      // First check if we're on a POS terminal
      // This ensures we don't show "Connect Printer" dialogs unnecessarily
      const posPrinterEnabled = isPOSTerminal;
      console.log("POS terminal enabled:", posPrinterEnabled);

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
      const paymentStatus = isPaid ? "paid" : (isComplementary ? "complementary" : "unpaid");
      
      // Use the payment method passed from the modal if available,
      // otherwise fall back to the one selected in the main screen
      const effectivePaymentMethod = modalPaymentMethod || paymentMethod;

      // Base request body
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
        payment_method: isPaid ? effectivePaymentMethod : "", // Use the effective payment method
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
          action: "KOT_and_save",
          order_type: orderType || "dine-in",
          is_paid: paymentStatus,
          payment_method: isPaid ? effectivePaymentMethod : "",
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

        // For new orders, update status - using same logic as KOTAndSave
        const statusRequestBody = {
          outlet_id: restaurantId.toString(),
          order_id: data.order_id.toString(),
          order_status: isPaid ? "paid" : "placed",
          user_id: userId.toString(),
          action: "KOT_and_save",
          order_type: orderType || "dine-in",
          is_paid: paymentStatus,
          payment_method: isPaid ? effectivePaymentMethod : "",
          // Include customer details
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
      
        if (printerDevice && isConnected) {
          try {
            // Generate KOT commands for both new and existing orders
            const kotCommands = await generateKOTCommands(apiResponse);
            
            // Use sendToDevice directly like in printReceipt
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
                  onPress: scanForPrinters,
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
              <span>${orderDetails?.datetime || currentDate}</span>
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
      if (navigation.isFocused()) {
        handleBackNavigation();
        return true; // Prevent default behavior
      }
      return false;
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
          <RemixIcon 
            name={showPaymentOptions ? "arrow-up-s-line" : "arrow-down-s-line"} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>
        
        {showPaymentOptions && (
          <View style={[styles.paymentOptionsContent, { paddingVertical: 8 }]}>
            {/* Input fields row */}
            <View style={styles.paymentInputsRow}>
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Special Discount</Text>
                <TextInput
                  style={styles.paymentInput}
                 
                  value={specialDiscount.toString()}
                  onChangeText={(text) => setSpecialDiscount(text)}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Extra Charges</Text>
                <TextInput
                  style={styles.paymentInput}
                 
                  value={extraCharges.toString()}
                  onChangeText={(text) => setExtraCharges(text)}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Tip</Text>
                <TextInput
                  style={styles.paymentInput}
                 
                  value={tip.toString()}
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
                    <Text style={styles.optionText}>CASH</Text>
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
                    <Text style={styles.optionText}>UPI</Text>
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
                    <Text style={styles.optionText}>CARD</Text>
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
    const discountPercentage = parseFloat(discount) || 0;
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
          {settings?.print_and_save && (
            <TouchableOpacity 
              style={styles.printSaveButton}
              onPress={handlePrint}
            >
              <RemixIcon name="printer-line" size={16} color="#fff" />
              <Text style={styles.buttonText}>Print & Save</Text>
            </TouchableOpacity>
          )}
          
          {settings?.KOT_and_save && (
            <TouchableOpacity 
              style={styles.kotButton}
              onPress={onKOTPress}
            >
              <RemixIcon name="file-list-line" size={16} color="#fff" />
              <Text style={styles.buttonText}>KOT</Text>
            </TouchableOpacity>
          )}
          
          {settings?.settle && (
            <TouchableOpacity 
              style={styles.settleButton}
              onPress={onSettlePress}
            >
              <RemixIcon name="checkbox-circle-line" size={16} color="#fff" />
              <Text style={styles.buttonText}>Settle</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Action buttons - second row */}
        <View style={styles.secondaryButtonsRow}>
          {/* Table Reservation Button - only show for available tables and dine-in orders */}
          {settings?.reserve_table && orderType === "dine-in" && (!tableData?.is_occupied) && (
            <TouchableOpacity 
              style={styles.lockButton}
              onPress={handleTableReservation}
            >
              <RemixIcon name="lock-line" size={18} color="#666" />
            </TouchableOpacity>
          )}
          
          {settings?.KOT_and_save && (
            <TouchableOpacity 
              style={styles.kotSaveButton}
              onPress={handleKOTAndSave}
            >
              <RemixIcon name="save-line" size={16} color="#fff" />
              <Text style={styles.buttonText}>KOT & Save</Text>
            </TouchableOpacity>
          )}
          
          {/* Only show cancel button for existing orders */}
          {settings?.cancel && tableData?.order_id && 
  !(tableData?.is_paid === "paid" || 
   
    tableData?.order_status === "paid" || 
    
    existingOrderDetails?.order_status === "paid") && (
  <TouchableOpacity 
    style={styles.closeButton}
    onPress={handleCancelOrder}
  >
    <RemixIcon name="close-line" size={18} color="#fff" />
  </TouchableOpacity>
)}
        </View>
      </View>
    );
  };

  // Add a function to handle the KOT & Save button
  const handleKOTAndSave = async () => {
    try {
      // Dismiss keyboard to ensure text inputs are properly committed
      Keyboard.dismiss();
      
      // Wait a moment to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setIsLoading(true);
      setLoadingMessage("Processing order...");

      if (cart.length === 0) {
        Alert.alert("Error", "Please add items to cart before generating KOT");
        setIsLoading(false);
        return;
      }

      // Use the state variable directly for better reliability
      const posPrinterEnabled = isPOSTerminal;
      console.log("POS terminal enabled:", posPrinterEnabled);

      // Rest of your existing API code for order creation...
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      // Your existing API call code...
      
      // After API success:
      if (apiResponse.st === 1) {
        setLoadingMessage("Processing KOT...");

        // For new orders, add the order number to the API response
        if (!tableData?.order_id) {
          apiResponse.order_number =
            apiResponse.order_number || String(apiResponse.order_id);
        }
      
        // If we're on a POS terminal, try direct printing first
        if (posPrinterEnabled) {
          try {
            console.log("Attempting direct POS printing for KOT & Save...");
            setLoadingMessage("Printing directly to POS printer...");
            
            const success = await directPOSPrinting(apiResponse, 'kot');
            
            if (success) {
              console.log("Direct POS printing successful");
              setCart([]);
              navigation.navigate("RestaurantTables");
              return; // Exit early after successful POS printing
            } else {
              console.log("Direct POS printing failed, falling back");
            }
          } catch (posError) {
            console.error("POS printing error:", posError);
            // Continue to external printer as fallback
          }
        }
        
        // Only proceed with external printer checks if POS printing failed or not enabled
        if (printerDevice && isConnected) {
          // Your existing printer code...
        } else {
          // Only show connection dialogs if NOT in POS mode or if POS printing failed
          Alert.alert(
            posPrinterEnabled ? "POS Printer Failed" : "Printer Connection",
            posPrinterEnabled 
              ? "The built-in printer failed. Would you like to connect an external printer?"
              : "No printer connected. What would you like to do?",
            [
              {
                text: "Connect Printer",
                onPress: scanForPrinters,
              },
              {
                text: "Continue Without Printing",
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
  const handleTableReservation = async () => {
    try {
      // Only proceed if it's a dine-in order and the table is available
      if (orderType !== "dine-in" || tableData?.is_occupied) {
        Alert.alert("Cannot Reserve", "This table is already occupied or you're not creating a dine-in order.");
        return;
      }
      
      setIsLoading(true);
      setLoadingMessage("Reserving table...");
      
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token")
      ]);
      
      // Use the correct request format for the table_is_reserved API
      const response = await axiosInstance.post(
        onGetProductionUrl() + "table_is_reserved",
        {
          table_id: tableData.table_id.toString(),
          table_number: tableData.table_number.toString(),
          outlet_id: restaurantId.toString(),
          is_reserved: true
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (response.data.st === 1) {
        Alert.alert("Success", "Table has been reserved", [
          {
            text: "OK",
            onPress: () => navigation.navigate("RestaurantTables") // Navigate back to tables screen

          }
        ]);
       
      } else {
        Alert.alert("Error", response.data.msg || "Failed to reserve table");
      }
    } catch (error) {
      console.error("Error reserving table:", error);
      Alert.alert("Error", error.response?.data?.msg || error.message || "Failed to reserve table");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

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
    console.log(`Setting ${field} to:`, value);
    setCustomerDetails(prevDetails => ({
      ...prevDetails,
      [field]: value
    }));
  };

  // Add a useEffect at the beginning of the component to handle existing order details
  useEffect(() => {
    // Check if we received existing order details from DemoScreen
    if (route.params?.existingOrderDetails) {
      const orderDetails = route.params.existingOrderDetails;
      console.log("🔵 Received existing order details in OrderCreate", orderDetails);
      
      // Set customer details directly from the passed data
      setCustomerDetails({
        customer_name: orderDetails.customer_name || "",
        customer_mobile: orderDetails.customer_mobile || "",
        customer_alternate_mobile: orderDetails.customer_alternate_mobile || "",
        customer_address: orderDetails.customer_address || "",
        customer_landmark: orderDetails.customer_landmark || ""
      });
      
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
  useEffect(() => {
    // If the table is reserved, go back to tables screen with a message
    if (tableData?.is_reserved) {
      Alert.alert(
        "Reserved Table", 
        "This table is currently reserved. Please unreserve it first.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("RestaurantTables")
          }
        ]
      );
    }
  }, []);

  // Update the calculateTotals function to match the API response calculations
  const calculateTotals = () => {
    // 1. Calculate base total from cart items
    const totalBillAmount = cart.reduce(
      (total, item) => total + item.total_price,
      0
    );
    
    // 2. Calculate discount amount based on percentage
    const discountAmount = (totalBillAmount * discount) / 100;
    
    // 3. Calculate bill amount after discount
    const totalBillWithDiscount = totalBillAmount - discountAmount;
    
    // 4. Calculate service charges
    const serviceChargesPercent = parseFloat(restaurantConfig.service_charges || 0);
    const serviceChargesAmount = (totalBillWithDiscount * serviceChargesPercent) / 100;
    
    // 5. Calculate grand total (subtotal with service charges)
    const grandTotal = totalBillWithDiscount + serviceChargesAmount;
    
    // 6. Calculate GST on (discounted amount + service charges)
    const gstPercent = parseFloat(restaurantConfig.gst || 0);
    const gstAmount = ((totalBillWithDiscount + serviceChargesAmount) * gstPercent) / 100;
    
    // 7. Calculate final total with all adjustments
    const finalGrandTotal = grandTotal - specialDiscount + extraCharges + tip + gstAmount;
    
    return {
      totalBillAmount,
      discountAmount,
      totalBillWithDiscount,
      serviceChargesPercent,
      serviceChargesAmount,
      gstPercent,
      gstAmount,
      grandTotal,
      finalGrandTotal,
    };
  };

  // Add settings state
  const [settings, setSettings] = useState({
    print_and_save: true,
    KOT_and_save: true,
    settle: true,
    reserve_table: true,
    cancel: true
  });
  
  // Replace useEffect with useFocusEffect
  useFocusEffect(
    React.useCallback(() => {
      const loadSettings = async () => {
        try {
          const appSettings = await getSettings();
          console.log("Loaded settings in OrderCreate:", appSettings);
          
          // Use settings directly from storage without overriding
          setSettings(appSettings);
        } catch (error) {
          console.error("Error loading settings in OrderCreate:", error);
        }
      };
      loadSettings();
    }, [])
  );

  // Update the action buttons rendering
  

  // Add this function near your other calculation functions
  const getDiscountPercentage = () => {
    // Return the current discount percentage from state
    return parseFloat(discount) || 0;
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
          
          // Process menu items from existingOrderDetails
          // ... [rest of the code]
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
  const PaymentModal = () => (
    <Modal
      visible={isPaymentModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setIsPaymentModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setIsPaymentModalVisible(false)}>
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={[styles.modalContent, styles.paymentModalContent]}>
              {/* Close Button (X) in the top right */}
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setIsPaymentModalVisible(false)}
              >
                <RemixIcon name="close-line" size={24} color="#000" />
              </TouchableOpacity>

              {/* Header - Table Number, Order Number (if available) and Price */}
              <Text style={styles.paymentModalTitle}>
                {orderType === "dine-in" 
                  ? tableData?.order_id 
                    ? `Table ${tableData?.table_number} | Order No | ${tableData?.order_number || 'N/A'}`  
                    : `Table ${tableData?.table_number}`
                  : orderType}: ₹{calculateGrandTotal().toFixed(2)}
              </Text>

              {/* Select Payment Method Label */}
              <Text style={styles.paymentMethodLabel}>Select Payment Method</Text>

              {/* Payment Method Radio Buttons in a Row */}
              <View style={styles.paymentOptionsContainer}>
                <View style={styles.paymentMethodsRow}>
                  {/* CASH Option - still use UPPERCASE for display but store lowercase */}
                  <TouchableOpacity
                    style={styles.paymentOption}
                    onPress={() => setSelectedPaymentMethod('cash')}
                  >
                    <View style={styles.radioButtonContainer}>
                      <View style={[
                        styles.radioButton,
                        selectedPaymentMethod === 'cash' && styles.radioButtonSelected
                      ]}>
                        {selectedPaymentMethod === 'cash' && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                      {/* Display as uppercase but store as lowercase */}
                      <Text style={styles.paymentOptionText}>CASH</Text>
                    </View>
                  </TouchableOpacity>

                  {/* UPI Option */}
                  <TouchableOpacity
                    style={styles.paymentOption}
                    onPress={() => setSelectedPaymentMethod('upi')}
                  >
                    <View style={styles.radioButtonContainer}>
                      <View style={[
                        styles.radioButton,
                        selectedPaymentMethod === 'upi' && styles.radioButtonSelected
                      ]}>
                        {selectedPaymentMethod === 'upi' && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                      <Text style={styles.paymentOptionText}>UPI</Text>
                    </View>
                  </TouchableOpacity>

                  {/* CARD Option */}
                  <TouchableOpacity
                    style={styles.paymentOption}
                    onPress={() => setSelectedPaymentMethod('card')}
                  >
                    <View style={styles.radioButtonContainer}>
                      <View style={[
                        styles.radioButton,
                        selectedPaymentMethod === 'card' && styles.radioButtonSelected
                      ]}>
                        {selectedPaymentMethod === 'card' && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                      <Text style={styles.paymentOptionText}>CARD</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Paid Checkbox - RESTORED */}
                  <TouchableOpacity
                    style={styles.paidCheckboxContainer}
                    onPress={() => setIsPaid(!isPaid)}
                  >
                    <View style={[
                      styles.checkbox,
                      isPaid && styles.checkboxChecked
                    ]}>
                      {isPaid && (
                        <RemixIcon name="check-line" size={12} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.paidText}>Paid</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Proceed Button - RESTORED - Disabled if not marked as paid */}
              <TouchableOpacity
                style={[
                  styles.settleButton,
                  !isPaid && styles.settleButtonDisabled
                ]}
                onPress={handlePaymentModalConfirm}
                disabled={!isPaid}
              >
                <RemixIcon name="check-line" size={20} color="#fff" />
                <Text style={styles.settleButtonText}>
                  {currentAction === 'kot' ? 'Generate KOT' : 'Settle Order'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Add this function to handle the confirmation from payment modal
  const handlePaymentModalConfirm = () => {
    // Store the current selected payment method before closing the modal
    const selectedMethod = selectedPaymentMethod; // Important: capture this in a local variable
    
    // Close the modal
    setIsPaymentModalVisible(false);
    
    // Set the global payment method state
    setPaymentMethod(selectedMethod);
    
    // Call the appropriate handler based on which button was clicked
    // Pass the selected method directly to avoid race conditions with state updates
    if (currentAction === 'kot') {
      handleKOT(selectedMethod);
    } else if (currentAction === 'settle') {
      handleSettleOrder(selectedMethod);
    }
  };

  // Modify the KOT button press handler
  const onKOTPress = () => {
    if (cart.length === 0) {
      Alert.alert("Error", "Please add items to cart before generating KOT");
      return;
    }
    
    // Check if a valid payment method is selected or if it's complementary
    if ((isPaid && paymentMethod && paymentMethod !== "") || isComplementary) {
      // If payment is already properly configured, don't show the modal
      handleKOT();
    } else {
      // Otherwise show the modal to select payment method - use lowercase
      setSelectedPaymentMethod('cash'); // Default to cash in lowercase
      setCurrentAction('kot');
      setIsPaymentModalVisible(true);
    }
  };

  // Modify the Settle button press handler
  const onSettlePress = () => {
    if (cart.length === 0) {
      Alert.alert("Error", "Please add items to cart before settling");
      return;
    }
    
    // Check if a valid payment method is selected or if it's complementary
    if ((isPaid && paymentMethod && paymentMethod !== "") || isComplementary) {
      // If payment is already properly configured, don't show the modal
      handleSettleOrder();
    } else {
      // Otherwise show the modal to select payment method - use lowercase
      setSelectedPaymentMethod('cash'); // Default to cash in lowercase
      setCurrentAction('settle');
      setIsPaymentModalVisible(true);
    }
  };

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


  const renderPOSSettingsModal = () => {
    return (
      <Modal
        visible={showPOSSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPOSSettings(false)}
      >
        <View style={styles.modalContainer || { 
          flex: 1, 
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={styles.modalContent || {
            backgroundColor: '#fff',
            borderRadius: 8,
            padding: 20,
            width: '90%',
            maxWidth: 400,
          }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
              <Text style={{fontSize: 18, fontWeight: 'bold'}}>POS Printer Settings</Text>
              <TouchableOpacity onPress={() => setShowPOSSettings(false)}>
                <RemixIcon name="close-line" size={24} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingItem || {
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#eee',
            }}>
              <Text style={styles.settingLabel || {
                fontSize: 16,
                color: '#333',
              }}>Use Internal POS Printer</Text>
              <Switch
                value={isPOSTerminal}
                onValueChange={async (value) => {
                  setIsPOSTerminal(value);
                  await AsyncStorage.setItem("use_pos_printer", value ? "true" : "false");
                }}
              />
            </View>
            
            <View style={{marginTop: 20}}>
              <TouchableOpacity 
                style={{
                  backgroundColor: '#0dcaf0',
                  padding: 10,
                  borderRadius: 5,
                  alignItems: 'center'
                }}
                onPress={async () => {
                  try {
                    // Test print
                    const testResult = await directPOSPrinting({
                      order_id: "TEST-" + new Date().getTime(),
                      order_number: "TEST",
                    });
                    
                    Alert.alert(
                      "Test Print",
                      testResult ? "Test print successful!" : "Test print failed. Check printer connection."
                    );
                  } catch (error) {
                    Alert.alert("Error", "Test print failed: " + error.message);
                  }
                }}
              >
                <Text style={{color: '#fff', fontWeight: 'bold'}}>Test POS Printer</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={{
              marginTop: 20,
              padding: 10,
              backgroundColor: '#f5f5f5',
              borderRadius: 5,
              fontSize: 14,
              color: '#666'
            }}>
              POS Terminal Detected: {isPOSTerminal ? "Yes" : "No"}{"\n"}
              Device: {Device.deviceName || "Unknown"}
            </Text>
          </View>
        </View>
      </Modal>
    );
  };


  const POSSettingsModal = () => (
    <Modal
      visible={showPOSSettings}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPOSSettings(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>POS Printer Settings</Text>
            <TouchableOpacity onPress={() => setShowPOSSettings(false)}>
              <RemixIcon name="close-line" size={24} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Use Internal POS Printer</Text>
            <Switch
              value={isPOSTerminal}
              onValueChange={togglePOSTerminalMode}
            />
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.settingButton} onPress={checkPOSPrinterStatus}>
              <Text style={styles.buttonText}>Check Printer Status</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingButton} onPress={printPOSTestReceipt}>
              <Text style={styles.buttonText}>Print Test Receipt</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.statusText}>
            POS Terminal Detected: {isPOSTerminal ? "Yes" : "No"}{"\n"}
            SDK Initialized: {posSDKInitialized ? "Yes" : "No"}
          </Text>
        </View>
      </View>
    </Modal>
  );

  // 6. Basic direct POS printing implementation
  const directPOSPrinting = async (orderData, printType = 'receipt') => {
    try {
      console.log(`Attempting direct POS printing (${printType})...`);
      
      // In a production build, this would connect to the POS printer SDK
      // For now in development, we'll simulate success but show detailed logs
      
      if (Constants.appOwnership === 'expo') {
        console.log("Running in Expo Go - POS printing simulation mode");
        console.log(`Would print ${printType} for order #${orderData.order_id}`);
        
        // Show a simulated print alert in Expo Go for better testing feedback
        Alert.alert(
          "POS Printer Simulation",
          `In production, this would print a ${printType} directly to the built-in printer.\n\nOrder #: ${orderData.order_id || 'New'}`
        );
        
        return true;
      }
      
      // This is where you would add the actual SDK calls for your specific POS terminal
      // Example for Sunmi printer (implementation would go in native module):
      // if (NativeModules.SunmiPrinter) {
      //   if (printType === 'kot') {
      //     return await NativeModules.SunmiPrinter.printKOT(JSON.stringify(orderData));
      //   } else {
      //     return await NativeModules.SunmiPrinter.printReceipt(JSON.stringify(orderData));
      //   }
      // }
      
      // For now, simulate success in development builds
      return true;
    } catch (error) {
      console.error("Error in direct POS printing:", error);
      return false;
    }
  };

  // 7. Helper to generate plain text receipt content for POS printers
  const generatePlainTextReceiptForPOS = async (orderData) => {
    const restaurantNameValue = await getRestaurantName() || "Restaurant";
    
    let receipt = "";
    
    // Header
    receipt += `${restaurantNameValue}\n\n`;
    receipt += `Order #: ${orderData.order_number || orderData.order_id || ""}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n`;
    receipt += `Table: ${tableData?.table_number || ""}\n`;
    receipt += "--------------------------------\n\n";
    
    // Items
    receipt += "ITEMS\n";
    cart.forEach(item => {
      const portionText = item.portion === "half" ? " (Half)" : "";
      receipt += `${item.name}${portionText}\n`;
      receipt += `  x${item.quantity}  ₹${item.price.toFixed(2)}\n`;
    });
    
    receipt += "\n--------------------------------\n";
    
    // Totals
    receipt += `Subtotal: ₹${calculateTotal().toFixed(2)}\n`;
    
    const discount = calculateTotalDiscount();
    if (discount > 0) {
      receipt += `Discount: -₹${discount.toFixed(2)}\n`;
    }
    
    const serviceCharge = calculateService();
    if (serviceCharge > 0) {
      receipt += `Service Charge: ₹${serviceCharge.toFixed(2)}\n`;
    }
    
    const gst = calculateGST();
    if (gst > 0) {
      receipt += `GST: ₹${gst.toFixed(2)}\n`;
    }
    
    receipt += `TOTAL: ₹${calculateGrandTotal().toFixed(2)}\n`;
    receipt += "--------------------------------\n";
    receipt += `Payment Method: ${paymentMethod.toUpperCase()}\n`;
    receipt += `Paid: ${isPaid ? "Yes" : "No"}\n\n`;
    receipt += "Thank You!\n\n";
    receipt += "Powered by MenuMitra\n\n";
    
    return receipt;
  };

  // 8. Function to generate basic HTML receipt
  const generateBasicHtmlReceipt = (orderData) => {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: sans-serif; text-align: center; }
          .receipt { padding: 10px; }
          .header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .item { text-align: left; margin: 5px 0; }
          .total { font-weight: bold; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">Order #${orderData.order_number || orderData.order_id || ""}</div>
          <div>Date: ${new Date().toLocaleString()}</div>
          <div>Table: ${tableData?.table_number || ""}</div>
          <div class="divider"></div>
          <div><strong>ITEMS</strong></div>
          ${cart.map(item => `
            <div class="item">
              ${item.name} ${item.portion === "half" ? "(Half)" : ""}
              <br>x${item.quantity} ₹${item.price.toFixed(2)}
            </div>
          `).join('')}
          <div class="divider"></div>
          <div>Subtotal: ₹${calculateTotal().toFixed(2)}</div>
          ${calculateTotalDiscount() > 0 ? `<div>Discount: -₹${calculateTotalDiscount().toFixed(2)}</div>` : ''}
          ${calculateService() > 0 ? `<div>Service Charge: ₹${calculateService().toFixed(2)}</div>` : ''}
          ${calculateGST() > 0 ? `<div>GST: ₹${calculateGST().toFixed(2)}</div>` : ''}
          <div class="total">TOTAL: ₹${calculateGrandTotal().toFixed(2)}</div>
          <div class="divider"></div>
          <div>Payment Method: ${paymentMethod.toUpperCase()}</div>
          <div>Paid: ${isPaid ? "Yes" : "No"}</div>
          <div>Thank You!</div>
          <div>Powered by MenuMitra</div>
        </div>
      </body>
    </html>
    `;
  };

  // 9. Add this UI component for the POS Settings button
  // Make sure to add this in the return statement of your component, at the top level
  // so it's always visible regardless of other UI states

  const renderPOSSettingsButton = () => {
    return (
      <TouchableOpacity 
        style={{
          position: 'absolute',
          top: 10,  
          right: 10,
          zIndex: 9999,  // Very high z-index to ensure it's on top
          elevation: 10, // High elevation for Android
          backgroundColor: 'rgba(255,255,255,0.8)', // Semi-transparent background
          padding: 10,
          borderRadius: 25,
          borderWidth: 1,
          borderColor: '#0dcaf0',
        }} 
        onPress={() => {
          console.log("POS settings button pressed");
          setShowPOSSettings(true);
        }}
      >
        <RemixIcon name="settings-3-line" size={24} color="#0dcaf0" />
      </TouchableOpacity>
    );
  };

  // Add this log statement in your component's main body to check when it renders
  console.log("OrderCreate component rendering, isPOSTerminal:", isPOSTerminal);

  // 11. Ensure the settings button is properly positioned in the UI hierarchy
  // In your main return statement, make sure the button is at the right position
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
titleStyle={{ marginLeft: -20 }} // Move title slightly left
onBackPress={handleBackNavigation} // Add this prop to handle back navigation
rightComponent={
  <View style={styles.orderTypeContainer}>
    {/* Add POS Settings Button */}
    <TouchableOpacity 
      style={styles.posSettingsButton}
      onPress={() => setShowPOSSettings(true)}
    >
      <RemixIcon name="settings-3-line" size={20} color="#0dcaf0" />
    </TouchableOpacity>
    {renderOrderTypeHeader()}
  </View>
}
/>
    {/* Replace the TouchableWithoutFeedback wrapper with KeyboardAvoidingView */}
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      enabled={false} // Disable the default behavior
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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

            {/* Add the customer info inputs here - CORRECT PLACEMENT */}
            {renderCustomerInfoContainer()}

            {cart.length === 0 && (
              <View style={styles.emptyCartContainer}>
                <RemixIcon name="restaurant-line" size={50} color="#ccc" />
                <Text style={styles.emptyCartText}>No items in the cart</Text>
              </View>
            )}

            <View style={styles.container}>
              <View style={styles.cartContentContainer}>
                {/* Conditionally render the cart title */}
                {cart.length > 0 ? (
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
                            <RemixIcon
                              name="restart-line"
                              size={20}
                              color="#666"
                            />
                          )}
                        </TouchableOpacity>
                        <Text style={styles.cartTitle}>
                          Items ({cart.length})
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* Render cart items with keyboardShouldPersistTaps */}
                {renderCartItems()}
              </View>

              {/* Position payment section absolutely */}
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

            {showPortionDropdown && selectedItem && (
              <PortionDropdown
                item={selectedItem}
                onSelect={handleAddToCartWithPortion}
                onClose={() => {
                  setShowPortionDropdown(false);
                  setSelectedItem(null);
                }}
              />
            )}
          </View>
          
          {/* Fix tab bar to bottom of screen */}
          <View style={styles.tabBarContainer}>
            <CustomTabBar />
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
    {renderPOSSettingsModal()}
    {/* Modals remain unchanged */}
    <DeviceSelectionModal />
    
    {/* Add the modal for customer details */}
    {renderCustomerDetailsModal()}
    <PaymentModal />
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
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  tableInfoText: {
    color: "black",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
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
  orderTypeContainer: {
    paddingRight: 8,
    marginRight: 10,
    minWidth: 90, // Increase this value as needed
    justifyContent: "center",
    alignItems: "flex-end",
    
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
  deviceName: {
    fontSize: 16,
    fontWeight: "500",
  },
  deviceId: {
    fontSize: 12,
    color: "#666",
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
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginRight: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginLeft: 5,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#333',
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
  borderRadius: 4,
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
  flex: 1,
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
  marginRight: 12,
},
radioButton: {
  width: 20,
  height: 20,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: '#ccc',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 6,
},
selectedRadioButton: {
  borderColor: '#3498db',
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

radioButtonInner: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: '#3498db',
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
paymentModalContent: {
  padding: 20,
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
paymentOptionsContainer: {
  marginBottom: 20,
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

}
});

export default OrderCreate;