import React, { useState, useEffect, useMemo, useLayoutEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Platform,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  PermissionsAndroid,
  Linking,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import axios from "axios";
import RemixIcon from "react-native-remix-icon";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import CustomTabBar from "../CustomTabBar";
import MainToolBar from "../MainToolbar";
import CustomHeader from "../../components/CustomHeader";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BleManager } from "react-native-ble-plx";
import base64 from "react-native-base64";
import Constants from "expo-constants";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { usePrinter } from "../../contexts/PrinterContext";
import axiosInstance from "../../utils/axiosConfig";
import PaymentModal from "../../components/PaymentModal";

// Printer-related constants
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

const PlacedOrderDetails = ({ route }) => {
  const navigation = useNavigation();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const { orderDetail } = route.params;
  const { order_number, outlet_id = orderDetail.outlet_id, order_id = orderDetail.order_id } = orderDetail;
  const [refreshing, setRefreshing] = useState(false);
  const [remainingTime, setRemainingTime] = useState(null);

  const [connectionStatus, setConnectionStatus] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [printerDevice, setPrinterDevice] = useState(null);
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Add state for popup
  const [showPopup, setShowPopup] = useState(false);

  // Add these new state variables after the existing state declarations
  const [timelineData, setTimelineData] = useState([]);
  const [isTimelineModalVisible, setIsTimelineModalVisible] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('CASH');

  // Add this memoized menu_details
  const menu_details = useMemo(() => {
    return orderDetails?.menu_details || [];
  }, [orderDetails]);

  // Add this for order_details
  const order_details = useMemo(() => {
    return orderDetails?.order_details || null;
  }, [orderDetails]);

  // Update useLayoutEffect to match the header style
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: "Order Details",
      headerTitleAlign: "center",
      headerStyle: {
        backgroundColor: '#fff',
      },
      headerTintColor: '#333',
      headerTitleStyle: {
        fontWeight: '500',
      },
      headerRight: () => {
        if (!orderDetails?.order_details) return null;

        return (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              navigation.navigate("DemoScreen", {
                tableData: {
                  table_id: orderDetails.order_details.table_id,
                  table_number: orderDetails.order_details.table_number,
                  section_id: orderDetails.order_details.section_id,
                  section_name: orderDetails.order_details.section,                  is_occupied: 1,
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
           
          </TouchableOpacity>
        );
      },
    });
  }, [orderDetails, navigation, menu_details]);

  // Update printReceipt function
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

        // Generate receipt data using the provided orderData
        const receiptData = await generateReceiptData(orderDetailsToUse);
        const CHUNK_SIZE = 100;
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
  // Handle device connection
  useEffect(() => {
    if (isModalVisible) {
      scanForPrinters();
    } else {
      bleManager?.stopDeviceScan();
      setIsScanning(false);
    }
  }, [isModalVisible]);

  // Device selection modal
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

  // Loading overlay
  const LoadingOverlay = () => {
    if (!isLoading) return null;
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );
  };

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

          // Check if customer details exist
          if (response.data.lists?.order_details) {
            const customerData = {
              name: response.data.lists.order_details.customer_name || response.data.lists.order_details.user_name,
              mobile: response.data.lists.order_details.customer_mobile || response.data.lists.order_details.user_mobile,
              address: response.data.lists.order_details.customer_address,
              landmark: response.data.lists.order_details.customer_landmark
            };
            console.log("Customer details from API:", customerData);
            
            // If we have user_name or user_mobile but no customer_name or customer_mobile, update the order details
            if (!response.data.lists.order_details.customer_name && response.data.lists.order_details.user_name) {
              response.data.lists.order_details.customer_name = response.data.lists.order_details.user_name;
            }
            if (!response.data.lists.order_details.customer_mobile && response.data.lists.order_details.user_mobile) {
              response.data.lists.order_details.customer_mobile = response.data.lists.order_details.user_mobile;
            }
          } else {
            console.log("No customer details found in the response");
          }

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
  }, [order_number]);

  // Add console log to check order details
  useEffect(() => {
    if (orderDetails) {
      console.log("Order Details:", {
        status: orderDetails.order_details?.order_status,
        time: orderDetails.order_details?.time,
        occupied_time: orderDetails.order_details?.occupied_time,
      });
    }
  }, [orderDetails]);

  // Update timer logic
  useEffect(() => {
    let timer;

    if (orderDetails?.order_details?.order_status?.toLowerCase() === "placed") {
      // Get the time from datetime field instead
      const orderTime =
        orderDetails.order_details.datetime?.split(" ")[1] +
        " " +
        orderDetails.order_details.datetime?.split(" ")[2];
      console.log("Using order time from datetime:", orderTime); // Debug log

      if (orderTime) {
        const initialTime = calculateRemainingTime(orderTime);
        console.log("Initial remaining time:", initialTime); // Debug log
        setRemainingTime(initialTime);

        timer = setInterval(() => {
          setRemainingTime((prev) => {
            const newTime = prev <= 0 ? 0 : prev - 1;
            return newTime;
          });
        }, 1000);
      }
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [orderDetails]);

  useEffect(() => {
    if (remainingTime === 0 && order_details.order_status?.toLowerCase() === "placed") {
      // Show popup message
      setShowPopup(true);
      
      // Hide popup and navigate after 2 seconds
      setTimeout(() => {
        setShowPopup(false);
        navigation.navigate("OrderList");
      }, 2000);
    }
  }, [remainingTime]);

  const calculateRemainingTime = (orderTime) => {
    console.log("Calculating time for:", orderTime); // Debug log
    if (!orderTime) return 0;

    try {
      const [time, period] = orderTime.split(" ");
      const [hours, minutes, seconds] = time.split(":");
      let hour = parseInt(hours);

      if (period === "PM" && hour !== 12) {
        hour += 12;
      } else if (period === "AM" && hour === 12) {
        hour = 0;
      }

      const orderDate = new Date();
      orderDate.setHours(hour, parseInt(minutes), parseInt(seconds));

      const currentTime = new Date();
      const elapsedSeconds = Math.floor((currentTime - orderDate) / 1000);
      const remaining = Math.max(0, 90 - elapsedSeconds);
      console.log("Remaining time calculated:", remaining); // Debug log
      return remaining;
    } catch (error) {
      console.error("Error calculating remaining time:", error);
      return 0;
    }
  };

  const handleCancelOrder = async () => {
    try {
      setLoading(true);
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_order_status",
        {
          outlet_id: restaurantId,
          order_id: order_details.order_id,
          user_id: userId,
          order_status: "cancelled",
          payment_method: order_details.payment_method || "",
          is_paid: order_details.is_paid || "0",
          customer_name: order_details.customer_name || "",
          customer_mobile: order_details.customer_mobile || "",
          customer_alternate_mobile: order_details.customer_alternate_mobile || "",
          customer_address: order_details.customer_address || "",
          customer_landmark: order_details.customer_landmark || "",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Order cancelled successfully", [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("OrderList");
            },
          },
        ]);
      } else {
        throw new Error(response.data.msg || "Failed to cancel order");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      Alert.alert("Error", "Failed to cancel order");
    } finally {
      setLoading(false);
    }
  };

  // Add this function to fetch timeline data
  const fetchOrderTimeline = async () => {
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
                    <Icon name="close" size={24} color="#666" />
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

  // Create a memoized timeline modal component
  const memoizedTimelineModal = useMemo(() => {
    if (!isTimelineModalVisible) return null;
    
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
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.timelineScrollView}>
                  {timelineData.map((item, index) => (
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
                  ))}
                  
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
  }, [isTimelineModalVisible, timelineData, timelineLoading, orderDetails?.order_details?.order_number]);

  // Add the handleSettlePayment function before the return statement
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
      
      // First update the local state - this will ensure the receipt shows the correct status
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
          order_id: order_details.order_id,
          user_id: userId,
          order_status: "paid",
          payment_method: isComplementary ? null : (paymentMethod || selectedPaymentMethod),
          is_paid: isComplementary ? "complementary" : "paid",
          is_complementary: isComplementary ? 1 : 0,
          customer_name: order_details.customer_name || "",
          customer_mobile: order_details.customer_mobile || "",
          customer_alternate_mobile: order_details.customer_alternate_mobile || "",
          customer_address: order_details.customer_address || "",
          customer_landmark: order_details.customer_landmark || "",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert(
          "Success", 
          `Order ${isComplementary ? 'marked as complementary' : 'settled'} successfully`, 
          [
            {
              text: "OK",
              onPress: () => {
                // Navigate to OrderList screen
                navigation.navigate("OrderList");
              }
            }
          ]
        );
      } else {
        Alert.alert("Error", response.data.msg || "Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      Alert.alert("Error", "Something went wrong while updating the order: " + error.message);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // Add the openPaymentModal function
  const openPaymentModal = () => {
    if (!printerConnected || !contextPrinterDevice) {
      Alert.alert(
        "Printer Not Connected",
        "Do you want to continue without printing?",
        [
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

  const renderHeader = () => {
    if (!order_details) return null;

    console.log(
      "Render Header - Status:",
      order_details.order_status,
      "Remaining Time:",
      remainingTime
    );

    return (
      <>
        <View style={[styles.headerCard, { backgroundColor: "#4b89dc" }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.orderStatus}>
                Status: {order_details.order_status}
              </Text>
              <Text style={styles.orderTime}>{order_details.datetime}</Text>

              {/* Timer Display */}
              {order_details.order_status?.toLowerCase() === "placed" && remainingTime > 0 && (
                <View style={styles.timerContainer}>
                  <RemixIcon name="time-line" size={14} color="#FFE5E5" />
                  <Text style={styles.timerText}>{remainingTime} seconds</Text>
                </View>
              )}
              
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
              
              {/* Add timeline button here */}
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
            <RemixIcon name="file-list-2-fill" size={16} color="#4b89dc" />
            <Text style={styles.menuCountLabel}>Menu Count:</Text>
            <Text style={styles.menuCountText}>{menu_details?.length || order_details?.menu_count || 0}</Text>
          </View>
        </View>

        {order_details.comment && (
          <View style={styles.commentContainer}>
            <View style={styles.commentHeader}>
              <RemixIcon name="chat-1-fill" size={18} color="#4b89dc" />
              <Text style={styles.commentLabel}>Order Comment:</Text>
            </View>
            <Text style={styles.commentText}>{order_details.comment}</Text>
          </View>
        )}

        {order_details.order_status.toLowerCase() !== "cancelled" && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              Alert.alert(
                "Cancel Order",
                "Are you sure you want to cancel this order?",
                [
                  {
                    text: "No",
                    style: "cancel",
                  },
                  {
                    text: "Yes",
                    onPress: handleCancelOrder,
                  },
                ]
              );
            }}
          >
            <RemixIcon name="close-circle-line" size={20} color="#fff" />
            <Text style={styles.cancelButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  const getOrderTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "parcel":
        return { icon: "ri-takeaway-fill", color: "#0C8B51" };
      case "drive-through":
        return { icon: "ri-car-fill", color: "#4B89DC" };
      case "dine-in":
        return { icon: "ri-restaurant-fill", color: "#FF9A6C" };
      default:
        return { icon: "ri-restaurant-2-fill", color: "#666666" };
    }
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
        <Text style={styles.menuTotal}>
          ₹{Number(item.menu_sub_total).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  // Add this helper function for text conversion
  const textToBytes = (text) => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(text));
  };

  // Add the generateReceiptData function
  const generateReceiptData = async (orderData = null) => {
    try {
      // Use provided orderData if available, otherwise use state orderDetails
      const orderDetailsToUse = orderData || orderDetails;
      
      // Function to get current date and time in the required format
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

      // Add generateQRCode function - exact same as OrderCreate
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

      // Function for dotted line - match OrderCreate
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

      // Generate QR code data with safe values
      const qrData = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
        orderDetailsToUse.order_details.outlet_name
      )}&am=${finalGrandTotal ? finalGrandTotal.toFixed(2) : grandTotal.toFixed(2)}`;

      // Log payment info for debugging
      console.log("Receipt generation - isPaid:", isPaid);
      console.log("Receipt generation - paymentMethod:", paymentMethod);
      console.log("Receipt generation - isComplementary:", isComplementary);

      return [
        // Header section - centered
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
        ] : []),
        
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
        ...textToBytes(`DateTime: ${getCurrentDateTime()}\n`), // Use current date and time
        
        // Add customer details if available
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

        // Amount section - correctly arranged with conditional items
        ...textToBytes(formatAmountLine("Total", subtotal)),

        // Discount if it exists
        ...(Math.abs(discount) > 0.001 ? 
          textToBytes(formatAmountLine(`Discount(${discountPercent}%)`, discount, "-"))
          : []),

        // Special discount if it exists
        ...(Math.abs(specialDiscount) > 0.001 ? 
          textToBytes(formatAmountLine("Special Discount", specialDiscount, "-"))
          : []),

        // Extra charges if they exist
        ...(Math.abs(extraCharges) > 0.001 ? 
          textToBytes(formatAmountLine("Extra Charges", extraCharges, "+"))
          : []),

        ...textToBytes(formatAmountLine("Subtotal", totalWithDiscount)),

        // Service charges if they exist
        ...(Math.abs(serviceCharges) > 0.001 ? 
          textToBytes(formatAmountLine(`Service Ch.(${serviceChargesPercent}%)`, serviceCharges, "+"))
          : []),

        // GST if they exist
        ...(Math.abs(gstAmount) > 0.001 ? 
          textToBytes(formatAmountLine(`GST(${gstPercent}%)`, gstAmount, "+"))
          : []),

        // Tip if it exists
        ...(Math.abs(tip) > 0.001 ? 
          textToBytes(formatAmountLine("Tip", tip, "+"))
          : []),
        ...textToBytes(getDottedLine()),
        // Use final_grand_total if available, otherwise use grand_total
        ...textToBytes(formatAmountLine("Total", finalGrandTotal || grandTotal)),
        ...textToBytes("\n"),
        ...textToBytes(`Scan to Pay ${finalGrandTotal ? finalGrandTotal.toFixed(2) : grandTotal.toFixed(2)}\n`),
        // Footer section with correct QR code implementation
        ...textToBytes("\x1B\x61\x01"), // Center align
        ...generateQRCode(qrData),
        ...textToBytes('\n\n'),
        ...textToBytes("PhonePe  GPay  Paytm  UPI\n\n"),
        ...textToBytes("------------------------\n"),
        ...textToBytes("-----Thank You Visit Again!-----\n"),
        ...textToBytes("https://menumitra.com/\n\n\n"),
        ...textToBytes("\x1D\x56\x42\x40"), // Cut paper
      ];
    } catch (error) {
      console.error("Error generating receipt data:", error);
      throw error;
    }
  };

  // Add the generateReceiptHTML function for Expo Go
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
              ${                orderDetails.order_details.is_paid === "paid" || orderDetails.order_details.is_paid === 1 || orderDetails.order_details.is_paid === true ?                 `<p><strong style="color: green;">PAID</strong></p>` :                 orderDetails.order_details.is_paid === "complementary" ?                 `<p><strong style="color: blue;">COMPLEMENTARY</strong></p>` :                 `<p>Status: PLACED</p>`              }
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
              ${                orderDetails.order_details.is_paid === "paid" || orderDetails.order_details.is_paid === 1 || orderDetails.order_details.is_paid === true ?                 `<p><strong style="color: green;">*** PAID ORDER ***</strong></p>` :                 orderDetails.order_details.is_paid === "complementary" ?                 `<p><strong style="color: blue;">*** COMPLEMENTARY ORDER ***</strong></p>` :                 `<p><strong>*** NEW ORDER ***</strong></p>`              }
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

  // Add new function for KOT generation
  const generateKOTData = () => {
    try {


      
      const getDottedLine = () => "-------------------------------\n";

      // Function to get current date and time in the required format
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
        ...textToBytes(`DateTime: ${getCurrentDateTime()}\n`), // Use current date and time
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

  // Add new function to print KOT
  const printKOT = async () => {
    if (!printerConnected || !contextPrinterDevice) {
      Alert.alert(
        "Printer Not Connected",
        "Please connect a printer first"
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

  const ListFooterComponent = () => (
    <View>
      <View style={styles.card}>
        {/* Total */}
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Total</Text>
          <Text style={styles.cardAmount}>
            ₹{parseFloat(orderDetails?.order_details?.total_bill_amount || 0).toFixed(2)}
          </Text>
        </View>

        {/* Discount */}
        {parseFloat(orderDetails?.order_details?.discount_amount || 0) > 0 && (
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>
              Discount {parseFloat(orderDetails?.order_details?.discount_percent || 0) > 0 ? 
                `(${orderDetails?.order_details?.discount_percent}%)` : ''}
            </Text>
            <Text style={[styles.cardAmount, styles.negativeAmount]}>
              -₹{parseFloat(orderDetails?.order_details?.discount_amount || 0).toFixed(2)}
            </Text>
          </View>
        )}

        {/* Special Discount */}
        {parseFloat(orderDetails?.order_details?.special_discount || 0) > 0 && (
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Special Discount</Text>
            <Text style={[styles.cardAmount, styles.negativeAmount]}>
              -₹{parseFloat(orderDetails?.order_details?.special_discount || 0).toFixed(2)}
            </Text>
          </View>
        )}

        {/* Extra Charges */}
        {parseFloat(orderDetails?.order_details?.charges || 0) > 0 && (
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Extra Charges</Text>
            <Text style={[styles.cardAmount, styles.positiveAmount]}>
              +₹{parseFloat(orderDetails?.order_details?.charges || 0).toFixed(2)}
            </Text>
          </View>
        )}

        {/* Subtotal line - only if there are discounts or extra charges */}
        {(parseFloat(orderDetails?.order_details?.discount_amount || 0) > 0 || 
          parseFloat(orderDetails?.order_details?.special_discount || 0) > 0 ||
          parseFloat(orderDetails?.order_details?.extra_charges || 0) > 0) && (
          <View style={styles.cardRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalAmount}>
              ₹{parseFloat(orderDetails?.order_details?.total_bill_with_discount || 0).toFixed(2)}
            </Text>
          </View>
        )}

        {/* Service Charges */}
        {parseFloat(orderDetails?.order_details?.service_charges_amount || 0) > 0 && (
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>
              Service Charges {parseFloat(orderDetails?.order_details?.service_charges_percent || 0) > 0 ? 
                `(${orderDetails?.order_details?.service_charges_percent}%)` : ''}
            </Text>
            <Text style={[styles.cardAmount, styles.positiveAmount]}>
              +₹{parseFloat(orderDetails?.order_details?.service_charges_amount || 0).toFixed(2)}
            </Text>
          </View>
        )}

        {/* GST */}
        {parseFloat(orderDetails?.order_details?.gst_amount || 0) > 0 && (
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>
              GST {parseFloat(orderDetails?.order_details?.gst_percent || 0) > 0 ? 
                `(${orderDetails?.order_details?.gst_percent}%)` : ''}
            </Text>
            <Text style={[styles.cardAmount, styles.positiveAmount]}>
              +₹{parseFloat(orderDetails?.order_details?.gst_amount || 0).toFixed(2)}
            </Text>
          </View>
        )}

        {/* Tip */}
        {parseFloat(orderDetails?.order_details?.tip || 0) > 0 && (
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Tip</Text>
            <Text style={[styles.cardAmount, styles.positiveAmount]}>
              +₹{parseFloat(orderDetails?.order_details?.tip || 0).toFixed(2)}
            </Text>
          </View>
        )}

        {/* Grand Total */}
        <View style={[styles.cardRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>Final Grand Total</Text>
          <Text style={styles.grandTotalAmount}>
            ₹{parseFloat(orderDetails?.order_details?.final_grand_total || 0).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Customer Details Card */}
      {renderCustomerDetails()}

      <View>
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
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <MainToolBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4b89dc" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
        <CustomTabBar />
      </SafeAreaView>
    );
  }

  if (!orderDetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <MainToolBar />
        <View style={styles.container}>
          <Text style={styles.errorText}>Failed to load order details.</Text>
        </View>
        <CustomTabBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* <MainToolBar /> */}
      <View style={styles.container}>
        <FlatList
          data={menu_details}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderMenuItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={ListFooterComponent}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4b89dc"]}
              tintColor="#4b89dc"
            />
          }
        />
      </View>
      <DeviceSelectionModal />
      <LoadingOverlay />
      {memoizedTimelineModal}
      <PaymentModal 
        visible={isPaymentModalVisible}
        onClose={() => setIsPaymentModalVisible(false)}
        onConfirm={handleSettlePayment}
        orderData={orderDetails?.order_details}
      />
      <CustomTabBar />
      {showPopup && (
        <View style={styles.popupContainer}>
          <Text style={styles.popupText}>Order is ready to cook</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#4b89dc",
    fontWeight: "bold",
  },
  errorText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    marginTop: 20,
  },
  listContent: {
    paddingBottom: 80,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  firstRow: {
    borderRadius: 12,
    marginBottom: 16,
  },
  column: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center", // Better vertical alignment
  },
  orderStatus: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#fff",
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginBottom: 4,
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
    opacity: 0.9,
    textAlign: "right",
  },
  orderTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderTypeText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#fff',
  },
  tableInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  tableText: {
    marginLeft: 8,
    fontSize: 14,
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
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  cancelButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.6,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: "flex-start", // Ensures container fits content
  },
  timerText: {
    color: "#FFE5E5",
    fontSize: 14, // Increased font size
    fontWeight: "600",
    marginLeft: 6,
    letterSpacing: 0.5, // Better readability
  },
  commentContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffeeba",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  commentLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#856404",
  },
  commentText: {
    fontSize: 14,
    color: "#666",
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
    width: '100%',
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
    fontWeight: "500",
    color: '#333',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
    color: '#666',
    textAlign: "center",
    padding: 20,
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
  halfFullText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  popupContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 1000,
  },
  popupText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  customerDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  customerGridItem: {
    width: '50%',
    marginBottom: 16,
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
  timelineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
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
    color: '#4b89dc',
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
  closeButton: {
    backgroundColor: "#219ebc",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
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
    backgroundColor: 'rgba(75, 137, 220, 0.1)',
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
    color: '#4b89dc',
    fontSize: 14,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  successText: {
    color: '#4CAF50',
  },
  errorText: {
    color: '#f44336',
  },
});

export default PlacedOrderDetails;
